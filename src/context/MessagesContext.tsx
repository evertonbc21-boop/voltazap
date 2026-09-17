import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { campaignReplies as seedReplies, recentMessages as seedMessages } from '../data/mock'
import type {
  CampaignReply,
  MessageStatus,
  ReplyOutcome,
  ReplySource,
  SentMessage,
} from '../types'

const STORAGE_KEY = 'voltazap-replies'

interface StoredState {
  replies: CampaignReply[]
  messages: SentMessage[]
}

interface RegisterReplyInput {
  clientId: string
  clientName: string
  reply: string
  outcome: ReplyOutcome
  orderValue?: number
  messagePreview?: string
  source?: ReplySource
  intent?: string
  fromPhone?: string
  waMessageId?: string
  conversationStatus?: string
}

interface IngestInboundInput extends RegisterReplyInput {
  receivedAtIso?: string
}

interface MessagesContextValue {
  replies: CampaignReply[]
  messages: SentMessage[]
  registerReply: (input: RegisterReplyInput) => CampaignReply
  ingestInboundReply: (input: IngestInboundInput) => CampaignReply | null
  applyDeliveryStatus: (waMessageId: string, status: MessageStatus, phone?: string) => void
  stats: {
    totalReplies: number
    orders: number
    revenue: number
    responseRateLabel: string
    orderRateLabel: string
  }
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { replies: seedReplies, messages: seedMessages }
    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      replies: Array.isArray(parsed.replies) && parsed.replies.length > 0 ? parsed.replies : seedReplies,
      messages: Array.isArray(parsed.messages) && parsed.messages.length > 0 ? parsed.messages : seedMessages,
    }
  } catch {
    return { replies: seedReplies, messages: seedMessages }
  }
}

function formatNowLabel(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${min}`
}

function formatTodayTime(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const isToday = new Date().toDateString() === date.toDateString()
  return isToday ? `Hoje, ${hh}:${min}` : formatNowLabel(date)
}

function buildReplyEntry(input: IngestInboundInput, date: Date): CampaignReply {
  const replyText = input.reply.trim() || 'Sem resposta'
  return {
    id: `r-${crypto.randomUUID()}`,
    clientId: input.clientId,
    reply: replyText,
    outcome: input.outcome,
    orderValue: input.outcome === 'pedido_realizado' ? input.orderValue : undefined,
    datetime: formatNowLabel(date),
    source: input.source || 'manual',
    intent: input.intent,
    fromPhone: input.fromPhone,
    waMessageId: input.waMessageId,
    conversationStatus: input.conversationStatus,
  }
}

function buildMessageEntry(input: IngestInboundInput, date: Date): SentMessage {
  const replyText = input.reply.trim()
  const preview =
    input.messagePreview?.trim() ||
    (input.source && input.source !== 'manual'
      ? `Resposta WhatsApp · ${input.clientName}`
      : `Mensagem enviada para ${input.clientName}`)

  return {
    id: `m-${crypto.randomUUID()}`,
    clientId: input.clientId,
    preview: preview.length > 48 ? `${preview.slice(0, 45)}...` : preview,
    status: input.outcome === 'sem_resposta' ? 'entregue' : 'respondeu',
    dateLabel: formatTodayTime(date),
    reply: input.outcome === 'sem_resposta' ? undefined : replyText || undefined,
  }
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<MessagesContextValue>(() => {
    const registerReply = (input: RegisterReplyInput) => {
      const date = new Date()
      const entry = buildReplyEntry({ ...input, source: input.source || 'manual' }, date)
      const message = buildMessageEntry({ ...input, source: input.source || 'manual' }, date)

      setState((current) => ({
        replies: [entry, ...current.replies],
        messages: [message, ...current.messages],
      }))

      return entry
    }

    const ingestInboundReply = (input: IngestInboundInput) => {
      const date = input.receivedAtIso ? new Date(input.receivedAtIso) : new Date()
      const entry = buildReplyEntry(input, date)
      const message = buildMessageEntry(input, date)
      let accepted: CampaignReply | null = entry

      setState((current) => {
        if (input.waMessageId && current.replies.some((r) => r.waMessageId === input.waMessageId)) {
          accepted = null
          return current
        }

        const messages = [...current.messages]
        const openIdx = messages.findIndex(
          (m) => m.clientId === input.clientId && !m.reply && m.status !== 'respondeu',
        )
        if (openIdx >= 0) {
          messages[openIdx] = {
            ...messages[openIdx],
            status: 'respondeu',
            reply: entry.reply,
            dateLabel: formatTodayTime(date),
          }
          return {
            replies: [entry, ...current.replies],
            messages,
          }
        }

        return {
          replies: [entry, ...current.replies],
          messages: [message, ...messages],
        }
      })

      return accepted
    }

    const applyDeliveryStatus = (_waMessageId: string, _status: MessageStatus, _phone?: string) => {
      // Estrutura pronta: quando o envio passar a gravar wamid (Cloud API outbound),
      // atualizaremos messages pelo id. Envio atual via wa.me não retorna wamid.
    }

    const orders = state.replies.filter((r) => r.outcome === 'pedido_realizado').length
    const revenue = state.replies.reduce((sum, r) => sum + (r.orderValue ?? 0), 0)
    const answered = state.replies.filter((r) => r.outcome !== 'sem_resposta').length
    const base = Math.max(state.replies.length, 1)

    return {
      replies: state.replies,
      messages: state.messages,
      registerReply,
      ingestInboundReply,
      applyDeliveryStatus,
      stats: {
        totalReplies: state.replies.length,
        orders,
        revenue,
        responseRateLabel: `${Math.round((answered / base) * 100)}%`,
        orderRateLabel: `${Math.round((orders / base) * 100)}%`,
      },
    }
  }, [state])

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

export function useMessages() {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider')
  return ctx
}

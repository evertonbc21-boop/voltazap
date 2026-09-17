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
  messageType?: string
}

interface IngestInboundInput extends RegisterReplyInput {
  receivedAtIso?: string
  contactName?: string
}

export type IngestResult =
  | { ok: true; entry: CampaignReply; duplicate: false }
  | { ok: true; entry: CampaignReply; duplicate: true }
  | { ok: false; reason: string }

interface MessagesContextValue {
  replies: CampaignReply[]
  messages: SentMessage[]
  registerReply: (input: RegisterReplyInput) => CampaignReply
  ingestInboundReply: (input: IngestInboundInput) => IngestResult
  hasWaMessage: (waMessageId: string | undefined | null) => boolean
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

/** Lê o que está no disco sem fallback para seed — usado no ingest/idempotência. */
function readPersistedState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredState>
    if (!parsed || !Array.isArray(parsed.replies) || !Array.isArray(parsed.messages)) return null
    return { replies: parsed.replies, messages: parsed.messages }
  } catch {
    return null
  }
}

/** Persistência síncrona — evita perder mensagem se o ACK no servidor rodar antes do useEffect. */
function persistState(next: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (error) {
    console.error('voltazap-replies persist failed', error)
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
    id: input.waMessageId || `r-${crypto.randomUUID()}`,
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
    customerName: input.contactName || input.clientName,
    customerPhone: input.fromPhone,
    phone: input.fromPhone,
    text: replyText,
    type: input.messageType || 'text',
    direction: input.source && input.source !== 'manual' ? 'inbound' : undefined,
    status: input.outcome === 'sem_resposta' ? 'received' : 'respondeu',
  }
}

function buildMessageEntry(input: IngestInboundInput, date: Date): SentMessage {
  const replyText = input.reply.trim()
  const preview =
    input.messagePreview?.trim() ||
    (input.source && input.source !== 'manual'
      ? `WhatsApp · ${input.clientName}: ${replyText}`
      : `Mensagem enviada para ${input.clientName}`)

  return {
    id: input.waMessageId ? `m-${input.waMessageId}` : `m-${crypto.randomUUID()}`,
    clientId: input.clientId,
    preview: preview.length > 64 ? `${preview.slice(0, 61)}...` : preview,
    status: input.outcome === 'sem_resposta' ? 'received' : 'respondeu',
    dateLabel: formatTodayTime(date),
    reply: input.outcome === 'sem_resposta' ? undefined : replyText || undefined,
    waMessageId: input.waMessageId,
    fromPhone: input.fromPhone,
    source: input.source,
    direction: input.source && input.source !== 'manual' ? 'inbound' : undefined,
  }
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadState)

  useEffect(() => {
    persistState(state)
  }, [state])

  const value = useMemo<MessagesContextValue>(() => {
    const hasWaMessage = (waMessageId: string | undefined | null) => {
      if (!waMessageId) return false
      const inState =
        state.replies.some((r) => r.waMessageId === waMessageId || r.id === waMessageId) ||
        state.messages.some((m) => m.waMessageId === waMessageId || m.id === `m-${waMessageId}`)
      if (inState) return true
      const latest = readPersistedState()
      if (!latest) return false
      return (
        latest.replies.some((r) => r.waMessageId === waMessageId || r.id === waMessageId) ||
        latest.messages.some((m) => m.waMessageId === waMessageId || m.id === `m-${waMessageId}`)
      )
    }

    const registerReply = (input: RegisterReplyInput) => {
      const date = new Date()
      const entry = buildReplyEntry({ ...input, source: input.source || 'manual' }, date)
      const message = buildMessageEntry({ ...input, source: input.source || 'manual' }, date)
      const next = {
        replies: [entry, ...state.replies],
        messages: [message, ...state.messages],
      }
      persistState(next)
      setState(next)
      return entry
    }

    const ingestInboundReply = (input: IngestInboundInput): IngestResult => {
      // Prefere disco (síncrono) e cai no estado React — evita race com seed fallback
      const latest = readPersistedState() || state
      const already =
        Boolean(input.waMessageId) &&
        (latest.replies.some((r) => r.waMessageId === input.waMessageId || r.id === input.waMessageId) ||
          latest.messages.some(
            (m) => m.waMessageId === input.waMessageId || m.id === `m-${input.waMessageId}`,
          ))

      if (already) {
        const existing = latest.replies.find(
          (r) => r.waMessageId === input.waMessageId || r.id === input.waMessageId,
        )
        return {
          ok: true,
          duplicate: true,
          entry: existing || buildReplyEntry(input, new Date()),
        }
      }

      const date = input.receivedAtIso ? new Date(input.receivedAtIso) : new Date()
      if (Number.isNaN(date.getTime())) {
        return { ok: false, reason: 'invalid_timestamp' }
      }

      const entry = buildReplyEntry(input, date)
      const message = buildMessageEntry(input, date)

      const messages = [...latest.messages]
      const openIdx = messages.findIndex(
        (m) => m.clientId === input.clientId && !m.reply && m.status !== 'respondeu',
      )
      if (openIdx >= 0) {
        messages[openIdx] = {
          ...messages[openIdx],
          status: 'respondeu',
          reply: entry.reply,
          dateLabel: formatTodayTime(date),
          waMessageId: input.waMessageId,
          fromPhone: input.fromPhone,
          source: input.source,
          direction: 'inbound',
        }
      } else {
        messages.unshift(message)
      }

      const next = {
        replies: [entry, ...latest.replies],
        messages,
      }
      // Grava no localStorage ANTES do ACK no servidor
      persistState(next)
      setState(next)

      console.log('whatsapp inbound local message stored', {
        stored: true,
        wamid: entry.waMessageId,
        phone: entry.fromPhone,
        text: entry.reply,
        clientId: entry.clientId,
      })

      return { ok: true, duplicate: false, entry }
    }

    const applyDeliveryStatus = (_waMessageId: string, _status: MessageStatus, _phone?: string) => {
      // Pronto para quando o envio Cloud API gravar wamid outbound.
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
      hasWaMessage,
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

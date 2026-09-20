import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

interface OutboundInput {
  clientId: string
  clientName: string
  text: string
  fromPhone?: string
  waMessageId?: string | null
  source?: ReplySource
}

interface MessagesContextValue {
  replies: CampaignReply[]
  messages: SentMessage[]
  registerReply: (input: RegisterReplyInput) => CampaignReply
  ingestInboundReply: (input: IngestInboundInput) => IngestResult
  recordOutboundMessage: (input: OutboundInput) => SentMessage
  hasWaMessage: (waMessageId: string | undefined | null) => boolean
  applyDeliveryStatus: (waMessageId: string, status: MessageStatus, phone?: string) => void
  getConversation: (clientId: string) => Array<{
    id: string
    from: 'business' | 'client'
    text: string
    time: string
    status?: MessageStatus
  }>
  stats: {
    totalReplies: number
    outboundSent: number
    orders: number
    revenue: number
    responseRateLabel: string
    orderRateLabel: string
  }
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

function normalizeReplyOutcome(outcome: string | undefined): ReplyOutcome {
  if (outcome === 'interessado' || outcome === 'nao_interessado' || outcome === 'nao_respondeu') {
    return outcome
  }
  if (outcome === 'pedido_realizado' || outcome === 'em_negociacao') return 'interessado'
  if (outcome === 'sem_resposta') return 'nao_respondeu'
  return 'interessado'
}

function normalizeReplies(replies: CampaignReply[]): CampaignReply[] {
  return replies.map((reply) => ({
    ...reply,
    outcome: normalizeReplyOutcome(reply.outcome),
  }))
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { replies: [], messages: [] }
    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      replies: Array.isArray(parsed.replies) ? normalizeReplies(parsed.replies) : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    }
  } catch {
    return { replies: [], messages: [] }
  }
}

/** Lê o que está no disco sem fallback para seed — usado no ingest/idempotência. */
function readPersistedState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredState>
    if (!parsed || !Array.isArray(parsed.replies) || !Array.isArray(parsed.messages)) return null
    return { replies: normalizeReplies(parsed.replies), messages: parsed.messages }
  } catch {
    return null
  }
}

/** Persistência síncrona — evita perder mensagem se o ACK no servidor rodar antes do useEffect. */
function persistState(next: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('voltazap-replies-updated'))
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
  const replyText = input.reply.trim() || 'Não respondeu'
  const outcome = normalizeReplyOutcome(input.outcome)
  return {
    id: input.waMessageId || `r-${crypto.randomUUID()}`,
    clientId: input.clientId,
    reply: replyText,
    outcome,
    orderValue:
      outcome === 'interessado' && typeof input.orderValue === 'number' && input.orderValue > 0
        ? input.orderValue
        : undefined,
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
    status: outcome === 'nao_respondeu' ? 'received' : 'respondeu',
  }
}

function buildMessageEntry(input: IngestInboundInput, date: Date): SentMessage {
  const replyText = input.reply.trim()
  const outcome = normalizeReplyOutcome(input.outcome)
  const preview =
    input.messagePreview?.trim() ||
    (input.source && input.source !== 'manual'
      ? `WhatsApp · ${input.clientName}: ${replyText}`
      : `Mensagem enviada para ${input.clientName}`)

  return {
    id: input.waMessageId ? `m-${input.waMessageId}` : `m-${crypto.randomUUID()}`,
    clientId: input.clientId,
    preview: preview.length > 64 ? `${preview.slice(0, 61)}...` : preview,
    status: outcome === 'nao_respondeu' ? 'received' : 'respondeu',
    dateLabel: formatTodayTime(date),
    reply: outcome === 'nao_respondeu' ? undefined : replyText || undefined,
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

  // Mantém Mensagens + Resultados sincronizados se o storage mudar (outra aba / ingest).
  useEffect(() => {
    const reload = () => {
      const latest = readPersistedState()
      if (!latest) return
      setState((prev) => {
        const same =
          prev.replies.length === latest.replies.length &&
          prev.messages.length === latest.messages.length &&
          prev.replies[0]?.id === latest.replies[0]?.id &&
          prev.messages[0]?.id === latest.messages[0]?.id
        return same ? prev : latest
      })
    }
    window.addEventListener('storage', reload)
    window.addEventListener('voltazap-replies-updated', reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener('voltazap-replies-updated', reload)
    }
  }, [])

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
        // Mantém a mensagem original como envio do estabelecimento; a resposta fica em `reply`.
        messages[openIdx] = {
          ...messages[openIdx],
          status: 'respondeu',
          reply: entry.reply,
          dateLabel: formatTodayTime(date),
          waMessageId: messages[openIdx].waMessageId || input.waMessageId,
          fromPhone: input.fromPhone,
          source: messages[openIdx].source || input.source,
          direction: 'outbound',
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

    const recordOutboundMessage = (input: OutboundInput): SentMessage => {
      const latest = readPersistedState() || state
      const date = new Date()
      const preview =
        input.text.length > 64 ? `${input.text.slice(0, 61)}...` : input.text || `WhatsApp · ${input.clientName}`
      const message: SentMessage = {
        id: input.waMessageId ? `m-${input.waMessageId}` : `m-out-${crypto.randomUUID()}`,
        clientId: input.clientId,
        preview,
        status: 'enviada',
        dateLabel: formatTodayTime(date),
        waMessageId: input.waMessageId || undefined,
        fromPhone: input.fromPhone,
        source: input.source || 'whatsapp_cloud',
        direction: 'outbound',
      }
      const next = {
        replies: latest.replies,
        messages: [message, ...latest.messages],
      }
      persistState(next)
      setState(next)
      return message
    }

    const applyDeliveryStatus = (waMessageId: string, status: MessageStatus, _phone?: string) => {
      if (!waMessageId) return
      const latest = readPersistedState() || state
      const idx = latest.messages.findIndex(
        (m) => m.waMessageId === waMessageId || m.id === `m-${waMessageId}`,
      )
      if (idx < 0) return
      const messages = [...latest.messages]
      messages[idx] = { ...messages[idx], status }
      const next = { replies: latest.replies, messages }
      persistState(next)
      setState(next)
    }

    const getConversation = (clientId: string) => {
      type Row = {
        id: string
        from: 'business' | 'client'
        text: string
        time: string
        status?: MessageStatus
      }
      const rows: Row[] = []

      for (const msg of state.messages) {
        if (msg.clientId !== clientId) continue

        // Mensagem só do cliente (inbound puro, sem campanha vinculada)
        if (msg.direction === 'inbound') {
          const text = (msg.reply || msg.preview || '').replace(/^WhatsApp · [^:]+:\s*/i, '').trim()
          if (text) {
            rows.push({
              id: msg.id,
              from: 'client',
              text,
              time: msg.dateLabel,
              status: msg.status,
            })
          }
          continue
        }

        // Campanha / envio do estabelecimento (outbound ou legado sem direction)
        if (msg.preview?.trim()) {
          rows.push({
            id: msg.id,
            from: 'business',
            text: msg.preview,
            time: msg.dateLabel,
            status: msg.status,
          })
        }
        // Resposta do cliente à pergunta do estabelecimento
        if (msg.reply?.trim()) {
          rows.push({
            id: `reply-${msg.id}`,
            from: 'client',
            text: msg.reply,
            time: msg.dateLabel,
            status: 'respondeu',
          })
        }
      }

      for (const reply of state.replies) {
        if (reply.clientId !== clientId) continue
        const text = (reply.reply || reply.text || '').trim()
        if (!text) continue
        rows.push({
          id: reply.id,
          from: 'client',
          text,
          time: reply.datetime,
        })
      }

      const seen = new Set<string>()
      return rows.filter((row) => {
        const key = `${row.from}:${row.text}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    const orders = state.replies.filter((r) => (r.orderValue ?? 0) > 0).length
    const revenue = state.replies.reduce((sum, r) => sum + (r.orderValue ?? 0), 0)
    const answered = state.replies.filter((r) => r.outcome !== 'nao_respondeu').length
    const outboundSent = state.messages.filter((m) => m.direction !== 'inbound').length
    const sendBase = Math.max(outboundSent, 1)

    return {
      replies: state.replies,
      messages: state.messages,
      registerReply,
      ingestInboundReply,
      recordOutboundMessage,
      hasWaMessage,
      applyDeliveryStatus,
      getConversation,
      stats: {
        totalReplies: answered,
        outboundSent,
        orders,
        revenue,
        responseRateLabel: `${Math.round((answered / sendBase) * 100)}%`,
        orderRateLabel: `${Math.round((orders / sendBase) * 100)}%`,
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

import { useEffect, useRef } from 'react'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { findClientByPhone } from '../lib/phoneMatch'
import {
  ackInboundMessages,
  fetchInboundMessages,
  waitInboundMessages,
} from '../services/whatsappInbound'
import type { InboundWhatsAppEvent, MessageStatus, ReplyOutcome, ReplySource } from '../types'

/** Timeout do long-poll no servidor (reconecta na hora). */
const WAIT_MS = 8_000
const LOCK_KEY = 'voltazap-inbound-poll-leader'
const TAB_ID = `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
  failed: 'nao_entregue',
}

type SyncHandlers = {
  getClients: () => ReturnType<typeof useClients>['clients']
  ensureClient: ReturnType<typeof useClients>['ensureClientFromWhatsApp']
  ingest: ReturnType<typeof useMessages>['ingestInboundReply']
  applyStatus: ReturnType<typeof useMessages>['applyDeliveryStatus']
  hasWa: ReturnType<typeof useMessages>['hasWaMessage']
}

let started = false
let handlers: SyncHandlers | null = null
let subscriberCount = 0
let loopAbort: AbortController | null = null

function mapSource(source: ReplySource | string | undefined): ReplySource {
  if (source === 'mock') return 'mock'
  if (source === 'manual') return 'manual'
  return 'meta_whatsapp'
}

function claimLeadership(): boolean {
  try {
    const now = Date.now()
    const raw = localStorage.getItem(LOCK_KEY)
    const lock = raw ? (JSON.parse(raw) as { id: string; until: number }) : null
    if (lock && lock.until > now && lock.id !== TAB_ID) return false
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: TAB_ID, until: now + WAIT_MS + 5_000 }))
    return true
  } catch {
    return true
  }
}

async function processEvents(eventsRaw: InboundWhatsAppEvent[]) {
  if (!handlers) return

  const byId = new Map<string, InboundWhatsAppEvent>()
  for (const event of eventsRaw) {
    if (event.kind !== 'message') {
      if (event.kind === 'status' && !event.processed) byId.set(event.id, event)
      continue
    }
    const key = event.waMessageId || event.id
    if (!byId.has(key)) byId.set(key, event)
  }

  const events = [...byId.values()]
  if (!events.length) return

  const acked: string[] = []
  const h = handlers

  for (const event of events) {
    if (event.kind === 'status') {
      if (event.waMessageId && event.status) {
        const mapped = STATUS_MAP[event.status]
        if (mapped) h.applyStatus(event.waMessageId, mapped, event.fromPhone)
      }
      if (!event.processed) acked.push(event.id)
      continue
    }

    const phone = event.fromPhone || ''
    const wamid = event.waMessageId || event.id

    if (wamid && h.hasWa(wamid)) {
      if (!event.processed) acked.push(event.id)
      continue
    }

    let client = findClientByPhone(h.getClients(), phone)
    if (!client) {
      if (!phone) {
        console.error('whatsapp inbound skip: missing phone', { wamid: wamid || null })
        continue
      }
      client = h.ensureClient({ phone, name: event.contactName }).client
    }

    const outcome = (event.analysis?.outcome || 'interessado') as ReplyOutcome
    const orderValue =
      outcome === 'pedido_realizado'
        ? event.analysis?.orderValue ?? event.analysis?.valorPedido ?? undefined
        : undefined

    const result = h.ingest({
      clientId: client.id,
      clientName: client.nome || event.contactName || 'Cliente',
      contactName: event.contactName || client.nome,
      reply: event.text || '',
      outcome,
      orderValue: typeof orderValue === 'number' ? orderValue : undefined,
      source: mapSource(event.source),
      intent: event.analysis?.intentLabel || event.analysis?.intent || 'Interessado',
      fromPhone: event.fromPhone,
      waMessageId: wamid,
      conversationStatus:
        event.analysis?.conversationStatus || event.analysis?.statusConversa || 'replied',
      receivedAtIso: event.receivedAt,
      messagePreview: `WhatsApp · ${client.nome}`,
      messageType: event.type || 'text',
    })

    if (result.ok) acked.push(event.id)
    else console.error('whatsapp webhook local ingest failed', result)
  }

  if (acked.length) await ackInboundMessages(acked)
}

async function hydrateOnce(signal: AbortSignal) {
  if (!claimLeadership()) return
  console.log('inbound hydrate', { at: new Date().toISOString() })
  const events = await fetchInboundMessages(false)
  if (signal.aborted) return
  await processEvents(events)
}

async function runRealtimeLoop(signal: AbortSignal) {
  // 1) captura o que já estava pendente / para recuperar
  try {
    await hydrateOnce(signal)
  } catch (error) {
    if (!signal.aborted) console.error('whatsapp inbound hydrate error', error)
  }

  // 2) long-poll contínuo → chega mensagem no webhook ≈ aparece na hora
  while (!signal.aborted) {
    if (document.visibilityState === 'hidden') {
      await new Promise<void>((resolve) => {
        const onVis = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', onVis)
            resolve()
          }
        }
        document.addEventListener('visibilitychange', onVis)
        signal.addEventListener('abort', () => {
          document.removeEventListener('visibilitychange', onVis)
          resolve()
        }, { once: true })
      })
      if (signal.aborted) break
      try {
        await hydrateOnce(signal)
      } catch {
        /* ignore */
      }
      continue
    }

    if (!claimLeadership()) {
      await new Promise((r) => setTimeout(r, 2_000))
      continue
    }

    try {
      console.log('inbound wait tick', { at: new Date().toISOString(), timeoutMs: WAIT_MS })
      const pending = await waitInboundMessages(WAIT_MS, signal)
      if (signal.aborted) break
      if (pending.length) {
        console.log('inbound wait got messages', { count: pending.length })
        await processEvents(pending)
      }
    } catch (error) {
      if (signal.aborted) break
      console.error('whatsapp inbound wait error', error)
      await new Promise((r) => setTimeout(r, 1_500))
    }
  }
}

function startRealtime() {
  if (started) return
  started = true
  loopAbort = new AbortController()
  void runRealtimeLoop(loopAbort.signal)
}

function stopRealtimeIfIdle() {
  if (subscriberCount > 0) return
  loopAbort?.abort()
  loopAbort = null
  started = false
  handlers = null
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    const lock = raw ? (JSON.parse(raw) as { id: string }) : null
    if (lock?.id === TAB_ID) localStorage.removeItem(LOCK_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Ponte em tempo quase real: long-poll /api/inbound-messages/wait
 * → localStorage → Resultados/Mensagens.
 */
export function useWhatsAppInboundSync(enabled = true) {
  const { clients, ensureClientFromWhatsApp } = useClients()
  const { ingestInboundReply, applyDeliveryStatus, hasWaMessage } = useMessages()

  const clientsRef = useRef(clients)
  const ensureRef = useRef(ensureClientFromWhatsApp)
  const ingestRef = useRef(ingestInboundReply)
  const statusRef = useRef(applyDeliveryStatus)
  const hasWaRef = useRef(hasWaMessage)

  clientsRef.current = clients
  ensureRef.current = ensureClientFromWhatsApp
  ingestRef.current = ingestInboundReply
  statusRef.current = applyDeliveryStatus
  hasWaRef.current = hasWaMessage

  useEffect(() => {
    if (!enabled) return

    handlers = {
      getClients: () => clientsRef.current,
      ensureClient: (...args) => ensureRef.current(...args),
      ingest: (...args) => ingestRef.current(...args),
      applyStatus: (...args) => statusRef.current(...args),
      hasWa: (...args) => hasWaRef.current(...args),
    }

    subscriberCount += 1
    startRealtime()

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1)
      stopRealtimeIfIdle()
    }
  }, [enabled])
}

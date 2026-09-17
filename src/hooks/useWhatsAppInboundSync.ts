import { useEffect, useRef } from 'react'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { findClientByPhone } from '../lib/phoneMatch'
import { ackInboundMessages, fetchInboundMessages } from '../services/whatsappInbound'
import type { InboundWhatsAppEvent, MessageStatus, ReplyOutcome, ReplySource } from '../types'

/** Um único poll a cada 10s. */
export const INBOUND_POLL_MS = 10_000

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

/** Estado global do poller — fora do React, sobrevive a StrictMode/remount. */
let started = false
let timerId: number | null = null
let inFlight = false
let handlers: SyncHandlers | null = null
let subscriberCount = 0

function mapSource(source: ReplySource | string | undefined): ReplySource {
  if (source === 'mock') return 'mock'
  if (source === 'manual') return 'manual'
  return 'meta_whatsapp'
}

/** Só uma aba do VoltaZap faz GET — evita N abas × poll. */
function claimLeadership(): boolean {
  try {
    const now = Date.now()
    const raw = localStorage.getItem(LOCK_KEY)
    const lock = raw ? (JSON.parse(raw) as { id: string; until: number }) : null
    if (lock && lock.until > now && lock.id !== TAB_ID) return false
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: TAB_ID, until: now + INBOUND_POLL_MS + 2_000 }))
    return true
  } catch {
    return true
  }
}

async function runSyncOnce() {
  if (!handlers) return
  if (inFlight) return
  if (document.visibilityState === 'hidden') return
  if (!claimLeadership()) return

  inFlight = true
  try {
    console.log('inbound poll tick', {
      at: new Date().toISOString(),
      intervalMs: INBOUND_POLL_MS,
      tab: TAB_ID.slice(0, 12),
    })

    // Uma chamada só (pending=0 = todas, para recuperação + pendentes)
    const eventsRaw = await fetchInboundMessages(false)

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

      let clients = h.getClients()
      let client = findClientByPhone(clients, phone)
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
  } catch (error) {
    console.error('whatsapp inbound sync error', error)
  } finally {
    inFlight = false
  }
}

function startGlobalPoller() {
  if (started) return
  started = true
  void runSyncOnce()
  timerId = window.setInterval(() => {
    void runSyncOnce()
  }, INBOUND_POLL_MS)
}

function stopGlobalPollerIfIdle() {
  if (subscriberCount > 0) return
  if (timerId != null) {
    window.clearInterval(timerId)
    timerId = null
  }
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
 * Ponte: GET /api/inbound-messages → localStorage.
 * Um único setInterval global por aba; entre abas, só o líder faz GET.
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
    startGlobalPoller()

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1)
      stopGlobalPollerIfIdle()
    }
  }, [enabled])
}

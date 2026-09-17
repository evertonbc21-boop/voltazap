import { useEffect, useRef } from 'react'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { findClientByPhone } from '../lib/phoneMatch'
import { ackInboundMessages, fetchInboundMessages } from '../services/whatsappInbound'
import type { MessageStatus, ReplyOutcome, ReplySource } from '../types'

/** Um único poll a cada 10s — evita flood nos logs da Vercel. */
const POLL_MS = 10_000

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
  failed: 'nao_entregue',
}

/**
 * Garante no máximo um setInterval global, mesmo com StrictMode
 * ou remount do AppLayout.
 */
let activePollers = 0
let sharedTimer: number | null = null
let sharedInFlight = false
let sharedSyncFn: (() => Promise<void>) | null = null

function mapSource(source: ReplySource | string | undefined): ReplySource {
  if (source === 'mock') return 'mock'
  if (source === 'manual') return 'manual'
  return 'meta_whatsapp'
}

/**
 * Ponte: GET /api/inbound-messages → localStorage (voltazap-replies / voltazap-clients).
 * Só faz ACK no servidor depois de gravar localmente (ou se já existir pelo wamid).
 */
export function useWhatsAppInboundSync(enabled = true) {
  const { clients, ensureClientFromWhatsApp } = useClients()
  const { ingestInboundReply, applyDeliveryStatus, hasWaMessage } = useMessages()
  const clientsRef = useRef(clients)
  const ensureRef = useRef(ensureClientFromWhatsApp)
  const ingestRef = useRef(ingestInboundReply)
  const statusRef = useRef(applyDeliveryStatus)
  const hasWaRef = useRef(hasWaMessage)
  const cancelledRef = useRef(false)

  useEffect(() => {
    clientsRef.current = clients
  }, [clients])

  useEffect(() => {
    ensureRef.current = ensureClientFromWhatsApp
    ingestRef.current = ingestInboundReply
    statusRef.current = applyDeliveryStatus
    hasWaRef.current = hasWaMessage
  }, [ensureClientFromWhatsApp, ingestInboundReply, applyDeliveryStatus, hasWaMessage])

  useEffect(() => {
    if (!enabled) return

    cancelledRef.current = false

    async function syncOnce() {
      if (cancelledRef.current) return
      if (sharedInFlight) return
      sharedInFlight = true

      try {
        // Uma única chamada: pending=0 traz pendentes + já processadas (recuperação).
        console.log('inbound poll tick', { at: new Date().toISOString(), intervalMs: POLL_MS })
        const eventsRaw = await fetchInboundMessages(false)
        if (cancelledRef.current) return

        const byId = new Map<string, (typeof eventsRaw)[number]>()
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

        for (const event of events) {
          if (event.kind === 'status') {
            if (event.waMessageId && event.status) {
              const mapped = STATUS_MAP[event.status]
              if (mapped) statusRef.current(event.waMessageId, mapped, event.fromPhone)
            }
            if (!event.processed) acked.push(event.id)
            continue
          }

          const phone = event.fromPhone || ''
          const wamid = event.waMessageId || event.id

          if (wamid && hasWaRef.current(wamid)) {
            if (!event.processed) acked.push(event.id)
            continue
          }

          let client = findClientByPhone(clientsRef.current, phone)
          if (!client) {
            if (!phone) {
              console.error('whatsapp inbound skip: missing phone', { wamid: wamid || null })
              continue
            }
            const ensured = ensureRef.current({
              phone,
              name: event.contactName,
            })
            client = ensured.client
            clientsRef.current = [client, ...clientsRef.current.filter((c) => c.id !== client!.id)]
          }

          const outcome = (event.analysis?.outcome || 'interessado') as ReplyOutcome
          const orderValue =
            outcome === 'pedido_realizado'
              ? event.analysis?.orderValue ?? event.analysis?.valorPedido ?? undefined
              : undefined

          const result = ingestRef.current({
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

          if (result.ok) {
            acked.push(event.id)
          } else {
            console.error('whatsapp webhook local ingest failed', result)
          }
        }

        if (acked.length) await ackInboundMessages(acked)
      } catch (error) {
        console.error('whatsapp inbound sync error', error)
      } finally {
        sharedInFlight = false
      }
    }

    sharedSyncFn = syncOnce
    activePollers += 1

    // Só o primeiro mount cria o intervalo compartilhado.
    if (sharedTimer == null) {
      void syncOnce()
      sharedTimer = window.setInterval(() => {
        void sharedSyncFn?.()
      }, POLL_MS)
    }

    const onFocus = () => {
      void sharedSyncFn?.()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void sharedSyncFn?.()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelledRef.current = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      activePollers = Math.max(0, activePollers - 1)
      if (activePollers === 0 && sharedTimer != null) {
        window.clearInterval(sharedTimer)
        sharedTimer = null
        sharedSyncFn = null
      }
    }
  }, [enabled])
}

import { useEffect, useRef } from 'react'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { findClientByPhone } from '../lib/phoneMatch'
import { ackInboundMessages, fetchInboundMessages } from '../services/whatsappInbound'
import type { MessageStatus, ReplyOutcome, ReplySource } from '../types'

const POLL_MS = 2000

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
  failed: 'nao_entregue',
}

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

    let cancelled = false

    async function syncOnce() {
      try {
        const [pending, all] = await Promise.all([
          fetchInboundMessages(true),
          fetchInboundMessages(false),
        ])
        if (cancelled) return

        // Recupera mensagens já "acked" no servidor mas ausentes no localStorage
        const byId = new Map<string, (typeof pending)[number]>()
        for (const event of [...pending, ...all]) {
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

          // Já está no storage local do VoltaZap → só confirma ACK
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
          } else {
            console.log('whatsapp webhook client matched', {
              phone,
              clientId: client.id,
              name: client.nome,
              wamid: wamid || null,
            })
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
      }
    }

    void syncOnce()
    const timer = window.setInterval(() => void syncOnce(), POLL_MS)
    const onFocus = () => void syncOnce()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncOnce()
    })
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled])
}

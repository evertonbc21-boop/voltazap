import { useEffect, useRef } from 'react'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { findClientByPhone } from '../lib/phoneMatch'
import { ackInboundMessages, fetchInboundMessages } from '../services/whatsappInbound'
import type { MessageStatus, ReplyOutcome, ReplySource } from '../types'

/** Poll rápido: o automático é o fluxo principal. */
const POLL_MS = 3000

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
  failed: 'nao_entregue',
}

function mapSource(source: ReplySource | string | undefined): ReplySource {
  if (source === 'mock') return 'mock'
  if (source === 'manual') return 'manual'
  // whatsapp_cloud legado → meta_whatsapp
  return 'meta_whatsapp'
}

/**
 * Sincroniza eventos do webhook (servidor) com o histórico local (localStorage).
 * Casa telefone/wa_id com clientes e atualiza Resultados, Mensagens e Dashboard.
 */
export function useWhatsAppInboundSync(enabled = true) {
  const { clients } = useClients()
  const { ingestInboundReply, applyDeliveryStatus } = useMessages()
  const clientsRef = useRef(clients)
  const ingestRef = useRef(ingestInboundReply)
  const statusRef = useRef(applyDeliveryStatus)

  useEffect(() => {
    clientsRef.current = clients
  }, [clients])

  useEffect(() => {
    ingestRef.current = ingestInboundReply
    statusRef.current = applyDeliveryStatus
  }, [ingestInboundReply, applyDeliveryStatus])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function syncOnce() {
      try {
        const events = await fetchInboundMessages(true)
        if (cancelled || !events.length) return

        const acked: string[] = []

        for (const event of events) {
          if (event.kind === 'status') {
            if (event.waMessageId && event.status) {
              const mapped = STATUS_MAP[event.status]
              if (mapped) statusRef.current(event.waMessageId, mapped, event.fromPhone)
            }
            acked.push(event.id)
            continue
          }

          const client = findClientByPhone(clientsRef.current, event.fromPhone)
          if (!client) {
            // Mantém pendente até o telefone bater com um cliente cadastrado
            continue
          }

          const outcome = (event.analysis?.outcome || 'interessado') as ReplyOutcome
          const orderValue =
            outcome === 'pedido_realizado'
              ? event.analysis?.orderValue ?? event.analysis?.valorPedido ?? undefined
              : undefined

          ingestRef.current({
            clientId: client.id,
            clientName: client.nome || event.contactName || 'Cliente',
            reply: event.text || '',
            outcome,
            orderValue: typeof orderValue === 'number' ? orderValue : undefined,
            source: mapSource(event.source),
            intent: event.analysis?.intentLabel || event.analysis?.intent || 'Interessado',
            fromPhone: event.fromPhone,
            waMessageId: event.waMessageId,
            conversationStatus: event.analysis?.conversationStatus || event.analysis?.statusConversa,
            receivedAtIso: event.receivedAt,
            messagePreview: `Campanha · resposta de ${client.nome}`,
          })
          acked.push(event.id)
        }

        if (acked.length) await ackInboundMessages(acked)
      } catch {
        // API indisponível no Vite local sem `vercel dev` — silencioso
      }
    }

    void syncOnce()
    const timer = window.setInterval(() => void syncOnce(), POLL_MS)
    const onFocus = () => void syncOnce()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled])
}

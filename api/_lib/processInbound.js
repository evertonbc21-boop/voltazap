import { randomUUID } from 'node:crypto'
import { analyzeInboundText } from './intentDetection.js'
import { addInboundEvent } from './inboundStore.js'
import { normalizePhone } from './phone.js'
import { parseWhatsAppWebhookBody } from './parseWhatsAppWebhook.js'
import { forwardToTypebot } from './typebot.js'

/**
 * Processa payload Meta (ou mock no mesmo formato interno).
 * @param {any} body
 * @param {{ source?: 'meta_whatsapp' | 'mock' }} [options]
 */
export async function processWhatsAppWebhook(body, options = {}) {
  const source = options.source || 'meta_whatsapp'
  const { messages, statuses } = parseWhatsAppWebhookBody(body)
  const stored = []

  for (const msg of messages) {
    const analysis = analyzeInboundText(msg.text)
    const orderValue =
      analysis.outcome === 'interessado' ? analysis.orderValue : undefined
    const fromPhone = normalizePhone(msg.fromPhone)

    console.log('whatsapp webhook message received', {
      wamid: msg.waMessageId || null,
      phone: fromPhone || null,
      name: msg.contactName || null,
      text: msg.text || null,
      timestamp: msg.timestamp || null,
      type: msg.type || null,
    })

    console.log('whatsapp webhook extracted', {
      from: fromPhone || msg.fromPhone || null,
      'text.body': msg.text || null,
      wamid: msg.waMessageId || null,
      type: msg.type || null,
      timestamp: msg.timestamp || null,
      contactName: msg.contactName || null,
    })

    // No servidor a identidade do cliente é o telefone (CRM fica no frontend).
    console.log('whatsapp webhook client matched', {
      phone: fromPhone || null,
      matchedBy: 'phone',
      contactName: msg.contactName || null,
    })

    const event = {
      id: msg.waMessageId || `in-${randomUUID()}`,
      kind: /** @type {'message'} */ ('message'),
      waMessageId: msg.waMessageId || `local-${randomUUID()}`,
      fromPhone,
      phone: fromPhone,
      customerPhone: fromPhone,
      contactName: msg.contactName,
      customerName: msg.contactName,
      text: msg.text,
      receivedAt: new Date((msg.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      timestamp: msg.timestamp,
      type: msg.type,
      phoneNumberId: msg.phoneNumberId,
      status: 'received',
      direction: 'inbound',
      analysis: {
        intent: analysis.intent,
        intentLabel: analysis.intentLabel,
        outcome: analysis.outcome,
        orderValue,
        conversationStatus: analysis.conversationStatus,
        confidence: analysis.confidence,
        typebotReady: true,
        pedidoRealizado: Boolean(orderValue),
        valorPedido: orderValue ?? null,
        statusConversa: analysis.conversationStatus,
      },
      source,
      processed: false,
      raw: msg.raw,
    }

    const result = await addInboundEvent(event)
    if (result.stored && result.event) {
      stored.push(result.event)
      console.log('whatsapp webhook message stored', {
        stored: true,
        wamid: result.event.waMessageId,
        phone: result.event.fromPhone,
        text: result.event.text,
        status: result.event.status,
        source: result.event.source,
      })
      void forwardToTypebot({
        eventType: 'inbound_message',
        phone: event.fromPhone,
        contactName: event.contactName,
        text: event.text,
        receivedAt: event.receivedAt,
        analysis: event.analysis,
        waMessageId: event.waMessageId,
        source: event.source,
      })
    } else {
      console.log('whatsapp webhook message not stored', {
        stored: false,
        wamid: event.waMessageId,
        phone: event.fromPhone,
        text: event.text,
        reason: result.reason || 'unknown',
      })
    }
  }

  for (const st of statuses) {
    const event = {
      id: `st-${randomUUID()}`,
      kind: /** @type {'status'} */ ('status'),
      waMessageId: st.waMessageId,
      fromPhone: st.recipientPhone ? normalizePhone(st.recipientPhone) : undefined,
      text: '',
      receivedAt: new Date((st.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      timestamp: st.timestamp,
      status: st.status,
      phoneNumberId: st.phoneNumberId,
      analysis: {
        intent: 'delivery_status',
        intentLabel: st.status,
        outcome: 'nao_respondeu',
        conversationStatus: st.status,
        confidence: 1,
        typebotReady: false,
        pedidoRealizado: false,
        valorPedido: null,
        statusConversa: st.status,
      },
      source,
      processed: false,
      raw: st.raw,
    }
    const result = await addInboundEvent(event)
    if (result.stored && result.event) stored.push(result.event)
  }

  return {
    ok: true,
    messages: messages.length,
    statuses: statuses.length,
    stored: stored.length,
    events: stored,
  }
}

/**
 * Monta um payload no formato Meta a partir de um mock simples.
 */
export function buildMockMetaPayload({ fromPhone, text, contactName }) {
  const phone = normalizePhone(fromPhone)
  const ts = String(Math.floor(Date.now() / 1000))
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock-entry',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550000000',
                phone_number_id: 'mock-phone-id',
              },
              contacts: [
                {
                  profile: { name: contactName || 'Cliente teste' },
                  wa_id: phone,
                },
              ],
              messages: [
                {
                  from: phone,
                  id: `wamid.mock.${Date.now()}`,
                  timestamp: ts,
                  type: 'text',
                  text: { body: text || 'Quero fazer um pedido' },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

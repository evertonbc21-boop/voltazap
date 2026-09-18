/**
 * Extrai mensagens e status do payload da WhatsApp Cloud API (Meta).
 */

import { normalizePhone } from './phone.js'

/**
 * @param {any} body
 * @returns {{
 *   messages: Array<{
 *     waMessageId: string,
 *     fromPhone: string,
 *     contactName?: string,
 *     text: string,
 *     timestamp: number,
 *     type: string,
 *     phoneNumberId?: string,
 *     raw: any,
 *   }>,
 *   statuses: Array<{
 *     waMessageId: string,
 *     status: string,
 *     recipientPhone?: string,
 *     timestamp: number,
 *     phoneNumberId?: string,
 *     raw: any,
 *   }>,
 * }}
 */
export function parseWhatsAppWebhookBody(body) {
  const messages = []
  const statuses = []

  if (!body || body.object !== 'whatsapp_business_account') {
    console.warn('whatsapp parse skip: invalid object', { object: body?.object || null })
    return { messages, statuses }
  }

  const entries = Array.isArray(body.entry) ? body.entry : []
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change?.value
      if (!value) continue

      // Aceita field "messages" e também mudanças sem field (payloads legados/teste)
      if (change.field && change.field !== 'messages') {
        console.log('whatsapp parse skip field', { field: change.field })
        continue
      }

      const phoneNumberId = value.metadata?.phone_number_id
      const contacts = Array.isArray(value.contacts) ? value.contacts : []

      for (const msg of Array.isArray(value.messages) ? value.messages : []) {
        const fromPhone = String(msg.from || '')
        const text = extractMessageText(msg)
        const waMessageId = String(msg.id || buildFallbackMessageId(fromPhone, msg.timestamp, text))
        messages.push({
          waMessageId,
          fromPhone,
          contactName: findContactName(contacts, fromPhone),
          text,
          timestamp: Number(msg.timestamp) || Math.floor(Date.now() / 1000),
          type: String(msg.type || 'unknown'),
          phoneNumberId,
          raw: msg,
        })
      }

      for (const st of Array.isArray(value.statuses) ? value.statuses : []) {
        statuses.push({
          waMessageId: String(st.id || ''),
          status: String(st.status || ''),
          recipientPhone: st.recipient_id ? String(st.recipient_id) : undefined,
          timestamp: Number(st.timestamp) || Math.floor(Date.now() / 1000),
          phoneNumberId,
          raw: st,
        })
      }
    }
  }

  return { messages, statuses }
}

function findContactName(contacts, fromPhone) {
  const target = normalizePhone(fromPhone)
  for (const contact of contacts) {
    const waId = normalizePhone(String(contact.wa_id || ''))
    if (!waId) continue
    if (
      waId === target ||
      waId.slice(-11) === target.slice(-11) ||
      waId.slice(-10) === target.slice(-10)
    ) {
      return contact.profile?.name || undefined
    }
  }
  // Fallback: primeiro contato do payload (Meta costuma mandar 1)
  return contacts[0]?.profile?.name || undefined
}

function buildFallbackMessageId(fromPhone, timestamp, text) {
  const base = `${normalizePhone(fromPhone)}:${timestamp || ''}:${String(text || '').slice(0, 80)}`
  let hash = 0
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0
  }
  return `wamid.fallback.${hash.toString(16)}`
}

function extractMessageText(msg) {
  if (!msg) return ''
  if (msg.type === 'text' && msg.text?.body) return String(msg.text.body)
  if (msg.type === 'button' && msg.button?.text) return String(msg.button.text)
  if (msg.type === 'interactive') {
    const title =
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      msg.interactive?.list_reply?.description
    if (title) return String(title)
  }
  if (msg.type === 'image' && msg.image?.caption) return String(msg.image.caption)
  if (msg.type === 'audio') return '[áudio]'
  if (msg.type === 'image') return '[imagem]'
  if (msg.type === 'video') return '[vídeo]'
  if (msg.type === 'document') return '[documento]'
  if (msg.type === 'sticker') return '[sticker]'
  if (msg.type === 'location') return '[localização]'
  if (msg.type === 'contacts') return '[contato]'
  return msg.type ? `[${msg.type}]` : ''
}

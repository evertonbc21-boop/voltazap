/**
 * Envia mensagem de texto via WhatsApp Cloud API (Meta Graph).
 * POST /api/whatsapp/send
 * Body: { to: string, text: string }
 *
 * Env:
 *   WHATSAPP_TOKEN | WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 */

import { normalizePhone } from '../_lib/phone.js'
import { getPhoneNumberId, getWhatsAppToken } from '../_lib/metaGraph.js'
import { readJsonBodySafe, sendJson } from '../_lib/http.js'
import { silenceUrlParseDeprecation } from '../_lib/silenceDep0169.js'

silenceUrlParseDeprecation()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const token = getWhatsAppToken()
  const phoneNumberId = getPhoneNumberId()

  if (!token || !phoneNumberId) {
    return sendJson(res, 503, {
      ok: false,
      error: 'whatsapp_not_configured',
      hint: 'Defina WHATSAPP_ACCESS_TOKEN (ou WHATSAPP_TOKEN) e WHATSAPP_PHONE_NUMBER_ID na Vercel.',
      configured: false,
    })
  }

  const parsed = await readJsonBodySafe(req)
  if (!parsed.ok) {
    return sendJson(res, 400, { ok: false, error: 'invalid_body', reason: parsed.reason })
  }

  const to = normalizePhone(parsed.body?.to || '')
  const text = String(parsed.body?.text || '').trim()

  if (!to || to.length < 12) {
    return sendJson(res, 400, { ok: false, error: 'invalid_phone' })
  }
  if (!text) {
    return sendJson(res, 400, { ok: false, error: 'empty_text' })
  }
  if (text.length > 4096) {
    return sendJson(res, 400, { ok: false, error: 'text_too_long' })
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const metaError = data?.error?.message || data?.error?.error_user_msg || `http_${response.status}`
      console.error('whatsapp send failed', { status: response.status, error: data?.error || data })
      return sendJson(res, 502, {
        ok: false,
        error: 'meta_send_failed',
        detail: metaError,
        code: data?.error?.code,
      })
    }

    const waMessageId = data?.messages?.[0]?.id || null
    console.log('whatsapp send ok', { to, wamid: waMessageId })

    return sendJson(res, 200, {
      ok: true,
      provider: 'meta_cloud',
      to,
      waMessageId,
      messageStatus: data?.messages?.[0]?.message_status || 'accepted',
    })
  } catch (error) {
    console.error('whatsapp send error', error)
    return sendJson(res, 500, { ok: false, error: 'server_error' })
  }
}

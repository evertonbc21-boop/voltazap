/**
 * Simula mensagem inbound da Cloud API (modo teste).
 * POST /api/webhooks/whatsapp/mock
 *
 * Protegido por WHATSAPP_MOCK_SECRET (ou, em dev sem secret, libera se MOCK_OPEN=true).
 * Body: { fromPhone, text, contactName? }
 */

import { getRawBody, parseJsonBody, sendJson } from '../../_lib/http.js'
import { buildMockMetaPayload, processWhatsAppWebhook } from '../../_lib/processInbound.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const mockSecret = process.env.WHATSAPP_MOCK_SECRET
  const mockOpen = process.env.WHATSAPP_MOCK_OPEN === 'true'
  const provided =
    req.headers['x-voltazap-mock-secret'] ||
    req.headers['x-mock-secret'] ||
    ''

  if (mockSecret) {
    if (provided !== mockSecret) {
      return sendJson(res, 401, { error: 'unauthorized_mock' })
    }
  } else if (!mockOpen) {
    return sendJson(res, 403, {
      error: 'mock_disabled',
      hint: 'Defina WHATSAPP_MOCK_OPEN=true ou WHATSAPP_MOCK_SECRET para habilitar.',
    })
  }

  try {
    const raw = await getRawBody(req)
    const body = parseJsonBody(req, raw)
    const fromPhone = body.fromPhone || body.phone || ''
    const text = body.text || body.message || ''
    const contactName = body.contactName || body.name

    if (!fromPhone || !String(text).trim()) {
      return sendJson(res, 400, { error: 'fromPhone_and_text_required' })
    }

    const payload = buildMockMetaPayload({ fromPhone, text, contactName })
    const result = await processWhatsAppWebhook(payload, { source: 'mock' })

    return sendJson(res, 200, {
      ok: true,
      mode: 'mock',
      stored: result.stored,
      events: result.events,
    })
  } catch (error) {
    console.error('whatsapp mock error', error)
    return sendJson(res, 500, { error: 'server_error' })
  }
}

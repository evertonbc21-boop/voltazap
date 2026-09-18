/**
 * Status da conexão WhatsApp Cloud API.
 * GET /api/whatsapp/status
 */

import { sendJson } from '../_lib/http.js'
import { silenceUrlParseDeprecation } from '../_lib/silenceDep0169.js'

silenceUrlParseDeprecation()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const token = (process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const verifyToken = (process.env.VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '').trim()
  const appSecret = (process.env.WHATSAPP_APP_SECRET || '').trim()

  return sendJson(res, 200, {
    ok: true,
    configured: Boolean(token && phoneNumberId),
    hasToken: Boolean(token),
    hasPhoneNumberId: Boolean(phoneNumberId),
    hasVerifyToken: Boolean(verifyToken),
    hasAppSecret: Boolean(appSecret),
    webhookPath: '/api/webhooks/whatsapp',
  })
}

/**
 * WhatsApp Cloud API webhook (Meta).
 * GET  /api/webhooks/whatsapp — verificação (hub.challenge)
 * POST /api/webhooks/whatsapp — eventos de mensagem / status
 *
 * Env (use um dos dois):
 *   VERIFY_TOKEN           (preferido)
 *   WHATSAPP_VERIFY_TOKEN  (legado)
 *   WHATSAPP_APP_SECRET    (opcional: valida X-Hub-Signature-256)
 *   TYPEBOT_WEBHOOK_URL    (opcional)
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { getRawBody, sendJson } from '../../_lib/http.js'
import { processWhatsAppWebhook } from '../../_lib/processInbound.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleVerify(req, res)
  }

  if (req.method === 'POST') {
    return handleEvent(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return sendJson(res, 405, { error: 'method_not_allowed' })
}

function getVerifyToken() {
  return (process.env.VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '').trim()
}

/** Lê hub.* de req.query ou da URL (fallback). */
function readHubParams(req) {
  const fromQuery = {
    mode: firstQuery(req.query, 'hub.mode'),
    token: firstQuery(req.query, 'hub.verify_token'),
    challenge: firstQuery(req.query, 'hub.challenge'),
  }

  if (fromQuery.mode || fromQuery.token || fromQuery.challenge) {
    return fromQuery
  }

  try {
    const host = req.headers?.host || 'localhost'
    const url = new URL(req.url || '/', `https://${host}`)
    return {
      mode: url.searchParams.get('hub.mode') || '',
      token: url.searchParams.get('hub.verify_token') || '',
      challenge: url.searchParams.get('hub.challenge') || '',
    }
  } catch {
    return { mode: '', token: '', challenge: '' }
  }
}

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return ''
  const value = query[key]
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (value == null) return ''
  return String(value)
}

function handleVerify(req, res) {
  const { mode, token, challenge } = readHubParams(req)
  const verifyToken = getVerifyToken()

  // Abertura no navegador sem query da Meta
  if (!mode && !token && !challenge) {
    return sendJson(res, 200, {
      ok: true,
      service: 'voltazap-whatsapp-webhook',
      message: 'Webhook ativo. Callback URL: https://voltazap.vercel.app/api/webhooks/whatsapp',
      verifyTokenConfigured: Boolean(verifyToken),
    })
  }

  if (!verifyToken) {
    console.error('VERIFY_TOKEN / WHATSAPP_VERIFY_TOKEN is not set')
    res.statusCode = 403
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Forbidden')
    return
  }

  if (mode === 'subscribe' && token === verifyToken) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(challenge)
    return
  }

  res.statusCode = 403
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('Forbidden')
}

async function handleEvent(req, res) {
  try {
    const rawBody = await getRawBody(req)
    const signature = req.headers['x-hub-signature-256']
    const appSecret = process.env.WHATSAPP_APP_SECRET

    if (appSecret) {
      const valid = verifySignature(rawBody, signature, appSecret)
      if (!valid) {
        return sendJson(res, 401, { error: 'invalid_signature' })
      }
    }

    let body
    try {
      body = rawBody ? JSON.parse(rawBody) : req.body || {}
    } catch {
      return sendJson(res, 400, { error: 'invalid_json' })
    }

    const result = await processWhatsAppWebhook(body, { source: 'meta_whatsapp' })

    // Meta espera 200 rápido — processamento já é síncrono e leve (memória)
    return sendJson(res, 200, {
      ok: true,
      received: {
        messages: result.messages,
        statuses: result.statuses,
        stored: result.stored,
      },
    })
  } catch (error) {
    console.error('whatsapp webhook error', error)
    return sendJson(res, 500, { error: 'server_error' })
  }
}

function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || typeof signatureHeader !== 'string') return false
  const expected =
    'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(signatureHeader)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

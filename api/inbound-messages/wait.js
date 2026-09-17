/**
 * Long-poll: espera até aparecer mensagem pendente (quase em tempo real).
 * GET /api/inbound-messages/wait?timeoutMs=8000
 *
 * Não altera GET /api/inbound-messages nem o webhook da Meta.
 */

import { listInboundEvents } from '../_lib/inboundStore.js'
import { sendJson } from '../_lib/http.js'
import { silenceUrlParseDeprecation } from '../_lib/silenceDep0169.js'

silenceUrlParseDeprecation()

const DEFAULT_TIMEOUT_MS = 8000
const MAX_TIMEOUT_MS = 25000
const POLL_EVERY_MS = 400

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Lê query com WHATWG URL — evita url.parse() (DEP0169). */
function readTimeoutMs(req) {
  try {
    const host = req.headers?.host || 'localhost'
    const url = new URL(req.url || '/', `https://${host}`)
    const requested = Number(url.searchParams.get('timeoutMs') ?? DEFAULT_TIMEOUT_MS)
    if (!Number.isFinite(requested)) return DEFAULT_TIMEOUT_MS
    return Math.min(MAX_TIMEOUT_MS, Math.max(1000, requested))
  } catch {
    return DEFAULT_TIMEOUT_MS
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const timeoutMs = readTimeoutMs(req)
  const deadline = Date.now() + timeoutMs

  try {
    while (Date.now() < deadline) {
      if (req.destroyed || res.writableEnded) return

      const events = await listInboundEvents({ pendingOnly: true })
      const messages = events.filter((e) => e.kind === 'message')
      if (messages.length > 0) {
        return sendJson(res, 200, {
          ok: true,
          waited: true,
          count: messages.length,
          events: messages,
        })
      }

      const remaining = deadline - Date.now()
      if (remaining <= 0) break
      await sleep(Math.min(POLL_EVERY_MS, remaining))
    }

    return sendJson(res, 200, {
      ok: true,
      waited: true,
      timeout: true,
      count: 0,
      events: [],
    })
  } catch (error) {
    console.error('inbound-messages wait error', error)
    return sendJson(res, 500, { error: 'server_error' })
  }
}

export const config = {
  maxDuration: 30,
}

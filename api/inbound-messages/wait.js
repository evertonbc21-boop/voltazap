/**
 * Long-poll: espera até aparecer mensagem pendente (quase em tempo real).
 * GET /api/inbound-messages/wait?timeoutMs=8000
 *
 * Não altera GET /api/inbound-messages nem o webhook da Meta.
 */

import { listInboundEvents } from '../_lib/inboundStore.js'
import { sendJson } from '../_lib/http.js'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_TIMEOUT_MS = 25000
const POLL_EVERY_MS = 350

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const requested = Number(req.query.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const timeoutMs = Math.min(
    MAX_TIMEOUT_MS,
    Math.max(1000, Number.isFinite(requested) ? requested : DEFAULT_TIMEOUT_MS),
  )
  const deadline = Date.now() + timeoutMs

  try {
    while (Date.now() < deadline) {
      if (req.destroyed || res.writableEnded) return

      const events = await listInboundEvents({ pendingOnly: true })
      const messages = events.filter((e) => e.kind === 'message')
      if (messages.length > 0) {
        console.log('inbound wait resolved', {
          count: messages.length,
          waitedMs: timeoutMs - Math.max(0, deadline - Date.now()),
        })
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

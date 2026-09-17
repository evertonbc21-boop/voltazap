/**
 * Marca eventos inbound como processados após o front registrar no histórico.
 * POST /api/inbound-messages/ack
 * Body: { ids: string[] }
 */

import { ackInboundEvents } from '../_lib/inboundStore.js'
import { readJsonBodySafe, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  try {
    const parsed = await readJsonBodySafe(req)
    if (!parsed.ok) {
      return sendJson(res, 400, { error: 'invalid_body', reason: parsed.reason })
    }
    const ids = Array.isArray(parsed.body.ids) ? parsed.body.ids.map(String) : []
    if (!ids.length) {
      return sendJson(res, 400, { error: 'ids_required' })
    }

    const result = await ackInboundEvents(ids)
    return sendJson(res, 200, { ok: true, ...result })
  } catch (error) {
    console.error('inbound ack error', error)
    return sendJson(res, 500, { error: 'server_error' })
  }
}

/**
 * Marca eventos inbound como processados após o front registrar no histórico.
 * POST /api/inbound-messages/ack
 * Body: { ids: string[] }
 */

import { ackInboundEvents } from '../../_lib/inboundStore.js'
import { getRawBody, parseJsonBody, sendJson } from '../../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  try {
    const raw = await getRawBody(req)
    const body = parseJsonBody(req, raw)
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
    if (!ids.length) {
      return sendJson(res, 400, { error: 'ids_required' })
    }

    const result = ackInboundEvents(ids)
    return sendJson(res, 200, { ok: true, ...result })
  } catch (error) {
    console.error('inbound ack error', error)
    return sendJson(res, 500, { error: 'server_error' })
  }
}

/**
 * Lista eventos inbound pendentes para o front sincronizar com localStorage.
 * GET /api/inbound-messages?pending=1
 */

import { listInboundEvents } from '../_lib/inboundStore.js'
import { sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  const pendingOnly = String(req.query.pending ?? '1') !== '0'
  const events = listInboundEvents({ pendingOnly })

  return sendJson(res, 200, {
    ok: true,
    count: events.length,
    events,
    note:
      'Store em memória (warm instance). Em produção, troque por Redis/Postgres. O front casa o telefone com clientes do localStorage.',
  })
}

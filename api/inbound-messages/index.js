import { listInboundEvents } from '../_lib/inboundStore.js'
import { sendJson } from '../_lib/http.js'
import { silenceUrlParseDeprecation } from '../_lib/silenceDep0169.js'

silenceUrlParseDeprecation()

/**
 * Lista eventos inbound pendentes para o front sincronizar com localStorage.
 * GET /api/inbound-messages?pending=1
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  try {
    const host = req.headers?.host || 'localhost'
    const url = new URL(req.url || '/', `https://${host}`)
    const pendingOnly = url.searchParams.get('pending') !== '0'
    const events = await listInboundEvents({ pendingOnly })

    return sendJson(res, 200, {
      ok: true,
      count: events.length,
      events,
    })
  } catch (error) {
    console.error('inbound-messages list error', error)
    return sendJson(res, 500, { error: 'server_error' })
  }
}

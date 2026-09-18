/**
 * Diagnóstico ponta a ponta WhatsApp (Meta + store + webhook).
 * GET  /api/whatsapp/diagnostics
 * POST /api/whatsapp/diagnostics  → repara inscrição no WABA
 */

import { listInboundEvents } from '../_lib/inboundStore.js'
import { sendJson } from '../_lib/http.js'
import {
  ensureWabaSubscription,
  fetchPhoneNumberInfo,
  getBusinessAccountId,
  getPhoneNumberId,
  getVerifyToken,
  getWhatsAppToken,
  listSubscribedApps,
} from '../_lib/metaGraph.js'
import { silenceUrlParseDeprecation } from '../_lib/silenceDep0169.js'
import { listWebhookHits } from '../_lib/webhookHits.js'

silenceUrlParseDeprecation()

function productionCallbackUrl(req) {
  const host = req.headers?.host || 'voltazap.vercel.app'
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}/api/webhooks/whatsapp`
}

async function buildReport(req) {
  const hits = await listWebhookHits()
  const pending = await listInboundEvents({ pendingOnly: true })
  const all = await listInboundEvents({ pendingOnly: false })
  const subscribed = await listSubscribedApps()
  const phoneInfo = await fetchPhoneNumberInfo()

  const lastHit = hits[0] || null
  const lastMessageHit = hits.find((h) => (h.messages || 0) > 0) || null
  const minutesSinceLastMessage = lastMessageHit
    ? Math.round((Date.now() - new Date(lastMessageHit.at).getTime()) / 60000)
    : null

  const issues = []
  if (!getWhatsAppToken()) issues.push('Falta WHATSAPP_ACCESS_TOKEN / WHATSAPP_TOKEN')
  if (!getPhoneNumberId()) issues.push('Falta WHATSAPP_PHONE_NUMBER_ID')
  if (!getBusinessAccountId()) issues.push('Falta WHATSAPP_BUSINESS_ACCOUNT_ID (necessário para reparar inscrição)')
  if (!getVerifyToken()) issues.push('Falta VERIFY_TOKEN')
  if (!subscribed.ok) {
    issues.push(`Não foi possível listar apps inscritos no WABA: ${subscribed.error}`)
  } else if (!subscribed.data.length) {
    issues.push('Nenhum app inscrito no WABA — a Meta não envia webhooks de mensagens')
  }
  if (!lastMessageHit) {
    issues.push('Nenhuma mensagem inbound registrada recentemente neste servidor')
  }

  return {
    ok: true,
    callbackUrl: productionCallbackUrl(req),
    env: {
      hasToken: Boolean(getWhatsAppToken()),
      hasPhoneNumberId: Boolean(getPhoneNumberId()),
      hasBusinessAccountId: Boolean(getBusinessAccountId()),
      hasVerifyToken: Boolean(getVerifyToken()),
    },
    phoneNumber: phoneInfo.ok ? phoneInfo.data : { error: phoneInfo.error },
    subscribedApps: subscribed.ok ? subscribed.data : { error: subscribed.error },
    store: {
      pendingMessages: pending.filter((e) => e.kind === 'message').length,
      totalEvents: all.length,
      latest: all[0]
        ? {
            text: all[0].text,
            phone: all[0].fromPhone,
            at: all[0].receivedAt,
            processed: all[0].processed,
            wamid: all[0].waMessageId,
          }
        : null,
    },
    webhookHits: hits.slice(0, 10),
    lastWebhookAt: lastHit?.at || null,
    lastInboundMessageAt: lastMessageHit?.at || null,
    minutesSinceLastInboundMessage: minutesSinceLastMessage,
    issues,
    healthy: issues.length === 0,
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const report = await buildReport(req)
      return sendJson(res, 200, report)
    } catch (error) {
      console.error('whatsapp diagnostics error', error)
      return sendJson(res, 500, { ok: false, error: 'server_error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const callbackUrl = productionCallbackUrl(req)
      const repair = await ensureWabaSubscription(callbackUrl)
      const report = await buildReport(req)
      return sendJson(res, repair.ok ? 200 : 502, {
        ok: repair.ok,
        repair,
        report,
      })
    } catch (error) {
      console.error('whatsapp diagnostics repair error', error)
      return sendJson(res, 500, { ok: false, error: 'server_error' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return sendJson(res, 405, { error: 'method_not_allowed' })
}

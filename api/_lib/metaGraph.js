/**
 * Helpers Graph API (Meta WhatsApp Cloud).
 */

export function getWhatsAppToken() {
  return (process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
}

export function getPhoneNumberId() {
  return (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
}

export function getBusinessAccountId() {
  return (
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
    process.env.WHATSAPP_WABA_ID ||
    ''
  ).trim()
}

export function getVerifyToken() {
  return (process.env.VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '').trim()
}

/**
 * Lista apps inscritos no WABA (webhooks).
 */
export async function listSubscribedApps() {
  const token = getWhatsAppToken()
  const wabaId = getBusinessAccountId()
  if (!token || !wabaId) {
    return { ok: false, error: 'missing_token_or_waba', data: [] }
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(wabaId)}/subscribed_apps`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      error: data?.error?.message || `http_${response.status}`,
      code: data?.error?.code,
      data: [],
    }
  }
  return { ok: true, data: Array.isArray(data.data) ? data.data : [] }
}

/**
 * Garante inscrição do app no WABA + override do callback para produção VoltaZap.
 * 1) POST subscribed_apps (baseline)
 * 2) POST com override_callback_uri
 */
export async function ensureWabaSubscription(callbackUrl) {
  const token = getWhatsAppToken()
  const wabaId = getBusinessAccountId()
  const verifyToken = getVerifyToken()
  if (!token || !wabaId) {
    return { ok: false, error: 'missing_token_or_waba' }
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(wabaId)}/subscribed_apps`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Passo 1: inscrição básica
  const step1 = await fetch(url, { method: 'POST', headers, body: '{}' })
  const step1Body = await step1.json().catch(() => ({}))
  if (!step1.ok && step1Body?.error?.code !== 100) {
    // code 100 às vezes = já inscrito / parâmetro — seguimos para override
    const msg = step1Body?.error?.message || ''
    if (!/already|subscribed|exist/i.test(msg) && step1.status >= 400) {
      return {
        ok: false,
        step: 'subscribe',
        error: step1Body?.error?.message || `http_${step1.status}`,
        code: step1Body?.error?.code,
      }
    }
  }

  // Passo 2: override callback (se temos verify token + URL)
  let override = null
  if (callbackUrl && verifyToken) {
    const step2 = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        override_callback_uri: callbackUrl,
        verify_token: verifyToken,
      }),
    })
    const step2Body = await step2.json().catch(() => ({}))
    override = {
      ok: step2.ok,
      status: step2.status,
      body: step2Body,
      error: step2.ok ? null : step2Body?.error?.message || `http_${step2.status}`,
    }
  }

  const listed = await listSubscribedApps()
  return {
    ok: true,
    subscribed: listed.ok,
    apps: listed.data,
    override,
    callbackUrl: callbackUrl || null,
  }
}

/**
 * Info básica do phone number id.
 */
export async function fetchPhoneNumberInfo() {
  const token = getWhatsAppToken()
  const phoneNumberId = getPhoneNumberId()
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'missing_token_or_phone_id' }
  }
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { ok: false, error: data?.error?.message || `http_${response.status}`, data }
  }
  return { ok: true, data }
}

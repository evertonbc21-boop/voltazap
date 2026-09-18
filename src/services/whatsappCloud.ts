import { personalizeMessage } from '../data/mock'
import { toWhatsAppPhone } from '../lib/whatsapp'
import type { Client } from '../types'

export type WhatsAppCloudStatus = {
  ok: boolean
  configured: boolean
  hasToken: boolean
  hasPhoneNumberId: boolean
  hasVerifyToken: boolean
  hasAppSecret: boolean
  webhookPath: string
}

export type SendWhatsAppResult =
  | { ok: true; provider: 'meta_cloud'; to: string; waMessageId: string | null }
  | {
      ok: false
      error: string
      detail?: string
      configured?: boolean
      fallbackSuggested?: boolean
    }

export async function fetchWhatsAppCloudStatus(): Promise<WhatsAppCloudStatus> {
  const response = await fetch('/api/whatsapp/status')
  if (!response.ok) {
    return {
      ok: false,
      configured: false,
      hasToken: false,
      hasPhoneNumberId: false,
      hasVerifyToken: false,
      hasAppSecret: false,
      webhookPath: '/api/webhooks/whatsapp',
    }
  }
  return (await response.json()) as WhatsAppCloudStatus
}

export async function sendWhatsAppCloudText(input: {
  to: string
  text: string
}): Promise<SendWhatsAppResult> {
  const to = toWhatsAppPhone(input.to)
  if (!to) return { ok: false, error: 'invalid_phone' }

  const response = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, text: input.text }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    provider?: string
    to?: string
    waMessageId?: string | null
    error?: string
    detail?: string
    hint?: string
    configured?: boolean
  }

  if (!response.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || `http_${response.status}`,
      detail: data.detail || data.hint,
      configured: data.configured,
      fallbackSuggested: data.error === 'whatsapp_not_configured' || response.status === 503,
    }
  }

  return {
    ok: true,
    provider: 'meta_cloud',
    to: data.to || to,
    waMessageId: data.waMessageId ?? null,
  }
}

/** Envia mensagem personalizada para um cliente via Cloud API. */
export async function sendClientWhatsAppCloud(client: Client, template: string) {
  const text = personalizeMessage(template, client)
  return sendWhatsAppCloudText({ to: client.whatsapp, text })
}

import type { InboundWhatsAppEvent } from '../types'

export async function fetchInboundMessages(pendingOnly = true): Promise<InboundWhatsAppEvent[]> {
  const response = await fetch(`/api/inbound-messages?pending=${pendingOnly ? '1' : '0'}`)
  if (!response.ok) {
    throw new Error(`inbound_fetch_failed_${response.status}`)
  }
  const data = (await response.json()) as { events?: InboundWhatsAppEvent[] }
  return Array.isArray(data.events) ? data.events : []
}

/** Long-poll: retorna assim que houver pendentes (ou no timeout). */
export async function waitInboundMessages(
  timeoutMs = 8000,
  signal?: AbortSignal,
): Promise<InboundWhatsAppEvent[]> {
  const response = await fetch(`/api/inbound-messages/wait?timeoutMs=${timeoutMs}`, { signal })
  if (!response.ok) {
    throw new Error(`inbound_wait_failed_${response.status}`)
  }
  const data = (await response.json()) as { events?: InboundWhatsAppEvent[] }
  return Array.isArray(data.events) ? data.events : []
}

export async function ackInboundMessages(ids: string[]): Promise<void> {
  if (!ids.length) return
  await fetch('/api/inbound-messages/ack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

export async function mockInboundWhatsAppMessage(input: {
  fromPhone: string
  text: string
  contactName?: string
  mockSecret?: string
}): Promise<{ ok: boolean; events?: InboundWhatsAppEvent[]; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (input.mockSecret) {
    headers['x-voltazap-mock-secret'] = input.mockSecret
  }

  const response = await fetch('/api/webhooks/whatsapp/mock', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fromPhone: input.fromPhone,
      text: input.text,
      contactName: input.contactName,
    }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    events?: InboundWhatsAppEvent[]
    error?: string
    hint?: string
  }

  if (!response.ok) {
    return {
      ok: false,
      error: data.hint ? `${data.error || 'erro'}: ${data.hint}` : data.error || `http_${response.status}`,
    }
  }

  return { ok: true, events: data.events }
}

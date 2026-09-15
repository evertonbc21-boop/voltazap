import { sendClientWhatsApp } from '../lib/whatsapp'
import type { Client } from '../types'

export async function sendCampaignMessages(payload: {
  clients: Client[]
  template: string
}) {
  const first = payload.clients[0]
  if (!first) return { queued: false, provider: 'whatsapp-web' as const }
  sendClientWhatsApp(first, payload.template)
  return { queued: true, provider: 'whatsapp-web' as const, remaining: payload.clients.slice(1) }
}

export async function suggestMessage(_context: { audience: string }) {
  return { provider: 'mock' as const }
}

import { personalizeMessage } from '../data/mock'
import { sendClientWhatsApp } from '../lib/whatsapp'
import { sendClientWhatsAppCloud } from './whatsappCloud'
import type { Client } from '../types'

export type CampaignSendResult = {
  queued: boolean
  provider: 'meta_cloud' | 'whatsapp-web'
  remaining: Client[]
  sent?: Array<{ clientId: string; waMessageId: string | null; text: string; to: string }>
  error?: string
}

/**
 * Envia campanha: tenta Cloud API para todos; se não configurada, abre wa.me no primeiro.
 */
export async function sendCampaignMessages(payload: {
  clients: Client[]
  template: string
}): Promise<CampaignSendResult> {
  if (!payload.clients.length) {
    return { queued: false, provider: 'whatsapp-web', remaining: [] }
  }

  const firstCloud = await sendClientWhatsAppCloud(payload.clients[0], payload.template)

  if (!firstCloud.ok && (firstCloud.fallbackSuggested || firstCloud.error === 'whatsapp_not_configured')) {
    const first = payload.clients[0]
    sendClientWhatsApp(first, payload.template)
    return {
      queued: true,
      provider: 'whatsapp-web',
      remaining: payload.clients.slice(1),
    }
  }

  if (!firstCloud.ok) {
    return {
      queued: false,
      provider: 'meta_cloud',
      remaining: payload.clients,
      error: firstCloud.detail || firstCloud.error,
    }
  }

  const sent: CampaignSendResult['sent'] = [
    {
      clientId: payload.clients[0].id,
      waMessageId: firstCloud.waMessageId,
      text: personalizeMessage(payload.template, payload.clients[0]),
      to: firstCloud.to,
    },
  ]

  for (const client of payload.clients.slice(1)) {
    const result = await sendClientWhatsAppCloud(client, payload.template)
    if (!result.ok) {
      return {
        queued: true,
        provider: 'meta_cloud',
        remaining: payload.clients.slice(payload.clients.indexOf(client)),
        sent,
        error: result.detail || result.error,
      }
    }
    sent.push({
      clientId: client.id,
      waMessageId: result.waMessageId,
      text: personalizeMessage(payload.template, client),
      to: result.to,
    })
  }

  return { queued: true, provider: 'meta_cloud', remaining: [], sent }
}

export { suggestCampaignMessage as suggestMessage } from './aiSuggest'

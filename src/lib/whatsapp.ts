import type { Client } from '../types'
import { personalizeMessage } from '../data/mock'

export function toWhatsAppPhone(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

export function buildWhatsAppUrl(whatsapp: string, text: string) {
  const phone = toWhatsAppPhone(whatsapp)
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

export function openWhatsAppChat(whatsapp: string, text: string) {
  const url = buildWhatsAppUrl(whatsapp, text)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

export function sendClientWhatsApp(client: Client, template: string) {
  return openWhatsAppChat(client.whatsapp, personalizeMessage(template, client))
}

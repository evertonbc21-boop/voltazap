import { toWhatsAppPhone } from '../lib/whatsapp'
import type { Client } from '../types'

export function normalizeClientPhone(whatsapp: string) {
  return toWhatsAppPhone(whatsapp) || whatsapp.replace(/\D/g, '')
}

export function findClientByPhone(clients: Client[], phone: string | undefined | null) {
  if (!phone) return undefined
  const target = normalizeClientPhone(phone)
  if (!target) return undefined

  return clients.find((client) => {
    const candidate = normalizeClientPhone(client.whatsapp)
    if (!candidate) return false
    if (candidate === target) return true
    return candidate.slice(-11) === target.slice(-11) || candidate.slice(-10) === target.slice(-10)
  })
}

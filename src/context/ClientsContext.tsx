import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AVATAR_COLORS, clients as seedClients, countStatuses } from '../data/mock'
import { findClientByPhone, normalizeClientPhone } from '../lib/phoneMatch'
import type { Client } from '../types'

const STORAGE_KEY = 'voltazap-clients'

interface ClientsContextValue {
  clients: Client[]
  addClient: (input: Omit<Client, 'id' | 'avatarColor'>) => Client
  getClient: (id: string) => Client | undefined
  findByPhone: (phone: string | null | undefined) => Client | undefined
  ensureClientFromWhatsApp: (input: { phone: string; name?: string }) => {
    client: Client
    created: boolean
  }
  statusCounts: ReturnType<typeof countStatuses>
}

const ClientsContext = createContext<ClientsContextValue | null>(null)

function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedClients
    const parsed = JSON.parse(raw) as Client[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seedClients
    return parsed
  } catch {
    return seedClients
  }
}

function formatWhatsAppDisplay(phone: string) {
  const digits = normalizeClientPhone(phone).replace(/\D/g, '')
  const local = digits.startsWith('55') ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return phone
}

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(loadClients)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  }, [clients])

  const value = useMemo<ClientsContextValue>(() => {
    const addClient = (input: Omit<Client, 'id' | 'avatarColor'>) => {
      const client: Client = {
        ...input,
        id: `c-${crypto.randomUUID()}`,
        avatarColor: AVATAR_COLORS[clients.length % AVATAR_COLORS.length],
      }
      setClients((current) => [client, ...current])
      return client
    }

    const findByPhone = (phone: string | null | undefined) => findClientByPhone(clients, phone)

    const ensureClientFromWhatsApp = (input: { phone: string; name?: string }) => {
      const existing = findClientByPhone(clients, input.phone)
      if (existing) return { client: existing, created: false }

      const client: Client = {
        id: `c-wa-${normalizeClientPhone(input.phone)}`,
        nome: (input.name || '').trim() || `WhatsApp ${formatWhatsAppDisplay(input.phone)}`,
        whatsapp: formatWhatsAppDisplay(input.phone),
        ultimoPedido: '—',
        frequenciaMedia: 0,
        produtoFavorito: '—',
        valorMedio: 0,
        quantidadePedidos: 0,
        status: 'proxima_compra',
        avatarColor: AVATAR_COLORS[clients.length % AVATAR_COLORS.length],
      }
      setClients((current) => {
        if (current.some((c) => c.id === client.id || findClientByPhone([c], input.phone))) {
          return current
        }
        return [client, ...current]
      })
      return { client, created: true }
    }

    return {
      clients,
      addClient,
      getClient: (id) => clients.find((c) => c.id === id),
      findByPhone,
      ensureClientFromWhatsApp,
      statusCounts: countStatuses(clients),
    }
  }, [clients])

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (!ctx) throw new Error('useClients must be used within ClientsProvider')
  return ctx
}

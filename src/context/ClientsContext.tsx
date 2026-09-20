import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AVATAR_COLORS, countStatuses } from '../data/mock'
import { useAuth } from './AuthContext'
import {
  clearStoredBusinessId,
  ensureBusinessId,
  fetchClientsForBusiness,
  upsertClientRemote,
} from '../lib/clientsApi'
import { findClientByPhone, normalizeClientPhone } from '../lib/phoneMatch'
import { runDemoCleanupOnce } from '../lib/clearWorkspace'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Client } from '../types'

const STORAGE_KEY = 'voltazap-clients'

interface ClientsContextValue {
  clients: Client[]
  loading: boolean
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
  runDemoCleanupOnce()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Client[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistClients(next: Client[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (error) {
    console.error('voltazap-clients persist failed', error)
  }
}

function buildWhatsAppClient(phone: string, name: string | undefined, colorIndex: number): Client {
  return {
    id: `c-wa-${normalizeClientPhone(phone)}`,
    nome: (name || '').trim() || `WhatsApp ${formatWhatsAppDisplay(phone)}`,
    whatsapp: formatWhatsAppDisplay(phone),
    ultimoPedido: '—',
    frequenciaMedia: 0,
    produtoFavorito: '—',
    valorMedio: 0,
    quantidadePedidos: 0,
    status: 'proxima_compra',
    avatarColor: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length],
  }
}

function hydrateFromStoredReplies(clients: Client[]): Client[] {
  try {
    const raw = localStorage.getItem('voltazap-replies')
    if (!raw) return clients
    const parsed = JSON.parse(raw) as {
      replies?: Array<{ clientId?: string; fromPhone?: string; customerPhone?: string; customerName?: string }>
      messages?: Array<{ clientId?: string; fromPhone?: string }>
    }
    const replies = Array.isArray(parsed.replies) ? parsed.replies : []
    const messages = Array.isArray(parsed.messages) ? parsed.messages : []
    let next = [...clients]
    let changed = false

    for (const row of [...replies, ...messages]) {
      const phone =
        (typeof row.fromPhone === 'string' && row.fromPhone) ||
        ('customerPhone' in row && typeof row.customerPhone === 'string' ? row.customerPhone : '') ||
        ''
      if (!phone) continue
      if (findClientByPhone(next, phone)) continue
      if (row.clientId && next.some((c) => c.id === row.clientId)) continue
      const name =
        'customerName' in row && typeof row.customerName === 'string' ? row.customerName : undefined
      const client = buildWhatsAppClient(phone, name, next.length)
      const withId = row.clientId ? { ...client, id: row.clientId } : client
      next = [withId, ...next]
      changed = true
    }

    if (changed) persistClients(next)
    return next
  } catch {
    return clients
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
  const { user, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<Client[]>(() => hydrateFromStoredReplies(loadClients()))
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const businessIdRef = useRef<string | null>(null)

  useEffect(() => {
    persistClients(clients)
  }, [clients])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    if (authLoading) return

    if (!user) {
      businessIdRef.current = null
      clearStoredBusinessId()
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    // Evita flash/persistência de demo antigo enquanto busca o CRM real
    persistClients([])
    setClients([])

    ;(async () => {
      try {
        const businessId = await ensureBusinessId()
        if (cancelled || !businessId) return
        businessIdRef.current = businessId

        const remote = await fetchClientsForBusiness(businessId)
        if (cancelled) return

        // Fonte da verdade = Supabase (lista vazia no primeiro uso)
        const next = remote ?? []
        persistClients(next)
        setClients(next)
      } catch (error) {
        console.error('supabase clients sync failed', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading])

  const value = useMemo<ClientsContextValue>(() => {
    const syncRemote = (client: Client) => {
      const businessId = businessIdRef.current
      if (!businessId) return
      void upsertClientRemote(client, businessId)
    }

    const addClient = (input: Omit<Client, 'id' | 'avatarColor'>) => {
      const client: Client = {
        ...input,
        id: `c-${crypto.randomUUID()}`,
        avatarColor: AVATAR_COLORS[clients.length % AVATAR_COLORS.length],
      }
      const next = [client, ...clients]
      persistClients(next)
      setClients(next)
      syncRemote(client)
      return client
    }

    const findByPhone = (phone: string | null | undefined) => findClientByPhone(clients, phone)

    const ensureClientFromWhatsApp = (input: { phone: string; name?: string }) => {
      const existing = findClientByPhone(clients, input.phone)
      if (existing) {
        return { client: existing, created: false }
      }

      const client = buildWhatsAppClient(input.phone, input.name, clients.length)
      const next = (() => {
        const current = clients
        if (current.some((c) => c.id === client.id || findClientByPhone([c], input.phone))) {
          return current
        }
        return [client, ...current]
      })()
      persistClients(next)
      setClients(next)
      syncRemote(client)
      return { client, created: true }
    }

    return {
      clients,
      loading,
      addClient,
      getClient: (id) => clients.find((c) => c.id === id),
      findByPhone,
      ensureClientFromWhatsApp,
      statusCounts: countStatuses(clients),
    }
  }, [clients, loading])

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (!ctx) throw new Error('useClients must be used within ClientsProvider')
  return ctx
}

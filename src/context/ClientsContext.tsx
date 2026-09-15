import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AVATAR_COLORS, clients as seedClients, countStatuses } from '../data/mock'
import type { Client } from '../types'

const STORAGE_KEY = 'voltazap-clients'

interface ClientsContextValue {
  clients: Client[]
  addClient: (input: Omit<Client, 'id' | 'avatarColor'>) => Client
  getClient: (id: string) => Client | undefined
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

    return {
      clients,
      addClient,
      getClient: (id) => clients.find((c) => c.id === id),
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

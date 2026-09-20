import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AudienceKey } from '../types'

const STORAGE_KEY = 'voltazap-last-campaign'

export type CampaignRunStatus = 'concluida' | 'agendada' | 'parcial'

export interface LastCampaign {
  name: string
  audienceKey: AudienceKey
  audienceTitle: string
  audienceCount: number
  messageModeLabel: string
  startedAt: string
  finishedAt: string
  sentBy: string
  status: CampaignRunStatus
  recipientIds: string[]
  creditCost: number
}

interface CampaignContextValue {
  lastCampaign: LastCampaign | null
  saveLastCampaign: (campaign: LastCampaign) => void
  clearLastCampaign: () => void
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

function loadCampaign(): LastCampaign | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LastCampaign
  } catch {
    return null
  }
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [lastCampaign, setLastCampaign] = useState<LastCampaign | null>(() => loadCampaign())

  useEffect(() => {
    try {
      if (lastCampaign) localStorage.setItem(STORAGE_KEY, JSON.stringify(lastCampaign))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [lastCampaign])

  const value = useMemo<CampaignContextValue>(
    () => ({
      lastCampaign,
      saveLastCampaign: setLastCampaign,
      clearLastCampaign: () => setLastCampaign(null),
    }),
    [lastCampaign],
  )

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider')
  return ctx
}

export function formatCampaignDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCampaignLongDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

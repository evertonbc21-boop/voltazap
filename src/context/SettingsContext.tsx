import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BUSINESS } from '../data/mock'

export const SEGMENTS = [
  'Pizzaria',
  'Restaurante',
  'Hamburgueria',
  'Barbearia',
  'Salão de beleza',
  'Clínica',
  'Pet Shop',
  'Outro',
] as const

export type Segment = (typeof SEGMENTS)[number]

export interface BusinessSettings {
  companyName: string
  segment: Segment
  whatsapp: string
}

const STORAGE_KEY = 'voltazap-settings'

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: BUSINESS.company,
  segment: 'Pizzaria',
  whatsapp: '',
}

interface SettingsContextValue {
  settings: BusinessSettings
  saveSettings: (next: BusinessSettings) => void
  restoreSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function loadSettings(): BusinessSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<BusinessSettings>
    return {
      companyName: parsed.companyName?.trim() || DEFAULT_SETTINGS.companyName,
      segment: SEGMENTS.includes(parsed.segment as Segment)
        ? (parsed.segment as Segment)
        : DEFAULT_SETTINGS.segment,
      whatsapp: parsed.whatsapp ?? '',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      saveSettings: (next) =>
        setSettings({
          companyName: next.companyName.trim() || DEFAULT_SETTINGS.companyName,
          segment: next.segment,
          whatsapp: next.whatsapp,
        }),
      restoreSettings: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

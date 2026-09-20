import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getPlan, type PlanId } from '../data/plans'
import { sanitizeCompanyName, sanitizePersonName } from '../lib/businessDisplay'
import { runDemoCleanupOnce } from '../lib/clearWorkspace'

const STORAGE_KEY = 'voltazap-plan'

export interface PlanAccount {
  nome: string
  negocio: string
  whatsapp: string
  email: string
}

interface StoredPlan {
  planId: PlanId
  account: PlanAccount | null
  trialEndsAt: string | null
}

interface PlanContextValue {
  planId: PlanId
  plan: ReturnType<typeof getPlan>
  account: PlanAccount | null
  trialEndsAt: Date | null
  startTrial: (planId: PlanId, account: PlanAccount) => void
  selectPlan: (planId: PlanId) => void
}

const PlanContext = createContext<PlanContextValue | null>(null)

function loadPlan(): StoredPlan {
  runDemoCleanupOnce()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { planId: 'profissional', account: null, trialEndsAt: null }
    const parsed = JSON.parse(raw) as StoredPlan
    if (!parsed.planId) return { planId: 'profissional', account: null, trialEndsAt: null }
    if (!parsed.account) return parsed
    const nome = sanitizePersonName(parsed.account.nome)
    const negocio = sanitizeCompanyName(parsed.account.negocio)
    if (!nome || !negocio) {
      return { ...parsed, account: null }
    }
    return {
      ...parsed,
      account: { ...parsed.account, nome, negocio },
    }
  } catch {
    return { planId: 'profissional', account: null, trialEndsAt: null }
  }
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredPlan>(loadPlan)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<PlanContextValue>(
    () => ({
      planId: state.planId,
      plan: getPlan(state.planId),
      account: state.account,
      trialEndsAt: state.trialEndsAt ? new Date(state.trialEndsAt) : null,
      startTrial: (planId, account) => {
        const ends = new Date()
        ends.setDate(ends.getDate() + 7)
        setState({ planId, account, trialEndsAt: ends.toISOString() })
      },
      selectPlan: (planId) => {
        setState((prev) => ({ ...prev, planId }))
      },
    }),
    [state],
  )

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

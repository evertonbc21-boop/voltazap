import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getPlan, type PlanId } from '../data/plans'
import { sanitizeCompanyName, sanitizePersonName } from '../lib/businessDisplay'
import { runDemoCleanupOnce } from '../lib/clearWorkspace'

const STORAGE_KEY = 'voltazap-plan'

export type SubscriptionStatus = 'trialing' | 'active' | 'expired'

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
  subscriptionStatus: SubscriptionStatus
  subscribedAt: string | null
}

interface PlanContextValue {
  planId: PlanId
  plan: ReturnType<typeof getPlan>
  account: PlanAccount | null
  trialEndsAt: Date | null
  subscriptionStatus: SubscriptionStatus
  subscribedAt: Date | null
  /** true = pode usar o app (teste ativo ou assinatura paga) */
  hasAccess: boolean
  isTrialExpired: boolean
  startTrial: (planId: PlanId, account: PlanAccount) => void
  selectPlan: (planId: PlanId) => void
  activateSubscription: (planId: PlanId) => void
}

const PlanContext = createContext<PlanContextValue | null>(null)

function deriveStatus(stored: Omit<StoredPlan, 'subscriptionStatus'> & { subscriptionStatus?: SubscriptionStatus }): SubscriptionStatus {
  if (stored.subscriptionStatus === 'active') return 'active'
  if (stored.trialEndsAt) {
    const ends = new Date(stored.trialEndsAt).getTime()
    if (!Number.isNaN(ends) && Date.now() > ends) return 'expired'
  }
  if (stored.trialEndsAt) return 'trialing'
  return stored.subscriptionStatus === 'expired' ? 'expired' : 'trialing'
}

function loadPlan(): StoredPlan {
  runDemoCleanupOnce()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        planId: 'profissional',
        account: null,
        trialEndsAt: null,
        subscriptionStatus: 'trialing',
        subscribedAt: null,
      }
    }
    const parsed = JSON.parse(raw) as StoredPlan
    if (!parsed.planId) {
      return {
        planId: 'profissional',
        account: null,
        trialEndsAt: null,
        subscriptionStatus: 'trialing',
        subscribedAt: null,
      }
    }

    let account = parsed.account
    if (account) {
      const nome = sanitizePersonName(account.nome)
      const negocio = sanitizeCompanyName(account.negocio)
      account = !nome || !negocio ? null : { ...account, nome, negocio }
    }

    const base = {
      planId: parsed.planId,
      account,
      trialEndsAt: parsed.trialEndsAt ?? null,
      subscribedAt: parsed.subscribedAt ?? null,
      subscriptionStatus: parsed.subscriptionStatus,
    }

    return {
      ...base,
      subscriptionStatus: deriveStatus(base),
    }
  } catch {
    return {
      planId: 'profissional',
      account: null,
      trialEndsAt: null,
      subscriptionStatus: 'trialing',
      subscribedAt: null,
    }
  }
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredPlan>(loadPlan)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Reavalia expiração do teste a cada minuto
  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const nextStatus = deriveStatus(prev)
        if (nextStatus === prev.subscriptionStatus) return prev
        return { ...prev, subscriptionStatus: nextStatus }
      })
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo<PlanContextValue>(() => {
    const status = deriveStatus(state)
    const hasAccess = status === 'active' || status === 'trialing'

    return {
      planId: state.planId,
      plan: getPlan(state.planId),
      account: state.account,
      trialEndsAt: state.trialEndsAt ? new Date(state.trialEndsAt) : null,
      subscriptionStatus: status,
      subscribedAt: state.subscribedAt ? new Date(state.subscribedAt) : null,
      hasAccess,
      isTrialExpired: status === 'expired',
      startTrial: (planId, account) => {
        const ends = new Date()
        ends.setDate(ends.getDate() + 7)
        setState({
          planId,
          account,
          trialEndsAt: ends.toISOString(),
          subscriptionStatus: 'trialing',
          subscribedAt: null,
        })
      },
      selectPlan: (planId) => {
        setState((prev) => ({ ...prev, planId }))
      },
      activateSubscription: (planId) => {
        setState((prev) => ({
          ...prev,
          planId,
          subscriptionStatus: 'active',
          subscribedAt: new Date().toISOString(),
        }))
      },
    }
  }, [state])

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { getPlan, type PlanId } from '../data/plans'
import { usePlan } from '../context/PlanContext'

function isPlanId(value: string | null): value is PlanId {
  return value === 'essencial' || value === 'profissional' || value === 'premium'
}

export function SubscribeSuccessPage() {
  const [params] = useSearchParams()
  const { activateSubscription, planId, plan } = usePlan()
  const requested = params.get('plan')
  const demo = params.get('demo') === '1'
  const activePlanId = isPlanId(requested) ? requested : planId
  const activePlan = useMemo(() => getPlan(activePlanId), [activePlanId])

  useEffect(() => {
    activateSubscription(activePlanId)
  }, [activePlanId, activateSubscription])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Assinatura ativada!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Plano <strong>{activePlan.name}</strong> liberado
          {demo ? ' (modo demonstração — configure o checkout real depois)' : ''}.
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Seu plano atual no app: {plan.name}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  )
}

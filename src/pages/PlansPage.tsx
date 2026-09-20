import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { PLANS, formatPlanPrice } from '../data/plans'
import { SignupPlanModal } from '../components/SignupPlanModal'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../context/PlanContext'
import type { PlanId } from '../data/plans'

export function PlansPage() {
  const { planId, account, selectPlan } = usePlan()
  const { user } = useAuth()
  const [signupPlan, setSignupPlan] = useState<PlanId | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  /** Já tem conta/sessão: só troca o plano. Senão: abre cadastro. */
  const canSwitchPlan = Boolean(user || account)

  function handleChoosePlan(nextId: PlanId) {
    const name = PLANS.find((p) => p.id === nextId)?.name ?? 'plano'

    // Sempre atualiza o plano selecionado (feedback imediato no card "Atual")
    selectPlan(nextId)

    if (!canSwitchPlan) {
      setSignupPlan(nextId)
      return
    }

    setToast(`Plano ${name} selecionado.`)
    window.setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="space-y-6">
      <header className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Planos</h2>
        <p className="mt-1 text-slate-500">
          Escolha o plano certo para reativar seus clientes. Teste grátis por 7 dias.
        </p>
      </header>

      {toast ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
        >
          {toast}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan.id === planId
          return (
            <article
              key={plan.id}
              role="button"
              tabIndex={0}
              onClick={() => handleChoosePlan(plan.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleChoosePlan(plan.id)
                }
              }}
              className={`relative flex cursor-pointer flex-col rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:border-brand/50 ${
                current
                  ? 'border-brand ring-2 ring-brand/20'
                  : plan.popular
                    ? 'border-brand/40 ring-1 ring-brand/10'
                    : 'border-slate-100'
              }`}
            >
              {plan.popular && !current ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white">
                  ★ MAIS POPULAR
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-3xl font-extrabold text-slate-900">
                    {formatPlanPrice(plan.price).replace('/mês', '')}
                    <span className="text-sm font-medium text-slate-400">/mês</span>
                  </p>
                </div>
                {current ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                    Atual
                  </span>
                ) : null}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleChoosePlan(plan.id)
                }}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold ${
                  current
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : plan.popular
                      ? 'bg-brand text-white shadow-lg shadow-brand/20 hover:bg-brand-dark'
                      : 'border border-slate-200 text-slate-700 hover:border-brand hover:text-brand'
                }`}
              >
                {canSwitchPlan
                  ? current
                    ? 'Plano atual'
                    : 'Escolher este plano'
                  : 'Começar agora'}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
                <Sparkles size={12} />
                Teste grátis por 7 dias
              </p>
            </article>
          )
        })}
      </section>
      <SignupPlanModal planId={signupPlan} onClose={() => setSignupPlan(null)} />
    </div>
  )
}

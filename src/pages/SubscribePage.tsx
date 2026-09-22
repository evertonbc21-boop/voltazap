import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, CreditCard, Sparkles } from 'lucide-react'
import { PLANS, formatPlanPrice, type PlanId } from '../data/plans'
import { usePlan } from '../context/PlanContext'
import { getCheckoutUrl, startCheckout } from '../lib/checkout'
import { trialDaysLeft } from '../lib/onboarding'

export function SubscribePage() {
  const { planId, selectPlan, activateSubscription, trialEndsAt, isTrialExpired, hasAccess } = usePlan()
  const [selected, setSelected] = useState<PlanId>(planId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const canceled = params.get('cancelado') === '1'
  const daysLeft = trialDaysLeft(trialEndsAt)

  const selectedPlan = useMemo(() => PLANS.find((p) => p.id === selected) ?? PLANS[1], [selected])

  async function handleSubscribe() {
    setBusy(true)
    setError('')
    selectPlan(selected)

    const result = await startCheckout(selected)
    if (result.demo) {
      activateSubscription(selected)
      window.location.assign(`/assinar/sucesso?plan=${selected}&demo=1`)
      return
    }
    if (!result.ok) {
      setBusy(false)
      setError(
        result.error ||
          'Configure os links de checkout (Wix/Stripe) nas variáveis de ambiente para cobrar de verdade.',
      )
      return
    }
    // redirect em andamento
  }

  if (hasAccess && !isTrialExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Sua conta já está liberada</h1>
          <p className="mt-2 text-sm text-slate-500">
            {daysLeft != null && daysLeft > 0
              ? `Ainda restam ${daysLeft} dia(s) de teste, ou você já assinou.`
              : 'Você já pode usar o VoltaZap normalmente.'}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <img
            src="/voltazap-logo-full.png"
            alt="VoltaZap"
            className="mx-auto mb-6 h-auto w-full max-w-[200px] object-contain"
          />
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">Assinatura</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {isTrialExpired ? 'Seu teste grátis acabou' : 'Escolha seu plano'}
          </h1>
          <p className="mt-2 text-slate-500">
            {isTrialExpired
              ? 'Para continuar reativando clientes, escolha um plano e finalize o pagamento.'
              : 'Assine quando quiser. A cobrança é mensal e pode ser cancelada depois.'}
          </p>
          {canceled ? (
            <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Pagamento cancelado. Você pode tentar de novo quando quiser.
            </p>
          ) : null}
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const active = plan.id === selected
            const hasLink = Boolean(getCheckoutUrl(plan.id))
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                className={`flex flex-col rounded-2xl border bg-white p-6 text-left shadow-sm transition ${
                  active ? 'border-brand ring-2 ring-brand/20' : 'border-slate-100 hover:border-brand/40'
                }`}
              >
                {plan.popular ? (
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                    <Sparkles size={12} /> Mais popular
                  </span>
                ) : (
                  <span className="mb-3 h-6" />
                )}
                <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {formatPlanPrice(plan.price).replace('/mês', '')}
                  <span className="text-sm font-medium text-slate-400">/mês</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-400">
                  {hasLink ? 'Checkout configurado' : 'Usará Stripe ou modo demo'}
                </p>
              </button>
            )
          })}
        </section>

        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Plano selecionado: <strong>{selectedPlan.name}</strong> · {formatPlanPrice(selectedPlan.price)}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSubscribe()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            <CreditCard size={16} />
            {busy ? 'Abrindo checkout…' : 'Ir para o pagamento'}
          </button>
          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
          <p className="mt-3 text-center text-xs text-slate-400">
            Pagamento seguro. Domínio: www.voltazap.com.br
          </p>
        </div>
      </div>
    </div>
  )
}

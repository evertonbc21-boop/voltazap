import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useClients } from '../context/ClientsContext'
import { useSettings, SEGMENTS, type Segment } from '../context/SettingsContext'
import {
  loadOnboarding,
  markOnboardingDone,
  saveOnboarding,
  type OnboardingStep,
} from '../lib/onboarding'

function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function OnboardingCard() {
  const { user } = useAuth()
  const { settings, saveSettings } = useSettings()
  const { clients } = useClients()
  const userId = user?.id ?? null

  const [hidden, setHidden] = useState(() => loadOnboarding(userId).done)
  const [step, setStep] = useState<OnboardingStep>(() => loadOnboarding(userId).step)
  const [companyName, setCompanyName] = useState(settings.companyName)
  const [segment, setSegment] = useState<Segment>(settings.segment)
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp)
  const [error, setError] = useState('')

  useEffect(() => {
    const state = loadOnboarding(userId)
    setHidden(state.done)
    setStep(state.step)
  }, [userId])

  useEffect(() => {
    setCompanyName(settings.companyName)
    setSegment(settings.segment)
    setWhatsapp(settings.whatsapp)
  }, [settings.companyName, settings.segment, settings.whatsapp])

  useEffect(() => {
    if (hidden) return
    if (settings.companyName.trim() && settings.whatsapp.replace(/\D/g, '').length >= 10 && clients.length > 0) {
      markOnboardingDone(userId)
      setHidden(true)
    }
  }, [hidden, settings.companyName, settings.whatsapp, clients.length, userId])

  if (hidden) return null

  function goTo(next: OnboardingStep) {
    setStep(next)
    saveOnboarding(userId, { done: false, step: next })
  }

  function finish() {
    markOnboardingDone(userId)
    setHidden(true)
  }

  function saveStep1() {
    if (!companyName.trim()) {
      setError('Informe o nome do seu negócio.')
      return
    }
    setError('')
    saveSettings({ ...settings, companyName: companyName.trim(), segment })
    goTo(2)
  }

  function saveStep2() {
    if (whatsapp.replace(/\D/g, '').length < 10) {
      setError('Informe um WhatsApp válido com DDD.')
      return
    }
    setError('')
    saveSettings({ ...settings, whatsapp: formatPhone(whatsapp) })
    goTo(3)
  }

  return (
    <section className="rounded-2xl border border-brand/20 bg-gradient-to-br from-rose-50 via-white to-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">Primeiros passos</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Configure sua conta em 3 passos</h3>
          <p className="mt-1 text-sm text-slate-500">Assim você já pode cadastrar clientes e disparar campanhas.</p>
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-sm font-medium text-slate-400 hover:text-slate-600"
        >
          Pular por agora
        </button>
      </div>

      <ol className="mt-5 flex flex-wrap gap-2">
        {[
          { n: 1 as const, label: 'Negócio' },
          { n: 2 as const, label: 'WhatsApp' },
          { n: 3 as const, label: 'Clientes' },
        ].map((item) => {
          const done = step > item.n
          const active = step === item.n
          return (
            <li
              key={item.n}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                active
                  ? 'bg-brand text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {done ? <Check size={12} /> : <span>{item.n}</span>}
              {item.label}
            </li>
          )
        })}
      </ol>

      <div className="mt-5 rounded-xl border border-slate-100 bg-white p-4">
        {step === 1 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              Nome do negócio
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex.: Pizzaria do Guto"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Segmento
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as Segment)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
              >
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <button
              type="button"
              onClick={saveStep1}
              className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Continuar
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              WhatsApp do estabelecimento
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                placeholder="(11) 98765-4321"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand"
              />
            </label>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => goTo(1)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={saveStep2}
                className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Continuar
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Cadastre seus clientes (um a um ou por planilha CSV). Sem clientes, as campanhas ficam vazias.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => goTo(2)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300"
              >
                Voltar
              </button>
              <Link
                to="/clientes"
                onClick={finish}
                className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Ir para Clientes
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

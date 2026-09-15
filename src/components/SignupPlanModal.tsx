import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { addDays, formatPlanPrice, formatTrialDate, getPlan, type PlanId } from '../data/plans'
import { usePlan } from '../context/PlanContext'

interface SignupPlanModalProps {
  planId: PlanId | null
  onClose: () => void
}

const empty = {
  nome: '',
  negocio: '',
  whatsapp: '',
  email: '',
  senha: '',
}

export function SignupPlanModal({ planId, onClose }: SignupPlanModalProps) {
  const navigate = useNavigate()
  const { startTrial } = usePlan()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [trialEnd, setTrialEnd] = useState<Date | null>(null)

  if (!planId) return null
  const selectedPlanId = planId
  const plan = getPlan(selectedPlanId)

  function close() {
    setForm(empty)
    setError('')
    setStep('form')
    setTrialEnd(null)
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.nome.trim() || !form.negocio.trim() || !form.email.trim() || !form.senha.trim()) {
      setError('Preencha todos os campos.')
      return
    }
    if (form.whatsapp.replace(/\D/g, '').length < 10) {
      setError('Informe um WhatsApp válido com DDD.')
      return
    }
    if (form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    startTrial(selectedPlanId, {
      nome: form.nome.trim(),
      negocio: form.negocio.trim(),
      whatsapp: form.whatsapp,
      email: form.email.trim(),
    })
    setTrialEnd(addDays(new Date(), 7))
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {step === 'form' ? 'Começar agora' : 'Seu teste grátis começou! 🎉'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {step === 'form'
                ? `Cadastre-se para testar o plano ${plan.name} por 7 dias.`
                : 'Nenhum pagamento agora. A cobrança começa depois do teste.'}
            </p>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-slate-700">
              Plano escolhido: <strong>{plan.name}</strong> · {formatPlanPrice(plan.price)} · 7 dias grátis
            </div>
            <Field label="Nome" value={form.nome} onChange={(nome) => setForm({ ...form, nome })} placeholder="Seu nome" />
            <Field
              label="Nome do negócio"
              value={form.negocio}
              onChange={(negocio) => setForm({ ...form, negocio })}
              placeholder="Pizzaria do Guto"
            />
            <Field
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(whatsapp) => setForm({ ...form, whatsapp: formatPhone(whatsapp) })}
              placeholder="(11) 98765-4321"
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
              placeholder="voce@email.com"
            />
            <Field
              label="Senha"
              type="password"
              value={form.senha}
              onChange={(senha) => setForm({ ...form, senha })}
              placeholder="Mínimo 6 caracteres"
            />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <button type="submit" className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark">
              Continuar
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <Row label="Plano escolhido" value={`${plan.name} · ${formatPlanPrice(plan.price)}`} />
              <Row label="Período" value="7 dias grátis" />
              <Row label="Término do teste" value={trialEnd ? formatTrialDate(trialEnd) : ''} />
              <Row label="Após o teste" value={`${formatPlanPrice(plan.price)} (sem cobrança agora)`} />
            </dl>
            <button
              type="button"
              onClick={() => {
                close()
                navigate('/')
              }}
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Ir para o Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

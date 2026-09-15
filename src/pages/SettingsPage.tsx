import { Link } from 'react-router-dom'
import { BUSINESS } from '../data/mock'
import { usePlan } from '../context/PlanContext'

export function SettingsPage() {
  const { plan } = usePlan()
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Configurações</h2>
        <p className="mt-1 text-slate-500">Para testar o envio, cadastre seu WhatsApp real em Clientes e clique em Enviar.</p>
      </header>
      <section className="max-w-xl space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <Field label="Nome do negócio" value={BUSINESS.company} />
        <Field label="Segmento" value="Pizzaria" />
        <Field label="Plano" value={`Plano ${plan.name}`} />
        <Link
          to="/planos"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
        >
          Ver planos
        </Link>
        <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          O VoltaZap abre o WhatsApp Web/app com a mensagem pronta. Ainda não há API oficial da Meta: você confirma o envio no próprio WhatsApp.
        </p>
        <p className="text-xs text-slate-400">
          Arquitetura pronta para adaptar a barbearias, salões, clínicas e pet shops.
        </p>
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <input
        defaultValue={value}
        readOnly
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
      />
    </label>
  )
}

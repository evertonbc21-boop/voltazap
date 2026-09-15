import { BUSINESS } from '../data/mock'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Configurações</h2>
        <p className="mt-1 text-slate-500">Dados do negócio demonstrativo. Integrações reais virão depois.</p>
      </header>
      <section className="max-w-xl space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <Field label="Nome do negócio" value={BUSINESS.company} />
        <Field label="Segmento" value="Pizzaria" />
        <Field label="Plano" value={BUSINESS.plan} />
        <Field label="WhatsApp" value="Integração futura" />
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

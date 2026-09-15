import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { usePlan } from '../context/PlanContext'
import { SEGMENTS, useSettings, type BusinessSettings, type Segment } from '../context/SettingsContext'

export function SettingsPage() {
  const { plan } = usePlan()
  const { settings, saveSettings, restoreSettings } = useSettings()
  const [form, setForm] = useState<BusinessSettings>(settings)
  const [toast, setToast] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testSent, setTestSent] = useState(false)
  const [testError, setTestError] = useState('')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  function handleSave() {
    if (!form.companyName.trim()) {
      setToast('Informe o nome do negócio.')
      return
    }
    saveSettings(form)
    setToast('Configurações salvas com sucesso! ✅')
  }

  function handleRestore() {
    const ok = window.confirm('Deseja restaurar as configurações?')
    if (!ok) return
    restoreSettings()
    setToast('Configurações restauradas.')
  }

  function openTestModal() {
    setTestPhone(form.whatsapp)
    setTestSent(false)
    setTestError('')
    setTestOpen(true)
  }

  function sendTest() {
    const digits = testPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setTestError('Informe um WhatsApp válido com DDD.')
      setTestSent(false)
      return
    }
    setForm((current) => ({ ...current, whatsapp: formatPhone(testPhone) }))
    setTestError('')
    setTestSent(true)
  }

  return (
    <div className="w-full min-w-0 max-w-2xl space-y-6">
      <header className="min-w-0">
        <h2 className="text-2xl font-bold break-words text-slate-900 md:text-3xl">Configurações</h2>
        <p className="mt-1 text-sm leading-relaxed break-words text-slate-500 sm:text-base">
          Para testar o envio, cadastre seu WhatsApp real em Clientes e clique em Enviar.
        </p>
      </header>
      <section className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-600">Nome do negócio</span>
          <input
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand"
          />
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-600">Segmento</span>
          <select
            value={form.segment}
            onChange={(e) => setForm({ ...form, segment: e.target.value as Segment })}
            className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand"
          >
            {SEGMENTS.map((segment) => (
              <option key={segment} value={segment}>
                {segment}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-600">Plano</span>
          <input
            value={`Plano ${plan.name}`}
            readOnly
            className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          />
        </label>
        <Link
          to="/planos"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
        >
          Gerenciar plano
        </Link>

        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-600">WhatsApp</span>
          <input
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: formatPhone(e.target.value) })}
            placeholder="(11) 98765-4321"
            className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand"
          />
        </label>
        <button
          type="button"
          onClick={openTestModal}
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
        >
          Testar conexão
        </button>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Salvar alterações
          </button>
          <button
            type="button"
            onClick={handleRestore}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
          >
            Restaurar
          </button>
        </div>

        {toast ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm leading-relaxed break-words text-emerald-800">
            {toast}
          </p>
        ) : (
          <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm leading-relaxed break-words text-emerald-800">
            O VoltaZap abre o WhatsApp Web/app com a mensagem pronta. Ainda não há API oficial da Meta: você confirma o
            envio no próprio WhatsApp.
          </p>
        )}
        <p className="text-xs leading-relaxed break-words text-slate-400">
          Arquitetura pronta para adaptar a barbearias, salões, clínicas e pet shops.
        </p>
      </section>

      {testOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTestOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Testar conexão</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Digite seu número de WhatsApp para receber uma mensagem de teste.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-600">
              WhatsApp
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(formatPhone(e.target.value))}
                placeholder="(11) 98765-4321"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
              />
            </label>
            {testError ? <p className="mt-2 text-sm text-red-500">{testError}</p> : null}
            {testSent ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                Mensagem de teste enviada com sucesso! ✅
              </p>
            ) : null}
            <button
              type="button"
              onClick={sendTest}
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Enviar teste
            </button>
          </div>
        </div>
      ) : null}
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

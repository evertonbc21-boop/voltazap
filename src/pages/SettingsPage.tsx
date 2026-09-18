import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { usePlan } from '../context/PlanContext'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { SEGMENTS, useSettings, type BusinessSettings, type Segment } from '../context/SettingsContext'
import { findClientByPhone } from '../lib/phoneMatch'
import { toWhatsAppPhone } from '../lib/whatsapp'
import { mockInboundWhatsAppMessage } from '../services/whatsappInbound'
import {
  fetchWhatsAppCloudStatus,
  fetchWhatsAppDiagnostics,
  repairWhatsAppSubscription,
  sendWhatsAppCloudText,
  type WhatsAppCloudStatus,
  type WhatsAppDiagnostics,
} from '../services/whatsappCloud'
import type { ReplyOutcome } from '../types'

export function SettingsPage() {
  const { plan } = usePlan()
  const { clients } = useClients()
  const { registerReply, ingestInboundReply } = useMessages()
  const { settings, saveSettings, restoreSettings } = useSettings()
  const [form, setForm] = useState<BusinessSettings>(settings)
  const [toast, setToast] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testSent, setTestSent] = useState(false)
  const [testError, setTestError] = useState('')
  const [mockPhone, setMockPhone] = useState('')
  const [mockText, setMockText] = useState('Quero! Pode mandar uma pizza grande. R$ 68')
  const [mockBusy, setMockBusy] = useState(false)
  const [mockHint, setMockHint] = useState('')
  const [cloudStatus, setCloudStatus] = useState<WhatsAppCloudStatus | null>(null)
  const [diagnostics, setDiagnostics] = useState<WhatsAppDiagnostics | null>(null)
  const [diagBusy, setDiagBusy] = useState(false)
  const [diagHint, setDiagHint] = useState('')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  useEffect(() => {
    void fetchWhatsAppCloudStatus().then(setCloudStatus)
    void fetchWhatsAppDiagnostics().then(setDiagnostics)
  }, [])

  async function runRepairSubscription() {
    setDiagBusy(true)
    setDiagHint('')
    try {
      const result = await repairWhatsAppSubscription()
      setDiagnostics(result.report || result)
      setDiagHint(
        result.ok
          ? 'Inscrição no WABA reparada. Envie “oi” do celular e aguarde alguns segundos.'
          : `Falha ao reparar: ${JSON.stringify(result.repair || result.issues || result)}`,
      )
    } catch (error) {
      setDiagHint(error instanceof Error ? error.message : 'Erro ao reparar inscrição')
    } finally {
      setDiagBusy(false)
    }
  }

  async function refreshDiagnostics() {
    setDiagBusy(true)
    try {
      const report = await fetchWhatsAppDiagnostics()
      setDiagnostics(report)
    } finally {
      setDiagBusy(false)
    }
  }

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

  async function sendTest() {
    const digits = testPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setTestError('Informe um WhatsApp válido com DDD.')
      setTestSent(false)
      return
    }
    const formatted = formatPhone(testPhone)
    setForm((current) => ({ ...current, whatsapp: formatted }))
    setTestError('')
    const text = `Olá! Esta é uma mensagem de teste do VoltaZap para ${form.companyName || 'seu negócio'}. ✅`

    const cloud = await sendWhatsAppCloudText({ to: testPhone, text })
    if (cloud.ok) {
      setTestSent(true)
      setToast('Teste enviado pela Cloud API.')
      return
    }

    const phone = toWhatsAppPhone(testPhone)
    if (!phone) {
      setTestError('Telefone inválido.')
      return
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    setTestSent(true)
    if (cloud.fallbackSuggested) {
      setToast('Cloud API não configurada — abriu WhatsApp Web.')
    } else {
      setTestError(cloud.detail || cloud.error)
    }
  }

  async function runMockInbound() {
    setMockBusy(true)
    setMockHint('')
    const phone = mockPhone || form.whatsapp
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setMockHint('Informe um telefone com DDD (de um cliente cadastrado).')
      setMockBusy(false)
      return
    }
    if (!mockText.trim()) {
      setMockHint('Digite o texto da mensagem simulada.')
      setMockBusy(false)
      return
    }

    try {
      const result = await mockInboundWhatsAppMessage({
        fromPhone: phone,
        text: mockText.trim(),
        contactName: 'Cliente mock',
      })

      if (result.ok && result.events?.length) {
        const event = result.events.find((e) => e.kind === 'message') || result.events[0]
        const client = findClientByPhone(clients, event.fromPhone || phone)
        if (client && event) {
          ingestInboundReply({
            clientId: client.id,
            clientName: client.nome,
            reply: event.text || mockText.trim(),
            outcome: (event.analysis?.outcome || 'interessado') as ReplyOutcome,
            orderValue: event.analysis?.orderValue,
            source: 'mock',
            intent: event.analysis?.intent,
            fromPhone: event.fromPhone,
            waMessageId: event.waMessageId,
            conversationStatus: event.analysis?.conversationStatus,
            receivedAtIso: event.receivedAt,
          })
        }
        setMockHint(
          client
            ? 'Mensagem mock registrada! Veja Resultados / Mensagens / Relatórios.'
            : 'Evento salvo no webhook, mas nenhum cliente bateu com esse telefone. Cadastre o número em Clientes.',
        )
      } else {
        const client = findClientByPhone(clients, phone)
        if (!client) {
          setMockHint(
            `${result.error || 'API indisponível'}. Cadastre um cliente com este WhatsApp para o fallback local.`,
          )
        } else {
          registerReply({
            clientId: client.id,
            clientName: client.nome,
            reply: mockText.trim(),
            outcome: /quero|pedi|manda|r\$/i.test(mockText) ? 'pedido_realizado' : 'interessado',
            orderValue: extractValue(mockText),
            source: 'mock',
            intent: 'mock_local',
            fromPhone: phone,
            conversationStatus: 'replied',
          })
          setMockHint('API offline — registrado localmente (fallback). Com `vercel dev` ou produção, usa o webhook.')
        }
      }
    } catch {
      const client = findClientByPhone(clients, phone)
      if (client) {
        registerReply({
          clientId: client.id,
          clientName: client.nome,
          reply: mockText.trim(),
          outcome: /quero|pedi|manda|r\$/i.test(mockText) ? 'pedido_realizado' : 'interessado',
          orderValue: extractValue(mockText),
          source: 'mock',
          intent: 'mock_local',
          fromPhone: phone,
        })
        setMockHint('API offline — registrado localmente (fallback).')
      } else {
        setMockHint('Falha ao simular. Confira o telefone do cliente.')
      }
    } finally {
      setMockBusy(false)
    }
  }

  const webhookUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp'

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
            {cloudStatus?.configured
              ? 'WhatsApp Cloud API conectada: campanhas e conversas enviam pela Meta. Respostas entram em Mensagens e Resultados.'
              : 'Defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID na Vercel para enviar pela API. Sem isso, o VoltaZap usa wa.me como fallback.'}
          </p>
        )}
        <p className="text-xs leading-relaxed break-words text-slate-400">
          Arquitetura pronta para adaptar a barbearias, salões, clínicas e pet shops.
        </p>
      </section>

      <section className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">WhatsApp Cloud API (Meta)</h3>
          <p className="mt-1 text-sm text-slate-500">
            Configure o webhook na Meta e as variáveis de envio na Vercel para conversas completas (enviar + receber).
          </p>
          <p
            className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
              cloudStatus?.configured
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {cloudStatus == null
              ? 'Checando conexão…'
              : cloudStatus.configured
                ? '✓ Envio Cloud API pronto'
                : '⚠ Envio Cloud API pendente (faltam token e/ou phone number id)'}
          </p>
        </div>

        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-600">Callback URL do webhook</span>
          <input
            readOnly
            value={webhookUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-700 sm:text-sm"
          />
        </label>

        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
          <li>
            <code className="rounded bg-slate-100 px-1">VERIFY_TOKEN</code> → Verify token na Meta
            {cloudStatus?.hasVerifyToken ? ' ✓' : ''}
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">WHATSAPP_ACCESS_TOKEN</code> → token permanente da Meta
            {cloudStatus?.hasToken ? ' ✓' : ''}
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">WHATSAPP_PHONE_NUMBER_ID</code> → ID do número
            {cloudStatus?.hasPhoneNumberId ? ' ✓' : ''}
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">WHATSAPP_BUSINESS_ACCOUNT_ID</code> → WABA (inscrição webhook)
          </li>
          <li>
            Opcional: <code className="rounded bg-slate-100 px-1">WHATSAPP_APP_SECRET</code>
            {cloudStatus?.hasAppSecret ? ' ✓' : ''}
          </li>
        </ul>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Diagnóstico ponta a ponta</h4>
          <p className="mt-1 text-xs text-slate-500">
            Verifica se a Meta está inscrita no WABA e se o webhook chegou neste servidor.
          </p>
          {diagnostics?.issues?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {diagnostics.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-emerald-700">
              {diagnostics?.healthy ? '✓ Sem problemas detectados no servidor.' : 'Carregando diagnóstico…'}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Última msg no servidor:{' '}
            {diagnostics?.lastInboundMessageAt
              ? `${diagnostics.lastInboundMessageAt}${
                  diagnostics.minutesSinceLastInboundMessage != null
                    ? ` (${diagnostics.minutesSinceLastInboundMessage} min atrás)`
                    : ''
                }`
              : 'nenhuma'}
          </p>
          {diagHint ? <p className="mt-2 text-sm text-slate-700">{diagHint}</p> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={diagBusy}
              onClick={() => void refreshDiagnostics()}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-60"
            >
              Atualizar diagnóstico
            </button>
            <button
              type="button"
              disabled={diagBusy}
              onClick={() => void runRepairSubscription()}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {diagBusy ? 'Reparando…' : 'Reparar inscrição Meta'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 p-4">
          <h4 className="text-sm font-semibold text-slate-800">Modo teste / mock</h4>
          <p className="mt-1 text-xs text-slate-500">
            Simula uma mensagem recebida como se viesse da Meta. Use o WhatsApp de um cliente cadastrado.
          </p>
          <label className="mt-3 block text-sm font-medium text-slate-600">
            Telefone do cliente
            <input
              value={mockPhone}
              onChange={(e) => setMockPhone(formatPhone(e.target.value))}
              placeholder={form.whatsapp || '(11) 98765-4321'}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-600">
            Texto da resposta
            <textarea
              value={mockText}
              onChange={(e) => setMockText(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
            />
          </label>
          {mockHint ? <p className="mt-2 text-sm text-slate-600">{mockHint}</p> : null}
          <button
            type="button"
            disabled={mockBusy}
            onClick={() => void runMockInbound()}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {mockBusy ? 'Simulando…' : 'Simular mensagem recebida'}
          </button>
        </div>
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
              onClick={() => void sendTest()}
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

function extractValue(text: string) {
  const match = text.match(/(?:r\$\s*)?(\d{1,5}(?:[.,]\d{2})?)/i)
  if (!match) return undefined
  const num = Number(match[1].replace(',', '.'))
  return Number.isFinite(num) && num > 0 ? num : undefined
}

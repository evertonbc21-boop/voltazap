import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  FileText,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import {
  AUDIENCE_OPTIONS,
  BUSINESS,
  DEFAULT_MESSAGE,
  PIZZA_PROMO_IMAGE,
  personalizeMessage,
} from '../data/mock'
import type { AudienceKey } from '../types'
import { useClients } from '../context/ClientsContext'
import { sendClientWhatsApp } from '../lib/whatsapp'

const audienceIcons: Record<AudienceKey, string> = {
  proxima_compra: '⏰',
  atrasado: '⚠️',
  muito_tempo: '😴',
  personalizado: '👤',
}

export function CampaignsPage() {
  const { clients, getClient, statusCounts } = useClients()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectedId = params.get('clientId')
  const [audience, setAudience] = useState<AudienceKey>(preselectedId ? 'personalizado' : 'proxima_compra')
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedId ? [preselectedId] : [])
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [sendNow, setSendNow] = useState(true)
  const [showVars, setShowVars] = useState(false)
  const [realData, setRealData] = useState(true)
  const [queue, setQueue] = useState<typeof clients>([])
  const [sendError, setSendError] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  useEffect(() => {
    if (preselectedId) {
      setAudience('personalizado')
      setSelectedIds([preselectedId])
    }
  }, [preselectedId])

  const audienceCount = useMemo(() => {
    if (audience === 'personalizado') return selectedIds.length || 0
    if (audience === 'proxima_compra') return statusCounts.proxima_compra
    if (audience === 'atrasado') return statusCounts.atrasado
    return statusCounts.muito_tempo
  }, [audience, selectedIds, statusCounts])

  const previewClient = getClient(selectedIds[0] ?? 'c1') ?? clients[0]
  const previewText = previewClient ? personalizeMessage(message, previewClient) : message

  const recipients = useMemo(() => {
    if (audience === 'personalizado') {
      return clients.filter((c) => selectedIds.includes(c.id))
    }
    return clients.filter((c) => c.status === audience)
  }, [audience, clients, selectedIds])

  function handleSendCampaign() {
    setSendError('')
    if (recipients.length === 0) {
      setSendError('Selecione pelo menos um cliente.')
      return
    }
    if (!sendNow && !scheduledAt) {
      setSendError('Escolha a data e o horário do agendamento.')
      return
    }
    const opened = sendClientWhatsApp(recipients[0], message)
    if (!opened) {
      setSendError('Número de WhatsApp inválido. Cadastre um telefone com DDD.')
      return
    }
    if (recipients.length > 1) {
      setQueue(recipients.slice(1))
      return
    }
    navigate('/resultados')
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Nova Campanha</h2>
          <p className="mt-1 text-slate-500">
            Crie e envie mensagens personalizadas para seus clientes e faça eles voltarem a pedir.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
          <FileText size={16} />
          Modelos de mensagens
        </button>
      </header>

      <ol className="grid gap-3 md:grid-cols-3">
        <Step n={1} title="Público" subtitle="Quem vai receber" active />
        <Step n={2} title="Mensagem" subtitle="Personalize ou use a sugestão da IA" />
        <Step n={3} title="Revisar" subtitle="Confira e envie" />
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">1. Selecione o público</h3>
            <p className="mb-4 text-sm text-slate-400">Escolha quais clientes vão receber esta campanha.</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {AUDIENCE_OPTIONS.map((option) => {
                const active = audience === option.key
                return (
                  <button
                    key={option.key}
                    onClick={() => setAudience(option.key)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active ? 'border-brand bg-rose-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <span className="text-lg">{audienceIcons[option.key]}</span>
                      {active ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                          <Check size={12} />
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold text-slate-800">{option.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {option.key === 'personalizado'
                        ? option.countLabel
                        : `${statusCounts[option.key]} clientes`}
                    </p>
                  </button>
                )
              })}
            </div>
            {audience === 'personalizado' ? (
              <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-100 p-3">
                {clients.slice(0, 20).map((client) => (
                  <label key={client.id} className="flex items-center gap-2 py-1 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(client.id)}
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked
                            ? [...selectedIds, client.id]
                            : selectedIds.filter((id) => id !== client.id),
                        )
                      }
                    />
                    {client.nome} · {client.produtoFavorito}
                  </label>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">2. Crie a mensagem</h3>
            <p className="mb-4 text-sm text-slate-400">Use a sugestão da IA ou personalize do seu jeito.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
                <Sparkles size={14} />
                Sugestão da IA
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
                <Pencil size={14} />
                Personalizar
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
                <FileText size={14} />
                Escolher modelo
              </button>
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowVars((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  Variáveis
                  <ChevronDown size={14} />
                </button>
                {showVars ? (
                  <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
                    {['{nome}', '{produto_favorito}', '{frequencia_media}', '{dias_sem_pedir}'].map((v) => (
                      <button
                        key={v}
                        className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                        onClick={() => {
                          setMessage((m) => `${m} ${v}`)
                          setShowVars(false)
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-700 outline-none focus:border-brand"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
              <button
                onClick={() => setMessage(DEFAULT_MESSAGE)}
                className="inline-flex items-center gap-2 hover:text-brand"
              >
                <RefreshCw size={14} />
                Regenerar mensagem
              </button>
              <span>
                {message.length}/1.000
              </span>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">3. Agendamento</h3>
              <p className="mb-4 text-sm text-slate-400">Envie agora ou programe para um melhor horário.</p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSendNow(true)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                    sendNow ? 'border-brand bg-rose-50' : 'border-slate-200'
                  }`}
                >
                  <span className={`mt-0.5 h-4 w-4 rounded-full border ${sendNow ? 'border-4 border-brand' : 'border-slate-300'}`} />
                  <span>
                    <span className="block font-semibold text-slate-800">Enviar agora</span>
                    <span className="text-sm text-slate-500">As mensagens serão enviadas imediatamente.</span>
                  </span>
                </button>
                <div
                  className={`rounded-2xl border p-4 ${!sendNow ? 'border-brand bg-rose-50' : 'border-slate-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => setSendNow(false)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span className={`mt-0.5 h-4 w-4 rounded-full border ${!sendNow ? 'border-4 border-brand' : 'border-slate-300'}`} />
                    <span>
                      <span className="block font-semibold text-slate-800">Agendar envio</span>
                      <span className="text-sm text-slate-500">Escolha a data e o horário para enviar.</span>
                    </span>
                  </button>
                  {!sendNow ? (
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Resumo da campanha</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Users size={16} className="text-emerald-500" />
                    Público selecionado
                  </span>
                  <strong>
                    {audienceCount} {audienceCount === 1 ? 'cliente' : 'clientes'}
                  </strong>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Sparkles size={16} className="text-violet-500" />
                    Mensagem
                  </span>
                  <strong>Sugestão da IA</strong>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Wallet size={16} className="text-emerald-500" />
                    Custo estimado
                  </span>
                  <strong>{audienceCount} créditos</strong>
                </li>
              </ul>
              <button
                onClick={handleSendCampaign}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark"
              >
                <Send size={16} />
                Enviar campanha
              </button>
              {sendError ? <p className="mt-2 text-center text-xs text-red-500">{sendError}</p> : null}
              <p className="mt-2 text-center text-xs text-slate-400">
                O WhatsApp abre com a mensagem pronta. Confirme o envio no aplicativo. Use um número real, não o de exemplo.
              </p>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 h-fit rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Prévia da mensagem</h3>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Ver com dados reais
              <span
                onClick={() => setRealData((v) => !v)}
                className={`relative h-5 w-9 cursor-pointer rounded-full ${realData ? 'bg-brand' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${realData ? 'left-4' : 'left-0.5'}`} />
              </span>
            </label>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-400 text-sm">🍕</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{BUSINESS.company}</p>
                <p className="text-[11px] text-white/80">online</p>
              </div>
            </div>
            <div className="wa-pattern min-h-[420px] p-3">
              <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-3 text-sm text-slate-800 shadow">
                <p className="whitespace-pre-wrap">{realData ? previewText : message}</p>
                <img src={PIZZA_PROMO_IMAGE} alt="Pizza promocional" className="mt-3 h-40 w-full rounded-lg object-cover" />
                <p className="mt-1 text-right text-[10px] text-slate-400">10:24</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {queue.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Continuar envio no WhatsApp</h3>
            <p className="mt-1 text-sm text-slate-500">
              A primeira conversa já abriu. Envie as demais uma a uma e confirme no aplicativo.
            </p>
            <ul className="mt-4 space-y-2">
              {queue.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-700">
                    {client.nome}
                    <span className="block text-xs text-slate-400">{client.whatsapp}</span>
                  </span>
                  <button
                    className="shrink-0 text-sm font-semibold text-brand"
                    onClick={() => {
                      sendClientWhatsApp(client, message)
                      setQueue((current) => current.filter((item) => item.id !== client.id))
                    }}
                  >
                    Abrir WhatsApp
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                setQueue([])
                navigate('/resultados')
              }}
            >
              Concluir
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Step({ n, title, subtitle, active }: { n: number; title: string; subtitle: string; active?: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
        {n}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </span>
    </li>
  )
}

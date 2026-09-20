import { useEffect, useMemo, useRef, useState } from 'react'
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
  X,
} from 'lucide-react'
import {
  AUDIENCE_OPTIONS,
  BUSINESS,
  personalizeMessage,
} from '../data/mock'
import type { AudienceKey } from '../types'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { useSettings } from '../context/SettingsContext'
import { sendClientWhatsApp } from '../lib/whatsapp'
import { sendCampaignMessages } from '../services/integrations'
import {
  MESSAGE_VARIABLES,
  getAiSuggestions,
  getMessageTemplates,
  getSegmentEmoji,
  getSegmentProductLabel,
  type MessageMode,
} from '../data/messageTemplates'
import { suggestCampaignMessage, type AiSuggestProvider } from '../services/aiSuggest'

const audienceIcons: Record<AudienceKey, string> = {
  proxima_compra: '🕐',
  atrasado: '⚠️',
  muito_tempo: '😴',
  personalizado: '👥',
}

const MAX_MESSAGE_LENGTH = 1000

export function CampaignsPage() {
  const { clients, getClient, statusCounts } = useClients()
  const { recordOutboundMessage } = useMessages()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectedId = params.get('clientId')
  const [audience, setAudience] = useState<AudienceKey>(preselectedId ? 'personalizado' : 'proxima_compra')
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedId ? [preselectedId] : [])
  const [messageMode, setMessageMode] = useState<MessageMode>('ai')
  const [message, setMessage] = useState(() => getAiSuggestions(settings.segment)[0])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProvider, setAiProvider] = useState<AiSuggestProvider | null>(null)
  const [aiHint, setAiHint] = useState('')
  const [sendNow, setSendNow] = useState(true)
  const [showVars, setShowVars] = useState(false)
  const [realData, setRealData] = useState(true)
  const [queue, setQueue] = useState<typeof clients>([])
  const [sendError, setSendError] = useState('')
  const [sendBusy, setSendBusy] = useState(false)
  const [sendProvider, setSendProvider] = useState<'meta_cloud' | 'whatsapp-web' | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const aiRequestId = useRef(0)

  const templates = useMemo(() => getMessageTemplates(settings.segment), [settings.segment])
  const segmentEmoji = getSegmentEmoji(settings.segment)

  useEffect(() => {
    if (preselectedId) {
      setAudience('personalizado')
      setSelectedIds([preselectedId])
    }
  }, [preselectedId])

  useEffect(() => {
    if (messageMode !== 'ai') return
    setMessage(getAiSuggestions(settings.segment)[0].slice(0, MAX_MESSAGE_LENGTH))
    setSelectedTemplateId(null)
    setAiHint('')
  }, [settings.segment])

  const audienceCount = useMemo(() => {
    if (audience === 'personalizado') return selectedIds.length || 0
    if (audience === 'proxima_compra') return statusCounts.proxima_compra
    if (audience === 'atrasado') return statusCounts.atrasado
    return statusCounts.muito_tempo
  }, [audience, selectedIds, statusCounts])

  const previewClient = getClient(selectedIds[0] ?? 'c1') ?? clients[0]
  // Na prévia usamos rótulo do segmento (não o seed de pizza do cadastro).
  const previewText = previewClient
    ? personalizeMessage(
        message,
        { ...previewClient, produtoFavorito: getSegmentProductLabel(settings.segment) },
        settings.segment,
      )
    : message

  const recipients = useMemo(() => {
    if (audience === 'personalizado') {
      return clients.filter((c) => selectedIds.includes(c.id))
    }
    return clients.filter((c) => c.status === audience)
  }, [audience, clients, selectedIds])

  const messageModeLabel =
    messageMode === 'ai' ? 'Sugestão da IA' : messageMode === 'template' ? 'Modelo escolhido' : 'Personalizada'

  function applyMessage(next: string, mode: MessageMode, templateId: string | null = null) {
    setMessage(next.slice(0, MAX_MESSAGE_LENGTH))
    setMessageMode(mode)
    setSelectedTemplateId(templateId)
    setShowVars(false)
    setAiHint('')
  }

  async function fetchAiSuggestion(options?: { regenerate?: boolean }) {
    const requestId = ++aiRequestId.current
    setAiLoading(true)
    setAiHint('')
    setMessageMode('ai')
    setSelectedTemplateId(null)

    try {
      const result = await suggestCampaignMessage({
        segment: settings.segment,
        companyName: settings.companyName,
        audience,
        previousMessage: options?.regenerate ? message : undefined,
      })
      if (requestId !== aiRequestId.current) return
      setMessage(result.suggestion.slice(0, MAX_MESSAGE_LENGTH))
      setAiProvider(result.provider)
      setAiHint(
        result.provider === 'openai'
          ? 'Gerada com IA'
          : 'Sugestão local (conecte a chave da IA na Vercel para gerar online)',
      )
    } finally {
      if (requestId === aiRequestId.current) setAiLoading(false)
    }
  }

  function handleAiSuggestion() {
    void fetchAiSuggestion()
  }

  function handleCustomize() {
    setMessageMode('custom')
    setSelectedTemplateId(null)
    setShowVars(false)
    setAiHint('')
    window.setTimeout(() => editorRef.current?.focus(), 0)
  }

  function handleRegenerate() {
    if (messageMode === 'template' && selectedTemplateId) {
      const current = templates.find((t) => t.id === selectedTemplateId)
      if (current) {
        setMessage(current.body.slice(0, MAX_MESSAGE_LENGTH))
        return
      }
    }
    void fetchAiSuggestion({ regenerate: true })
  }

  function insertVariable(variable: string) {
    const el = editorRef.current
    if (!el) {
      setMessage((m) => `${m}${variable}`.slice(0, MAX_MESSAGE_LENGTH))
      setMessageMode('custom')
      setShowVars(false)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = `${message.slice(0, start)}${variable}${message.slice(end)}`.slice(0, MAX_MESSAGE_LENGTH)
    setMessage(next)
    setMessageMode('custom')
    setShowVars(false)
    window.setTimeout(() => {
      el.focus()
      const pos = Math.min(start + variable.length, MAX_MESSAGE_LENGTH)
      el.setSelectionRange(pos, pos)
    }, 0)
  }

  async function handleSendCampaign() {
    setSendError('')
    if (recipients.length === 0) {
      setSendError('Selecione pelo menos um cliente.')
      return
    }
    if (!sendNow && !scheduledAt) {
      setSendError('Escolha a data e o horário do agendamento.')
      return
    }

    setSendBusy(true)
    try {
      const result = await sendCampaignMessages({
        clients: recipients,
        template: message,
        segment: settings.segment,
      })
      setSendProvider(result.provider)

      if (result.sent?.length) {
        for (const item of result.sent) {
          const client = recipients.find((c) => c.id === item.clientId)
          if (!client) continue
          recordOutboundMessage({
            clientId: client.id,
            clientName: client.nome,
            text: item.text,
            fromPhone: item.to,
            waMessageId: item.waMessageId,
            source: 'whatsapp_cloud',
          })
        }
      }

      if (result.provider === 'whatsapp-web') {
        if (result.remaining.length > 0) {
          setQueue(result.remaining)
          setSendBusy(false)
          return
        }
        navigate('/resultados')
        return
      }

      if (result.error && result.remaining.length === recipients.length) {
        setSendError(result.error)
        setSendBusy(false)
        return
      }

      if (result.remaining.length > 0) {
        setQueue(result.remaining)
        if (result.error) setSendError(`Parcial: ${result.error}`)
        setSendBusy(false)
        return
      }

      navigate('/resultados')
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Falha ao enviar campanha.')
    } finally {
      setSendBusy(false)
    }
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
        <button
          type="button"
          onClick={() => setTemplatesOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand hover:text-brand"
        >
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
                    type="button"
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
            <p className="mb-4 text-sm text-slate-400">
              Use a sugestão da IA ou personalize do seu jeito.
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAiSuggestion}
                disabled={aiLoading}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                  messageMode === 'ai'
                    ? 'bg-brand text-white'
                    : 'border border-slate-200 font-medium text-slate-600 hover:border-brand hover:text-brand'
                }`}
              >
                <Sparkles size={14} className={aiLoading ? 'animate-pulse' : undefined} />
                {aiLoading ? 'Gerando com IA…' : 'Sugestão da IA'}
              </button>
              <button
                type="button"
                onClick={handleCustomize}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  messageMode === 'custom'
                    ? 'bg-brand font-semibold text-white'
                    : 'border border-slate-200 font-medium text-slate-600 hover:border-brand hover:text-brand'
                }`}
              >
                <Pencil size={14} />
                Personalizar
              </button>
              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  messageMode === 'template'
                    ? 'bg-brand font-semibold text-white'
                    : 'border border-slate-200 font-medium text-slate-600 hover:border-brand hover:text-brand'
                }`}
              >
                <FileText size={14} />
                Escolher modelo
              </button>
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setShowVars((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand"
                >
                  Variáveis
                  <ChevronDown size={14} />
                </button>
                {showVars ? (
                  <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
                    {MESSAGE_VARIABLES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                        onClick={() => insertVariable(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <textarea
              ref={editorRef}
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={aiLoading}
              onChange={(e) => {
                setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
                setMessageMode('custom')
                setSelectedTemplateId(null)
                setAiHint('')
              }}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-700 outline-none focus:border-brand disabled:bg-slate-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-400">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 hover:text-brand disabled:opacity-50"
              >
                <RefreshCw size={14} className={aiLoading ? 'animate-spin' : undefined} />
                {aiLoading ? 'Gerando…' : 'Regenerar mensagem'}
              </button>
              <span className="text-right">
                {aiHint && messageMode === 'ai' ? (
                  <span className={`mr-3 ${aiProvider === 'openai' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {aiHint}
                  </span>
                ) : null}
                {message.length}/{MAX_MESSAGE_LENGTH.toLocaleString('pt-BR')}
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
                <div className={`rounded-2xl border p-4 ${!sendNow ? 'border-brand bg-rose-50' : 'border-slate-200'}`}>
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
                  <strong>{messageModeLabel}</strong>
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
                type="button"
                disabled={sendBusy}
                onClick={() => void handleSendCampaign()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark disabled:opacity-60"
              >
                <Send size={16} />
                {sendBusy ? 'Enviando…' : 'Enviar campanha'}
              </button>
              {sendError ? <p className="mt-2 text-center text-xs text-red-500">{sendError}</p> : null}
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-400 text-sm">{segmentEmoji}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{settings.companyName || BUSINESS.company}</p>
                <p className="text-[11px] text-white/80">online</p>
              </div>
            </div>
            <div className="wa-pattern min-h-[420px] p-3">
              <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-3 text-sm text-slate-800 shadow">
                <p className="whitespace-pre-wrap">{realData ? previewText : message}</p>
                <p className="mt-1 text-right text-[10px] text-slate-400">10:24</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {templatesOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTemplatesOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Escolher modelo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Modelos adaptados para o segmento <strong>{settings.segment}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplatesOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    applyMessage(template.body, 'template', template.id)
                    setTemplatesOpen(false)
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition hover:border-brand ${
                    selectedTemplateId === template.id ? 'border-brand bg-rose-50' : 'border-slate-200'
                  }`}
                >
                  <p className="font-semibold text-slate-800">{template.title}</p>
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-slate-500">{template.body}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {queue.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Continuar envio no WhatsApp</h3>
            <p className="mt-1 text-sm text-slate-500">
              {sendProvider === 'meta_cloud'
                ? 'Alguns envios faltaram. Tente novamente.'
                : 'A primeira conversa já abriu. Envie as demais uma a uma e confirme no aplicativo.'}
            </p>
            <ul className="mt-4 space-y-2">
              {queue.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-700">
                    {client.nome}
                    <span className="block text-xs text-slate-400">{client.whatsapp}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-brand"
                    onClick={() => {
                      sendClientWhatsApp(client, message, settings.segment)
                      recordOutboundMessage({
                        clientId: client.id,
                        clientName: client.nome,
                        text: personalizeMessage(message, client, settings.segment),
                        source: 'manual',
                      })
                      setQueue((current) => current.filter((item) => item.id !== client.id))
                    }}
                  >
                    Abrir WhatsApp
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                setQueue([])
                navigate('/resultados')
              }}
            >
              Concluir e ver resultados
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Respostas do WhatsApp entram automaticamente em Mensagens e Resultados.
            </p>
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

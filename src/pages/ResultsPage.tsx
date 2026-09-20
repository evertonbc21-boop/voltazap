import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, MessageSquarePlus, Plus, Search } from 'lucide-react'
import { formatCurrency } from '../data/mock'
import { ClientCell } from '../components/ui/Avatar'
import { DonutChart } from '../components/ui/DonutChart'
import { LineChart } from '../components/ui/LineChart'
import { OutcomeBadge } from '../components/ui/StatusBadge'
import { ConversationModal } from '../components/ConversationModal'
import { RegisterReplyModal } from '../components/RegisterReplyModal'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { useSettings } from '../context/SettingsContext'
import {
  formatCampaignDateTime,
  formatCampaignLongDate,
  useCampaign,
} from '../context/CampaignContext'
import { getCampaignDisplayName, getSegmentEmoji } from '../data/messageTemplates'
import { resolveDisplayClient } from '../lib/resolveDisplayClient'
import type { ReplyOutcome } from '../types'

const OUTCOME_OPTIONS: { value: 'todos' | ReplyOutcome; label: string }[] = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'interessado', label: 'Interessado' },
  { value: 'nao_interessado', label: 'Não interessado' },
  { value: 'nao_respondeu', label: 'Não respondeu' },
]

export function ResultsPage() {
  const [conversation, setConversation] = useState<string | null>(null)
  const [replyQuery, setReplyQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<'todos' | ReplyOutcome>('todos')
  const [registerOpen, setRegisterOpen] = useState(false)
  const { getClient } = useClients()
  const { settings } = useSettings()
  const { replies, messages, stats } = useMessages()
  const { lastCampaign } = useCampaign()
  const campaignName = lastCampaign?.name || getCampaignDisplayName(settings.segment)
  const segmentEmoji = getSegmentEmoji(settings.segment)

  const outbound = useMemo(
    () => messages.filter((m) => m.direction !== 'inbound'),
    [messages],
  )
  const sentCount = outbound.length
  const delivered = outbound.filter((m) => m.status !== 'nao_entregue').length
  const readCount = outbound.filter((m) => m.status === 'lida' || m.status === 'respondeu').length
  const failed = outbound.filter((m) => m.status === 'nao_entregue').length
  const pct = (part: number) =>
    sentCount > 0 ? `${((part / sentCount) * 100).toFixed(1).replace('.', ',')}%` : '0%'

  const evolution = useMemo(() => {
    const hours = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
    const totalSent = sentCount
    const totalReplies = stats.totalReplies
    const totalOrders = stats.orders
    return hours.map((hour, index) => {
      const ratio = (index + 1) / hours.length
      return {
        hour,
        sent: Math.round(totalSent * ratio),
        replies: Math.round(totalReplies * ratio),
        orders: Math.round(totalOrders * ratio),
      }
    })
  }, [sentCount, stats.totalReplies, stats.orders])

  const statusBadge =
    lastCampaign?.status === 'agendada'
      ? { label: 'Agendada', className: 'bg-amber-50 text-amber-700' }
      : lastCampaign?.status === 'parcial'
        ? { label: 'Parcial', className: 'bg-sky-50 text-sky-700' }
        : { label: 'Concluída', className: 'bg-emerald-50 text-emerald-600' }

  const kpis = [
    {
      value: String(sentCount),
      label: 'Mensagens enviadas',
      meta: pct(sentCount),
      color: 'text-sky-500',
      icon: '✈️',
    },
    {
      value: String(delivered),
      label: 'Entregues',
      meta: pct(delivered),
      color: 'text-emerald-500',
      icon: '✓',
    },
    {
      value: String(stats.totalReplies),
      label: 'Respostas recebidas',
      meta: stats.responseRateLabel,
      color: 'text-violet-500',
      icon: '💬',
    },
    {
      value: String(stats.orders),
      label: 'Pedidos realizados',
      meta: stats.orderRateLabel,
      color: 'text-orange-500',
      icon: segmentEmoji,
    },
    {
      value: formatCurrency(stats.revenue || 0),
      label: 'Faturamento gerado',
      meta:
        stats.orders > 0
          ? `Ticket médio ${formatCurrency(Math.round(stats.revenue / stats.orders))}`
          : 'Registre respostas com valor',
      color: 'text-emerald-600',
      icon: '💰',
    },
  ]

  const filteredReplies = useMemo(() => {
    const q = replyQuery.trim().toLowerCase()
    return replies.filter((row) => {
      const client = resolveDisplayClient(getClient, row)
      const matchesOutcome = outcomeFilter === 'todos' || row.outcome === outcomeFilter
      const matchesQuery =
        !q ||
        client.nome.toLowerCase().includes(q) ||
        client.produtoFavorito.toLowerCase().includes(q) ||
        row.reply.toLowerCase().includes(q) ||
        (row.fromPhone || '').includes(q)
      return matchesOutcome && matchesQuery
    })
  }, [replies, replyQuery, outcomeFilter, getClient])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Resultados da Campanha</h2>
          <p className="mt-1 text-slate-500">
            Acompanhe o desempenho. Respostas do WhatsApp aparecem automaticamente em Respostas e em Mensagens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand shadow-sm hover:bg-brand/10"
          >
            <MessageSquarePlus size={16} />
            Registrar resposta
          </button>
          <Link
            to="/campanhas"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
          >
            <ArrowLeft size={16} />
            Voltar para campanhas
          </Link>
          <Link
            to="/campanhas"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus size={16} />
            Nova campanha
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-xl">{segmentEmoji}</div>
          <div>
            <h3 className="font-semibold text-slate-800">Campanha - {campaignName}</h3>
            <p className="text-sm text-slate-400">
              {lastCampaign
                ? `${lastCampaign.status === 'agendada' ? 'Agendada para' : 'Iniciada em'} ${formatCampaignLongDate(lastCampaign.startedAt)}`
                : 'Envie uma campanha para ver os detalhes aqui.'}
            </p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 text-lg">{kpi.icon}</div>
            <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
            <p className="mt-1 text-sm text-slate-500">{kpi.label}</p>
            <p className={`mt-2 text-xs font-semibold ${kpi.color}`}>{kpi.meta}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Evolução da campanha</h3>
          <p className="text-sm text-slate-400">Veja como as respostas e pedidos foram chegando ao longo do tempo.</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <i className="h-2 w-2 rounded-full bg-emerald-500" /> Mensagens enviadas
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <i className="h-2 w-2 rounded-full bg-blue-500" /> Respostas
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <i className="h-2 w-2 rounded-full bg-red-500" /> Pedidos
            </span>
          </div>
          <div className="mt-2 h-64">
            <LineChart data={evolution} />
          </div>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Status das mensagens</h3>
          <div className="mt-4 flex flex-col items-center">
            <DonutChart
              slices={[
                { value: delivered, color: '#22c55e' },
                { value: readCount, color: '#86efac' },
                { value: failed, color: '#ef4444' },
              ]}
              centerTitle={String(sentCount)}
              centerSubtitle="mensagens"
            />
            <ul className="mt-4 w-full space-y-2 text-sm">
              <li className="flex justify-between text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Entregues
                </span>
                <strong>
                  {delivered} ({pct(delivered)})
                </strong>
              </li>
              <li className="flex justify-between text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Lidas / respondidas
                </span>
                <strong>
                  {readCount} ({pct(readCount)})
                </strong>
              </li>
              <li className="flex justify-between text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Não entregues
                </span>
                <strong>
                  {failed} ({pct(failed)})
                </strong>
              </li>
            </ul>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Respostas dos clientes</h3>
              <p className="text-sm text-slate-400">Veja quem respondeu e o resultado de cada conversa.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <MessageSquarePlus size={14} />
                Registrar
              </button>
              <label className="relative">
                <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <input
                  value={replyQuery}
                  onChange={(e) => setReplyQuery(e.target.value)}
                  placeholder="Buscar por nome ou produto..."
                  className="rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm outline-none focus:border-brand"
                />
              </label>
              <div className="relative">
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as typeof outcomeFilter)}
                  className="appearance-none rounded-xl border border-slate-200 py-2 pr-8 pl-3 text-sm text-slate-500 outline-none focus:border-brand"
                >
                  {OUTCOME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr className="border-y border-slate-100">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Resposta</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Valor do pedido</th>
                  <th className="px-3 py-3 font-medium">Data/Hora</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredReplies.map((row) => {
                  const client = resolveDisplayClient(getClient, row)
                  return (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3">
                        <ClientCell client={client} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span>“{row.reply}”</span>
                        {row.source && row.source !== 'manual' ? (
                          <span className="mt-1 block text-[11px] font-medium text-slate-400">
                            {row.source === 'mock'
                              ? 'Mock / teste'
                              : 'Meta WhatsApp'}
                            {row.intent ? ` · ${row.intent}` : ''}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <OutcomeBadge outcome={row.outcome} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {row.orderValue ? formatCurrency(row.orderValue) : '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-500">{row.datetime}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setConversation(client.id)}
                          className="text-sm font-medium text-slate-500 hover:text-brand"
                        >
                          Ver conversa
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredReplies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      Nenhuma resposta encontrada. Use “Registrar resposta” após falar no WhatsApp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-sm text-slate-400">
            Mostrando {filteredReplies.length} de {replies.length} respostas
          </p>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <h3 className="text-lg font-semibold text-slate-800">🏆 Ótimo resultado!</h3>
            <p className="mt-2 text-sm text-slate-600">
              Você recuperou <strong>{stats.orders} pedidos</strong> e gerou{' '}
              <strong>{formatCurrency(stats.revenue)}</strong> em faturamento com esta campanha.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800">Detalhes da campanha</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Nome da campanha" value={campaignName} />
              <Row
                label="Público"
                value={
                  lastCampaign
                    ? `${lastCampaign.audienceTitle} (${lastCampaign.audienceCount} ${
                        lastCampaign.audienceCount === 1 ? 'cliente' : 'clientes'
                      })`
                    : '—'
                }
              />
              <Row label="Mensagem" value={lastCampaign?.messageModeLabel || '—'} />
              <Row
                label="Precisa ser iniciada em"
                value={lastCampaign ? formatCampaignDateTime(lastCampaign.startedAt) : '—'}
              />
              <Row
                label="Finalizada em"
                value={lastCampaign ? formatCampaignDateTime(lastCampaign.finishedAt) : '—'}
              />
              <Row label="Enviada por" value={lastCampaign?.sentBy || `${settings.companyName} (Você)`} />
            </dl>
          </article>
        </div>
      </section>

      <ConversationModal clientId={conversation} onClose={() => setConversation(null)} />
      <RegisterReplyModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}

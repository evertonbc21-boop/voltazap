import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CircleDollarSign,
  MessageCircle,
  Pizza,
  Send,
  Users,
} from 'lucide-react'
import {
  BUSINESS,
  CAMPAIGN_PROMO_IMAGE,
  DEFAULT_MESSAGE,
  formatCurrency,
} from '../data/mock'
import { Avatar, ClientCell } from '../components/ui/Avatar'
import { DonutChart } from '../components/ui/DonutChart'
import { MessageStatusBadge } from '../components/ui/StatusBadge'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { sendClientWhatsApp } from '../lib/whatsapp'
import { DatePicker, formatLongDate } from '../components/ui/DatePicker'
import { usePlan } from '../context/PlanContext'
import { useSettings } from '../context/SettingsContext'
import type { Segment } from '../context/SettingsContext'
import { formatPlanPrice } from '../data/plans'
import { AccountMenu } from '../components/AccountMenu'
import { VoltaZapWordmark } from '../components/VoltaZapWordmark'

export function DashboardPage() {
  const { clients, statusCounts, getClient } = useClients()
  const { messages, stats } = useMessages()
  const { plan, account } = usePlan()
  const { settings } = useSettings()
  const used = Math.min(plan.clientsLimit, clients.length)
  const greetingName = getGreetingName(settings.companyName, account?.nome)
  const businessLabel = getBusinessLabel(settings.segment)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate()

  const kpis = [
    { label: 'Clientes cadastrados', value: String(clients.length), delta: '+12%', icon: Users, iconBg: 'bg-sky-50 text-sky-500', highlight: false },
    { label: 'Mensagens enviadas', value: String(messages.length), delta: '+23%', icon: Send, iconBg: 'bg-emerald-50 text-emerald-500', highlight: false },
    { label: 'Respostas recebidas', value: String(stats.totalReplies), delta: '+12%', icon: MessageCircle, iconBg: 'bg-violet-50 text-violet-500', highlight: false },
    { label: 'Pedidos recuperados', value: String(stats.orders), delta: '+37%', icon: Pizza, iconBg: 'bg-orange-50 text-orange-500', highlight: false },
    { label: 'Faturamento recuperado', value: formatCurrency(stats.revenue), delta: '+41%', icon: CircleDollarSign, iconBg: 'bg-emerald-50 text-emerald-600', highlight: true },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <VoltaZapWordmark
            variant="onLight"
            className="mb-3"
            markClassName="h-10 w-10 sm:h-11 sm:w-11"
            textClassName="text-[1.55rem] sm:text-[1.7rem]"
          />
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Olá, {greetingName}! 👋</h2>
          <p className="mt-1 text-slate-500">
            {isToday
              ? `Aqui está o resumo ${businessLabel} hoje.`
              : `Aqui está o resumo ${businessLabel} em ${formatLongDate(selectedDate)}.`}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <AccountMenu />
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
        </div>
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Plano atual</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Plano {plan.name}</h3>
            <p className="text-sm text-slate-500">{formatPlanPrice(plan.price)}</p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {used.toLocaleString('pt-BR')} / {plan.clientsLimit.toLocaleString('pt-BR')} clientes utilizados
            </p>
            <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.round((used / plan.clientsLimit) * 100)}%` }}
              />
            </div>
          </div>
          <Link
            to="/planos"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Gerenciar plano
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <article
              key={kpi.label}
              className={`min-w-0 rounded-2xl border p-3 shadow-sm ${
                kpi.highlight
                  ? 'border-emerald-200 bg-emerald-50/40 ring-1 ring-emerald-100'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div className={`mb-2 inline-flex rounded-lg p-2 ${kpi.iconBg}`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{kpi.label}</p>
              <p className={`mt-2 text-xs font-semibold ${kpi.highlight ? 'text-emerald-600' : 'text-emerald-500'}`}>
                {kpi.delta} <span className="font-normal text-slate-400">vs. mês anterior</span>
              </p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Situação dos clientes</h3>
          <p className="text-sm text-slate-400">Total de {clients.length} clientes</p>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart
              slices={[
                { value: statusCounts.normal, color: '#22c55e' },
                { value: statusCounts.proxima_compra, color: '#eab308' },
                { value: statusCounts.atrasado, color: '#ef4444' },
                { value: statusCounts.muito_tempo, color: '#94a3b8' },
              ]}
              centerTitle={String(clients.length)}
              centerSubtitle="clientes"
            />
            <ul className="w-full space-y-3 text-sm">
              <Legend color="#22c55e" label="Normal (não contactar)" value={statusCounts.normal} />
              <Legend color="#eab308" label="Próxima compra" value={statusCounts.proxima_compra} />
              <Legend color="#ef4444" label="Atrasados" value={statusCounts.atrasado} />
              <Legend color="#94a3b8" label="Muito tempo sem comprar" value={statusCounts.muito_tempo} />
            </ul>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-5 shadow-sm">
          <div className="relative z-10 max-w-md">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">🎯</div>
            <h3 className="text-2xl font-bold text-slate-900">Recupere mais pedidos hoje!</h3>
            <p className="mt-2 text-slate-600">
              Temos <strong>45 clientes</strong> prontos para receber sua mensagem.
            </p>
            <Link
              to="/campanhas"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark"
            >
              <Send size={16} />
              Enviar mensagens agora
              <span aria-hidden>→</span>
            </Link>
          </div>
          <img
            src={CAMPAIGN_PROMO_IMAGE}
            alt="Negócios locais"
            className="pointer-events-none mt-6 h-40 w-full rounded-2xl object-cover xl:absolute xl:right-4 xl:top-6 xl:mt-0 xl:h-44 xl:w-56"
          />
          <p className="absolute right-8 top-4 hidden rotate-[-8deg] text-xs font-semibold text-white xl:block">
            Mais clientes.
            <br />
            Mais vendas.
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-800">Últimas mensagens enviadas</h3>
            <Link to="/mensagens" className="text-sm font-medium text-slate-400 hover:text-brand">
              Ver todas
            </Link>
          </div>
          <p className="px-5 pb-3 text-sm text-amber-700">
            Após falar no WhatsApp, use “Registrar resposta” em Resultados ou Mensagens para o relatório atualizar.
          </p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr className="border-y border-slate-100">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Mensagem</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Resposta</th>
                </tr>
              </thead>
              <tbody>
                {messages.slice(0, 5).map((msg) => {
                  const client = getClient(msg.clientId)
                  if (!client) return null
                  return (
                    <tr
                      key={msg.id}
                      className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      onClick={() => sendClientWhatsApp(client, DEFAULT_MESSAGE)}
                    >
                      <td className="px-5 py-3">
                        <ClientCell client={client} />
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-3 text-slate-500">{msg.preview}</td>
                      <td className="px-3 py-3">
                        <MessageStatusBadge status={msg.status} />
                      </td>
                      <td className="px-3 py-3 text-slate-500">{msg.dateLabel}</td>
                      <td className="px-5 py-3 text-slate-600">{msg.reply ?? '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            💡 Dica do dia
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Clientes que recebem mensagens personalizadas têm <strong>3x mais chances</strong> de voltar a comprar.
          </p>
          <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <Avatar name="E" color="#22c55e" size="sm" />
              <div className="rounded-2xl rounded-tl-sm bg-[#d9fdd3] px-3 py-2 text-xs text-slate-700">
                “Everton, já faz 21 dias que você não pede sua Calabresa com Catupiry. Quer que eu envie uma pizza quentinha hoje? 🍕”
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-brand">Simples. Direto. E funciona. ❤️</p>
        </article>
      </section>
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-600">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </li>
  )
}

function getGreetingName(companyName: string, accountName?: string | null) {
  if (accountName?.trim()) return accountName.trim().split(/\s+/)[0]
  const match = companyName.match(/\b(?:do|da|de)\s+(.+)$/i)
  if (match?.[1]) return match[1].trim().split(/\s+/)[0]
  const cleaned = companyName.trim()
  if (!cleaned || cleaned === BUSINESS.company) return BUSINESS.owner
  return cleaned.split(/\s+/)[0]
}

function getBusinessLabel(segment: Segment) {
  switch (segment) {
    case 'Pizzaria':
      return 'da sua pizzaria'
    case 'Restaurante':
      return 'do seu restaurante'
    case 'Hamburgueria':
      return 'da sua hamburgueria'
    case 'Barbearia':
      return 'da sua barbearia'
    case 'Salão de beleza':
      return 'do seu salão de beleza'
    case 'Clínica':
      return 'da sua clínica'
    case 'Pet Shop':
      return 'do seu pet shop'
    default:
      return 'do seu negócio'
  }
}

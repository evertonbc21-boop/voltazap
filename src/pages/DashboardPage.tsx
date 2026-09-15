import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  MessageCircle,
  Pizza,
  Send,
  Users,
} from 'lucide-react'
import {
  BUSINESS,
  PIZZA_IMAGE,
  clients,
  recentMessages,
  statusCounts,
  getClient,
} from '../data/mock'
import { Avatar, ClientCell } from '../components/ui/Avatar'
import { DonutChart } from '../components/ui/DonutChart'
import { MessageStatusBadge } from '../components/ui/StatusBadge'

const kpis = [
  { label: 'Clientes cadastrados', value: '100', delta: '+12%', icon: Users, iconBg: 'bg-sky-50 text-sky-500' },
  { label: 'Mensagens enviadas', value: '32', delta: '+23%', icon: Send, iconBg: 'bg-emerald-50 text-emerald-500' },
  { label: 'Respostas recebidas', value: '18', delta: '+12%', icon: MessageCircle, iconBg: 'bg-violet-50 text-violet-500' },
  { label: 'Pedidos recuperados', value: '11', delta: '+37%', icon: Pizza, iconBg: 'bg-orange-50 text-orange-500' },
  { label: 'Faturamento recuperado', value: 'R$ 687', delta: '+41%', icon: CircleDollarSign, iconBg: 'bg-emerald-50 text-emerald-600' },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Olá, Guto! 👋</h2>
          <p className="mt-1 text-slate-500">Aqui está o resumo da sua pizzaria hoje.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <CalendarDays size={16} />
            Sexta-feira, 13 de setembro de 2026
            <ChevronDown size={14} />
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <img
              src="https://i.pravatar.cc/64?img=12"
              alt="Guto"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-left">
              <span className="block text-sm font-semibold text-slate-800">{BUSINESS.company}</span>
              <span className="text-xs text-slate-400">Conta Pro</span>
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <article key={kpi.label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className={`mb-4 inline-flex rounded-xl p-2.5 ${kpi.iconBg}`}>
                <Icon size={18} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
              <p className="mt-1 text-sm text-slate-500">{kpi.label}</p>
              <p className="mt-3 text-xs font-semibold text-emerald-500">
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
              centerTitle="100"
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
            src={PIZZA_IMAGE}
            alt="Pizza"
            className="pointer-events-none mt-6 h-40 w-full rounded-2xl object-cover xl:absolute xl:right-4 xl:top-6 xl:mt-0 xl:h-44 xl:w-56"
          />
          <p className="absolute right-8 top-4 hidden rotate-[-8deg] text-xs font-semibold text-white xl:block">
            Mais clientes.
            <br />
            Mais pizzas.
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
                {recentMessages.map((msg) => {
                  const client = getClient(msg.clientId)!
                  return (
                    <tr key={msg.id} className="border-b border-slate-50 last:border-0">
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

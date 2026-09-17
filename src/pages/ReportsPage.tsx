import { formatCurrency } from '../data/mock'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'

export function ReportsPage() {
  const { statusCounts } = useClients()
  const { stats } = useMessages()
  const rows = [
    { label: 'Clientes reativados no mês', value: String(stats.orders) },
    { label: 'Taxa de resposta', value: stats.responseRateLabel },
    { label: 'Taxa de pedidos', value: stats.orderRateLabel },
    { label: 'Faturamento recuperado', value: formatCurrency(stats.revenue) },
    {
      label: 'Clientes prontos para campanha',
      value: String(statusCounts.proxima_compra + statusCounts.atrasado),
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Relatórios</h2>
        <p className="mt-1 text-slate-500">Resumo simples de reativação. Sem financeiro, estoque ou ERP.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{row.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{row.value}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

import { recentMessages } from '../data/mock'
import { ClientCell } from '../components/ui/Avatar'
import { MessageStatusBadge } from '../components/ui/StatusBadge'
import { useClients } from '../context/ClientsContext'

export function MessagesPage() {
  const { getClient } = useClients()
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Mensagens</h2>
        <p className="mt-1 text-slate-500">Histórico demonstrativo das mensagens enviadas pela Pizzaria do Guto.</p>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-3 py-3 font-medium">Mensagem</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Resposta</th>
              </tr>
            </thead>
            <tbody>
              {recentMessages.map((msg) => {
                const client = getClient(msg.clientId)
                if (!client) return null
                return (
                  <tr key={msg.id} className="border-b border-slate-50">
                    <td className="px-5 py-3">
                      <ClientCell client={client} />
                    </td>
                    <td className="px-3 py-3 text-slate-500">{msg.preview}</td>
                    <td className="px-3 py-3">
                      <MessageStatusBadge status={msg.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-500">{msg.dateLabel}</td>
                    <td className="px-5 py-3">{msg.reply ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

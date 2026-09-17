import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { ClientCell } from '../components/ui/Avatar'
import { MessageStatusBadge } from '../components/ui/StatusBadge'
import { RegisterReplyModal } from '../components/RegisterReplyModal'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import { useSettings } from '../context/SettingsContext'
import { resolveDisplayClient } from '../lib/resolveDisplayClient'

export function MessagesPage() {
  const { getClient } = useClients()
  const { settings } = useSettings()
  const { messages } = useMessages()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [preselected, setPreselected] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Mensagens</h2>
          <p className="mt-1 text-slate-500">
            Histórico das mensagens de {settings.companyName}. Respostas reais do WhatsApp entram automaticamente pelo
            webhook da Meta (e também via registro manual).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreselected(null)
            setRegisterOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <MessageSquarePlus size={16} />
          Registrar resposta
        </button>
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
              {messages.map((msg) => {
                const client = resolveDisplayClient(getClient, {
                  clientId: msg.clientId,
                  fromPhone: msg.fromPhone,
                  customerPhone: msg.fromPhone,
                  customerName: undefined,
                  phone: msg.fromPhone,
                })
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
                    <td className="px-5 py-3">
                      {msg.reply ? (
                        msg.reply
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPreselected(msg.clientId)
                            setRegisterOpen(true)
                          }}
                          className="text-sm font-medium text-brand hover:underline"
                        >
                          Registrar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <RegisterReplyModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        preselectedClientId={preselected}
      />
    </div>
  )
}

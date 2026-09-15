import { X } from 'lucide-react'
import { BUSINESS, PIZZA_PROMO_IMAGE } from '../data/mock'
import { Avatar } from './ui/Avatar'
import { useClients } from '../context/ClientsContext'

interface ConversationModalProps {
  clientId: string | null
  onClose: () => void
}

export function ConversationModal({ clientId, onClose }: ConversationModalProps) {
  const { getClient } = useClients()
  if (!clientId) return null
  const client = getClient(clientId)
  if (!client) return null

  const chats: Record<string, { from: 'me' | 'them'; text: string; time: string }[]> = {
    c1: [
      {
        from: 'me',
        text: `Everton, já faz 21 dias que você não pede sua Calabresa com Catupiry. Quer repetir hoje? 🍕`,
        time: '10:24',
      },
      { from: 'them', text: 'Quero! 😍', time: '10:24' },
    ],
    c3: [
      { from: 'me', text: 'Sentimos sua falta! Já faz 35 dias desde sua última Marguerita.', time: '08:47' },
      { from: 'them', text: 'Pode mandar uma grande 😂', time: '08:47' },
    ],
    c2: [
      { from: 'me', text: 'Já está chegando aquela vontade de Portuguesa?', time: '09:15' },
      { from: 'them', text: 'Sim, por favor!', time: '11:45' },
    ],
    c4: [
      { from: 'me', text: 'Que tal um Frango com Catupiry hoje?', time: '08:30' },
      { from: 'them', text: 'Hoje não, semana que vem eu peço.', time: '12:10' },
    ],
    c5: [
      { from: 'me', text: 'Está na hora de repetir seu Quatro Queijos?', time: '07:52' },
      { from: 'them', text: 'Qual o valor da grande?', time: '12:34' },
    ],
  }

  const messages = chats[clientId] ?? [
    {
      from: 'me' as const,
      text: `Olá, ${client.nome}! Que tal repetir sua ${client.produtoFavorito} hoje?`,
      time: '10:00',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#008069] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Avatar name={client.nome} color={client.avatarColor} />
            <div>
              <p className="text-sm font-semibold">{client.nome}</p>
              <p className="text-[11px] text-white/80">WhatsApp · {client.whatsapp}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="wa-pattern max-h-[420px] min-h-[320px] space-y-2 overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow ${
                  msg.from === 'me' ? 'rounded-tr-sm bg-[#d9fdd3]' : 'rounded-tl-sm bg-white'
                }`}
              >
                <p className="whitespace-pre-wrap text-slate-800">{msg.text}</p>
                {msg.from === 'me' && i === 0 ? (
                  <img src={PIZZA_PROMO_IMAGE} alt="Pizza" className="mt-2 h-28 w-full rounded-lg object-cover" />
                ) : null}
                <p className="mt-1 text-right text-[10px] text-slate-400">{msg.time}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-400">
          Prévia demonstrativa · {BUSINESS.company}
        </p>
      </div>
    </div>
  )
}

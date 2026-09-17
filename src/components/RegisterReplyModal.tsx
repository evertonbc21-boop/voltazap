import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useMessages } from '../context/MessagesContext'
import type { ReplyOutcome } from '../types'

const OUTCOMES: { value: ReplyOutcome; label: string }[] = [
  { value: 'pedido_realizado', label: 'Pedido realizado' },
  { value: 'interessado', label: 'Interessado' },
  { value: 'em_negociacao', label: 'Em negociação' },
  { value: 'sem_resposta', label: 'Sem resposta' },
]

interface RegisterReplyModalProps {
  open: boolean
  onClose: () => void
  preselectedClientId?: string | null
  messagePreview?: string
}

export function RegisterReplyModal({
  open,
  onClose,
  preselectedClientId = null,
  messagePreview,
}: RegisterReplyModalProps) {
  const { clients } = useClients()
  const { registerReply } = useMessages()
  const [clientId, setClientId] = useState('')
  const [reply, setReply] = useState('')
  const [outcome, setOutcome] = useState<ReplyOutcome>('interessado')
  const [orderValue, setOrderValue] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.nome.localeCompare(b.nome)),
    [clients],
  )

  useEffect(() => {
    if (!open) return
    setClientId(preselectedClientId || sortedClients[0]?.id || '')
    setReply('')
    setOutcome('interessado')
    setOrderValue('')
    setError('')
    setSaved(false)
  }, [open, preselectedClientId, sortedClients])

  if (!open) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    const client = clients.find((c) => c.id === clientId)
    if (!client) {
      setError('Selecione um cliente.')
      return
    }
    if (outcome !== 'sem_resposta' && !reply.trim()) {
      setError('Digite a resposta do cliente.')
      return
    }

    let value: number | undefined
    if (outcome === 'pedido_realizado') {
      const parsed = Number(orderValue.replace(',', '.'))
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Informe o valor do pedido.')
        return
      }
      value = parsed
    }

    registerReply({
      clientId: client.id,
      clientName: client.nome,
      reply: reply.trim() || 'Sem resposta',
      outcome,
      orderValue: value,
      messagePreview,
    })
    setSaved(true)
    window.setTimeout(() => onClose(), 900)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Registrar resposta</h3>
            <p className="mt-1 text-sm text-slate-500">
              Como o recebimento automático pela Meta pode falhar em algum caso, registre aqui a resposta do cliente
              para aparecer nos relatórios. O fluxo principal é o webhook automático.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {saved ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            Resposta registrada! Já aparece em Resultados, Mensagens e Relatórios.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              Cliente
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
              >
                {sortedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nome} · {client.whatsapp}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-600">
              Status da conversa
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as ReplyOutcome)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
              >
                {OUTCOMES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {outcome !== 'sem_resposta' ? (
              <label className="block text-sm font-medium text-slate-600">
                Resposta do cliente
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Quero! Pode mandar uma grande."
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
                />
              </label>
            ) : null}

            {outcome === 'pedido_realizado' ? (
              <label className="block text-sm font-medium text-slate-600">
                Valor do pedido (R$)
                <input
                  value={orderValue}
                  onChange={(e) => setOrderValue(e.target.value)}
                  placeholder="68,00"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-brand"
                />
              </label>
            ) : null}

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Salvar no relatório
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

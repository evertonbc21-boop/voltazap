import { STATUS_META } from '../../data/mock'
import type { ClientStatus, MessageStatus, ReplyOutcome } from '../../types'

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.shortLabel}
    </span>
  )
}

const messageMap: Record<MessageStatus, { label: string; className: string; dot: string }> = {
  respondeu: { label: 'Respondeu', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  entregue: { label: 'Entregue', className: 'text-sky-600 bg-sky-50', dot: 'bg-sky-500' },
  lida: { label: 'Lida', className: 'text-violet-600 bg-violet-50', dot: 'bg-violet-500' },
  enviada: { label: 'Enviada', className: 'text-slate-600 bg-slate-100', dot: 'bg-slate-400' },
  nao_entregue: { label: 'Não entregue', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
  received: { label: 'Recebida', className: 'text-brand bg-rose-50', dot: 'bg-brand' },
}

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const meta = messageMap[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

const outcomeMap: Record<ReplyOutcome, { label: string; className: string; dot: string }> = {
  pedido_realizado: { label: 'Pedido realizado', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  interessado: { label: 'Interessado', className: 'text-sky-600 bg-sky-50', dot: 'bg-sky-500' },
  em_negociacao: { label: 'Em negociação', className: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  sem_resposta: { label: 'Sem resposta', className: 'text-slate-600 bg-slate-100', dot: 'bg-slate-400' },
}

export function OutcomeBadge({ outcome }: { outcome: ReplyOutcome }) {
  const meta = outcomeMap[outcome]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

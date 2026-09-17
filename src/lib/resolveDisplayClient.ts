import { AVATAR_COLORS } from '../data/mock'
import type { CampaignReply, Client, SentMessage } from '../types'

/** Cliente para exibição: nunca esconde resposta Meta só porque o CRM local ainda não tem o registro. */
export function resolveDisplayClient(
  getClient: (id: string) => Client | undefined,
  row: Pick<CampaignReply, 'clientId' | 'customerName' | 'customerPhone' | 'fromPhone' | 'phone'> &
    Partial<Pick<SentMessage, 'preview'>>,
): Client {
  const existing = getClient(row.clientId)
  if (existing) return existing

  const phone = row.customerPhone || row.fromPhone || row.phone || ''
  const nome =
    (row.customerName || '').trim() ||
    (phone ? `WhatsApp ${phone}` : 'Cliente WhatsApp')

  return {
    id: row.clientId || `c-orphan-${phone || 'unknown'}`,
    nome,
    whatsapp: phone || '—',
    ultimoPedido: '—',
    frequenciaMedia: 0,
    produtoFavorito: '—',
    valorMedio: 0,
    quantidadePedidos: 0,
    status: 'proxima_compra',
    avatarColor: AVATAR_COLORS[0],
  }
}

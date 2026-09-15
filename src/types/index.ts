export type ClientStatus =
  | 'normal'
  | 'proxima_compra'
  | 'atrasado'
  | 'muito_tempo'

export type MessageStatus =
  | 'respondeu'
  | 'entregue'
  | 'lida'
  | 'nao_entregue'
  | 'enviada'

export type ReplyOutcome =
  | 'pedido_realizado'
  | 'interessado'
  | 'em_negociacao'
  | 'sem_resposta'

export type AudienceKey =
  | 'proxima_compra'
  | 'atrasado'
  | 'muito_tempo'
  | 'personalizado'

export interface Client {
  id: string
  nome: string
  whatsapp: string
  ultimoPedido: string
  frequenciaMedia: number
  produtoFavorito: string
  valorMedio: number
  quantidadePedidos: number
  status: ClientStatus
  avatarColor: string
}

export interface SentMessage {
  id: string
  clientId: string
  preview: string
  status: MessageStatus
  dateLabel: string
  reply?: string
}

export interface CampaignReply {
  id: string
  clientId: string
  reply: string
  outcome: ReplyOutcome
  orderValue?: number
  datetime: string
}

export interface ConversationMessage {
  from: 'business' | 'client'
  text: string
  time: string
}

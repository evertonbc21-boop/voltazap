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

export type ReplySource = 'manual' | 'meta_whatsapp' | 'whatsapp_cloud' | 'mock'

export type AudienceKey =
  | 'proxima_compra'
  | 'atrasado'
  | 'muito_tempo'
  | 'personalizado'

/** Evento inbound da Cloud API (servidor → front). */
export interface InboundWhatsAppEvent {
  id: string
  kind: 'message' | 'status'
  waMessageId?: string
  fromPhone?: string
  contactName?: string
  text?: string
  receivedAt: string
  timestamp?: number
  type?: string
  status?: string
  source: ReplySource
  processed?: boolean
  analysis?: {
    intent?: string
    intentLabel?: string
    outcome?: ReplyOutcome
    orderValue?: number
    conversationStatus?: string
    confidence?: number
    pedidoRealizado?: boolean
    valorPedido?: number | null
    statusConversa?: string
    typebotReady?: boolean
  }
}

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
  source?: ReplySource
  intent?: string
  fromPhone?: string
  waMessageId?: string
  conversationStatus?: string
}

export interface ConversationMessage {
  from: 'business' | 'client'
  text: string
  time: string
}

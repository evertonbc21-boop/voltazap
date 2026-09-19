import type { AudienceKey, Client, ClientStatus, SentMessage, CampaignReply } from '../types'

export const BUSINESS = {
  name: 'VoltaZap',
  slogan: 'Seus clientes sempre com vontade de voltar',
  company: 'Pizzaria do Guto',
  plan: 'Plano Pro',
  owner: 'Guto',
  clientsUsed: 100,
  clientsLimit: 2000,
} as const

export const PRODUCTS = [
  'Calabresa com Catupiry',
  'Portuguesa',
  'Marguerita',
  'Quatro Queijos',
  'Frango com Catupiry',
  'Pepperoni',
  'Frango com Cheddar',
] as const

export const STATUS_META: Record<
  ClientStatus,
  { label: string; shortLabel: string; color: string; bg: string; text: string }
> = {
  normal: {
    label: 'Normal (não contactar)',
    shortLabel: 'Normal',
    color: '#22c55e',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  proxima_compra: {
    label: 'Próxima compra',
    shortLabel: 'Próxima compra',
    color: '#eab308',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  atrasado: {
    label: 'Atrasado',
    shortLabel: 'Atrasado',
    color: '#ef4444',
    bg: 'bg-red-50',
    text: 'text-red-500',
  },
  muito_tempo: {
    label: 'Muito tempo sem comprar',
    shortLabel: 'Muito tempo',
    color: '#6b7280',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
  },
}

export const AVATAR_COLORS = [
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f97316',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#6366f1',
]

const FIRST_NAMES = [
  'Everton',
  'Maria',
  'Carlos',
  'Ana',
  'Pedro',
  'Juliana',
  'Rafael',
  'Larissa',
  'Thiago',
  'Fernanda',
  'Bruno',
  'Camila',
  'Diego',
  'Beatriz',
  'Lucas',
  'Patricia',
  'Gabriel',
  'Amanda',
  'Felipe',
  'Renata',
  'Rodrigo',
  'Vanessa',
  'Marcelo',
  'Aline',
  'Henrique',
  'Priscila',
  'André',
  'Tatiane',
  'Leandro',
  'Carla',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function phone(i: number) {
  const n = 900000000 + i * 137 + 7654321
  const s = String(n).slice(-9)
  return `(11) ${s.slice(0, 5)}-${s.slice(5)}`
}

function dateFromDay(year: number, month: number, day: number) {
  return `${pad(day)}/${pad(month)}/${year}`
}

const featured: Client[] = [
  {
    id: 'c1',
    nome: 'Everton',
    whatsapp: '(11) 98765-4321',
    ultimoPedido: '21/08/2026',
    frequenciaMedia: 18,
    produtoFavorito: 'Calabresa com Catupiry',
    valorMedio: 68,
    quantidadePedidos: 14,
    status: 'atrasado',
    avatarColor: AVATAR_COLORS[0],
  },
  {
    id: 'c2',
    nome: 'Maria',
    whatsapp: '(11) 91234-5678',
    ultimoPedido: '01/09/2026',
    frequenciaMedia: 14,
    produtoFavorito: 'Portuguesa',
    valorMedio: 62,
    quantidadePedidos: 22,
    status: 'proxima_compra',
    avatarColor: AVATAR_COLORS[1],
  },
  {
    id: 'c3',
    nome: 'Carlos',
    whatsapp: '(11) 99876-5432',
    ultimoPedido: '09/08/2026',
    frequenciaMedia: 20,
    produtoFavorito: 'Marguerita',
    valorMedio: 59,
    quantidadePedidos: 11,
    status: 'atrasado',
    avatarColor: AVATAR_COLORS[2],
  },
  {
    id: 'c4',
    nome: 'Ana',
    whatsapp: '(11) 92345-6789',
    ultimoPedido: '10/09/2026',
    frequenciaMedia: 15,
    produtoFavorito: 'Frango com Catupiry',
    valorMedio: 64,
    quantidadePedidos: 18,
    status: 'normal',
    avatarColor: AVATAR_COLORS[3],
  },
  {
    id: 'c5',
    nome: 'Pedro',
    whatsapp: '(11) 93456-7890',
    ultimoPedido: '25/08/2026',
    frequenciaMedia: 21,
    produtoFavorito: 'Quatro Queijos',
    valorMedio: 72,
    quantidadePedidos: 9,
    status: 'proxima_compra',
    avatarColor: AVATAR_COLORS[4],
  },
  {
    id: 'c6',
    nome: 'Juliana',
    whatsapp: '(11) 94567-8901',
    ultimoPedido: '05/09/2026',
    frequenciaMedia: 14,
    produtoFavorito: 'Calabresa com Catupiry',
    valorMedio: 60,
    quantidadePedidos: 16,
    status: 'normal',
    avatarColor: AVATAR_COLORS[5],
  },
  {
    id: 'c7',
    nome: 'Rafael',
    whatsapp: '(11) 95678-9012',
    ultimoPedido: '12/09/2026',
    frequenciaMedia: 30,
    produtoFavorito: 'Pepperoni',
    valorMedio: 66,
    quantidadePedidos: 7,
    status: 'proxima_compra',
    avatarColor: AVATAR_COLORS[6],
  },
  {
    id: 'c8',
    nome: 'Larissa',
    whatsapp: '(11) 96789-0123',
    ultimoPedido: '20/07/2026',
    frequenciaMedia: 25,
    produtoFavorito: 'Frango com Cheddar',
    valorMedio: 61,
    quantidadePedidos: 8,
    status: 'muito_tempo',
    avatarColor: AVATAR_COLORS[7],
  },
  {
    id: 'c9',
    nome: 'Thiago',
    whatsapp: '(11) 97890-1234',
    ultimoPedido: '02/09/2026',
    frequenciaMedia: 16,
    produtoFavorito: 'Calabresa com Catupiry',
    valorMedio: 58,
    quantidadePedidos: 19,
    status: 'normal',
    avatarColor: AVATAR_COLORS[8],
  },
  {
    id: 'c10',
    nome: 'Fernanda',
    whatsapp: '(11) 98901-2345',
    ultimoPedido: '15/08/2026',
    frequenciaMedia: 28,
    produtoFavorito: 'Portuguesa',
    valorMedio: 63,
    quantidadePedidos: 10,
    status: 'atrasado',
    avatarColor: AVATAR_COLORS[9],
  },
]

function remainingStatuses(): ClientStatus[] {
  const counts: Record<ClientStatus, number> = {
    normal: 42,
    proxima_compra: 17,
    atrasado: 22,
    muito_tempo: 9,
  }
  const list: ClientStatus[] = []
  ;(Object.keys(counts) as ClientStatus[]).forEach((status) => {
    for (let i = 0; i < counts[status]; i++) list.push(status)
  })
  return list
}

function buildClients(): Client[] {
  const extraStatus = remainingStatuses()
  const extra: Client[] = extraStatus.map((status, index) => {
    const i = index + 11
    const month = status === 'muito_tempo' ? 7 : status === 'atrasado' ? 8 : 9
    const day = ((index * 3) % 27) + 1
    return {
      id: `c${i}`,
      nome: FIRST_NAMES[i % FIRST_NAMES.length],
      whatsapp: phone(i),
      ultimoPedido: dateFromDay(2026, month, day),
      frequenciaMedia: 12 + (index % 20),
      produtoFavorito: PRODUCTS[index % PRODUCTS.length],
      valorMedio: 48 + ((index * 7) % 35),
      quantidadePedidos: 3 + (index % 24),
      status,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    }
  })
  return [...featured, ...extra]
}

export const clients: Client[] = buildClients()

export function countStatuses(list: Client[]) {
  return {
    normal: list.filter((c) => c.status === 'normal').length,
    proxima_compra: list.filter((c) => c.status === 'proxima_compra').length,
    atrasado: list.filter((c) => c.status === 'atrasado').length,
    muito_tempo: list.filter((c) => c.status === 'muito_tempo').length,
  }
}

export const statusCounts = countStatuses(clients)

export const DEFAULT_MESSAGE = `Olá, {nome}! 👋

Já está chegando aquela vontade de {produto_favorito}? 🍕

Você costuma pedir a cada {frequencia_media} dias e já faz {dias_sem_pedir} dias desde sua última pizza.

Que tal repetir seu pedido hoje?

Estamos te esperando! ❤️`

export const CAMPAIGN_PROMO_IMAGE = '/campaign-promo.jpg'

/** @deprecated use CAMPAIGN_PROMO_IMAGE */
export const PIZZA_IMAGE = CAMPAIGN_PROMO_IMAGE

/** @deprecated use CAMPAIGN_PROMO_IMAGE */
export const PIZZA_PROMO_IMAGE = CAMPAIGN_PROMO_IMAGE

export const recentMessages: SentMessage[] = [
  {
    id: 'm1',
    clientId: 'c1',
    preview: 'Já faz 21 dias que você não pede sua Calabresa...',
    status: 'respondeu',
    dateLabel: 'Hoje, 10:24',
    reply: 'Quero! 😍',
  },
  {
    id: 'm2',
    clientId: 'c2',
    preview: 'Já está chegando aquela vontade de Portuguesa?',
    status: 'entregue',
    dateLabel: 'Hoje, 09:15',
  },
  {
    id: 'm3',
    clientId: 'c3',
    preview: 'Sentimos sua falta! Já faz 35 dias desde sua út...',
    status: 'respondeu',
    dateLabel: 'Hoje, 08:47',
    reply: 'Pode mandar uma grande 😂',
  },
  {
    id: 'm4',
    clientId: 'c4',
    preview: 'Que tal um Frango com Catupiry hoje?',
    status: 'entregue',
    dateLabel: 'Hoje, 08:30',
  },
  {
    id: 'c5msg',
    clientId: 'c5',
    preview: 'Está na hora de repetir seu Quatro Queijos?',
    status: 'lida',
    dateLabel: 'Hoje, 07:52',
  },
]

export const campaignReplies: CampaignReply[] = [
  {
    id: 'r1',
    clientId: 'c1',
    reply: 'Quero!',
    outcome: 'pedido_realizado',
    orderValue: 68,
    datetime: '13/09 10:24',
  },
  {
    id: 'r2',
    clientId: 'c3',
    reply: 'Pode mandar uma grande!',
    outcome: 'pedido_realizado',
    orderValue: 72,
    datetime: '13/09 11:02',
  },
  {
    id: 'r3',
    clientId: 'c2',
    reply: 'Sim, por favor!',
    outcome: 'pedido_realizado',
    orderValue: 62,
    datetime: '13/09 11:45',
  },
  {
    id: 'r4',
    clientId: 'c4',
    reply: 'Hoje não, semana que vem eu peço.',
    outcome: 'interessado',
    datetime: '13/09 12:10',
  },
  {
    id: 'r5',
    clientId: 'c5',
    reply: 'Qual o valor da grande?',
    outcome: 'em_negociacao',
    datetime: '13/09 12:34',
  },
]

export const campaignEvolution = [
  { hour: '10:00', sent: 12, replies: 1, orders: 0 },
  { hour: '11:00', sent: 28, replies: 6, orders: 3 },
  { hour: '12:00', sent: 38, replies: 10, orders: 5 },
  { hour: '13:00', sent: 42, replies: 12, orders: 7 },
  { hour: '14:00', sent: 44, replies: 14, orders: 8 },
  { hour: '15:00', sent: 45, replies: 15, orders: 9 },
  { hour: '16:00', sent: 45, replies: 16, orders: 9 },
  { hour: '17:00', sent: 45, replies: 17, orders: 10 },
  { hour: '18:00', sent: 45, replies: 17, orders: 10 },
  { hour: '19:00', sent: 45, replies: 18, orders: 11 },
  { hour: '20:00', sent: 45, replies: 18, orders: 11 },
]

export const AUDIENCE_OPTIONS: {
  key: AudienceKey
  title: string
  countLabel: string
  description: string
}[] = [
  {
    key: 'proxima_compra',
    title: 'Próxima compra',
    countLabel: `${statusCounts.proxima_compra} clientes`,
    description: 'Clientes que estão chegando na hora de comprar novamente.',
  },
  {
    key: 'atrasado',
    title: 'Atrasados',
    countLabel: `${statusCounts.atrasado} clientes`,
    description: 'Clientes que já deveriam ter comprado.',
  },
  {
    key: 'muito_tempo',
    title: 'Muito tempo sem comprar',
    countLabel: `${statusCounts.muito_tempo} clientes`,
    description: 'Clientes inativos há mais de 60 dias.',
  },
  {
    key: 'personalizado',
    title: 'Personalizado',
    countLabel: 'Selecionar',
    description: 'Escolha manualmente os clientes.',
  },
]

export function getClient(id: string) {
  return clients.find((c) => c.id === id)
}

export function daysWithoutOrder(ultimoPedido: string, today = new Date(2026, 8, 14)) {
  const [d, m, y] = ultimoPedido.split('/').map(Number)
  const last = new Date(y, m - 1, d)
  return Math.max(1, Math.round((today.getTime() - last.getTime()) / 86400000))
}

export function personalizeMessage(template: string, client: Client) {
  return template
    .replaceAll('{nome}', client.nome)
    .replaceAll('{produto_favorito}', client.produtoFavorito)
    .replaceAll('{frequencia_media}', String(client.frequenciaMedia))
    .replaceAll('{dias_sem_pedir}', String(daysWithoutOrder(client.ultimoPedido)))
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

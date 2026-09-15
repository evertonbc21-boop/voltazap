import type { Segment } from '../context/SettingsContext'

export type MessageMode = 'ai' | 'custom' | 'template'

export interface MessageTemplate {
  id: string
  title: string
  body: string
}

const PRODUCT_WORD: Record<Segment, string> = {
  Pizzaria: 'pizza',
  Restaurante: 'prato favorito',
  Hamburgueria: 'hambúrguer',
  Barbearia: 'corte',
  'Salão de beleza': 'serviço',
  Clínica: 'consulta',
  'Pet Shop': 'serviço pet',
  Outro: 'pedido',
}

const EMOJI: Record<Segment, string> = {
  Pizzaria: '🍕',
  Restaurante: '🍽️',
  Hamburgueria: '🍔',
  Barbearia: '✂️',
  'Salão de beleza': '💅',
  Clínica: '🩺',
  'Pet Shop': '🐾',
  Outro: '✨',
}

export function getSegmentEmoji(segment: Segment) {
  return EMOJI[segment]
}

export function getProductWord(segment: Segment) {
  return PRODUCT_WORD[segment]
}

export function getAiSuggestions(segment: Segment): string[] {
  const product = PRODUCT_WORD[segment]
  const emoji = EMOJI[segment]

  const base = [
    `Olá, {nome}! 👋

Já está chegando aquela vontade de {produto_favorito}? ${emoji}

Você costuma pedir a cada {frequencia_media} dias e já faz {dias_sem_pedir} dias desde o último ${product}.

Que tal repetir seu pedido hoje?

Estamos te esperando! ❤️`,
    `Oi, {nome}! ${emoji}

Sentimos sua falta! Já faz {dias_sem_pedir} dias sem o seu {produto_favorito}.

Seu intervalo médio é de {frequencia_media} dias — está na hora de voltar.

Posso reservar o seu pedido favorito?`,
    `{nome}, tudo bem? 👋

Preparei algo especial: {produto_favorito} ${emoji}

Faz {dias_sem_pedir} dias desde a última vez (você costuma voltar a cada {frequencia_media} dias).

Que tal hoje? Estamos te esperando!`,
  ]

  if (segment === 'Barbearia' || segment === 'Salão de beleza' || segment === 'Clínica' || segment === 'Pet Shop') {
    return [
      `Olá, {nome}! 👋

Já faz {dias_sem_pedir} dias desde o seu último {produto_favorito}. ${emoji}

Você costuma agendar a cada {frequencia_media} dias.

Quer que eu reserve um horário pra você?

Estamos te esperando! ❤️`,
      `Oi, {nome}! ${emoji}

Hora de cuidar do que importa: {produto_favorito}.

Seu intervalo médio é de {frequencia_media} dias e já passou um tempinho ({dias_sem_pedir} dias).

Posso agendar pra você?`,
      `{nome}, sentimos sua falta! 👋

Que tal marcar de novo o seu {produto_favorito}? ${emoji}

Faz {dias_sem_pedir} dias — normalmente você volta a cada {frequencia_media} dias.

Responde aqui e a gente confirma o horário!`,
    ]
  }

  return base
}

export function getMessageTemplates(segment: Segment): MessageTemplate[] {
  const suggestions = getAiSuggestions(segment)
  const product = PRODUCT_WORD[segment]
  const emoji = EMOJI[segment]

  return [
    {
      id: 'saudade',
      title: 'Saudade do cliente',
      body: suggestions[0],
    },
    {
      id: 'lembrete',
      title: 'Lembrete de retorno',
      body: suggestions[1],
    },
    {
      id: 'convite',
      title: 'Convite direto',
      body: suggestions[2],
    },
    {
      id: 'rapido',
      title: 'Mensagem curta',
      body: `Oi, {nome}! ${emoji} Já faz {dias_sem_pedir} dias sem o seu {produto_favorito}. Quer repetir o ${product} hoje?`,
    },
  ]
}

export const MESSAGE_VARIABLES = [
  '{nome}',
  '{produto_favorito}',
  '{frequencia_media}',
  '{dias_sem_pedir}',
] as const

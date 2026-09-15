export type PlanId = 'essencial' | 'profissional' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  price: number
  clientsLimit: number
  usedClients: number
  messages: string
  features: string[]
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 49,
    clientsLimit: 500,
    usedClients: 320,
    messages: '300 mensagens/mês',
    features: [
      'Até 500 clientes',
      '300 mensagens/mês',
      'Motor de reativação',
      'Mensagens personalizadas',
      '2 campanhas por mês',
    ],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 99,
    clientsLimit: 2000,
    usedClients: 1250,
    messages: '1.500 mensagens/mês',
    popular: true,
    features: [
      'Até 2.000 clientes',
      '1.500 mensagens/mês',
      'Motor de reativação',
      'IA para criar mensagens',
      'Campanhas ilimitadas',
      'Agendamento de mensagens',
      'Relatórios completos',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 199,
    clientsLimit: 10000,
    usedClients: 1840,
    messages: '5.000 mensagens/mês',
    features: [
      'Até 10.000 clientes',
      '5.000 mensagens/mês',
      'Motor de reativação',
      'IA para criar mensagens',
      'Campanhas ilimitadas',
      'Agendamento',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
]

export function getPlan(id: PlanId) {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[1]
}

export function formatPlanPrice(price: number) {
  return `R$${price}/mês`
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function formatTrialDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

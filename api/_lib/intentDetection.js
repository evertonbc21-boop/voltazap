/**
 * Heurísticas leves para intenção / status / valor.
 * Preparado para ser substituído por Typebot ou LLM depois.
 *
 * Regra: interesse em pedir ≠ pedido realizado.
 * Valor/faturamento só com confirmação real + valor explícito.
 */

const DECLINE_RE =
  /\b(não quero|nao quero|não preciso|nao preciso|agora não|agora nao|obrigad[oa],? mas não)\b/i

const NEGOTIATION_RE =
  /\b(desconto|promoção|promocao|promo|mais barato|parcel|combinar|negoci|talvez|depois|amanhã|amanha)\b/i

/** Confirmação explícita de pedido já fechado. */
const ORDER_CONFIRMED_RE =
  /\b(já pedi|ja pedi|pedido (feito|confirmado|fechado|realizado)|fechei( o pedido)?|paguei|confirma(do)?( o)? pedido|pedido ok|fechado por)\b/i

/** Demonstração de interesse em pedir (ainda não é venda). */
const INTEREST_RE =
  /\b(quero fazer um pedido|gostaria de (fazer um )?pedido|quero pedir|fazer um pedido|quero|interessad|me interessa|quanto custa|preço|preco|cardápio|cardapio|menu|manda|mandar|pode mandar|pode enviar|envia|enviar)\b/i

const VALUE_RE = /(?:r\$\s*)(\d{1,5}(?:[.,]\d{2})?)|\b(\d{1,5}[.,]\d{2})\b/gi

/**
 * @param {string} text
 * @returns {{
 *   intent: string,
 *   intentLabel: string,
 *   outcome: 'pedido_realizado' | 'interessado' | 'sem_resposta',
 *   orderValue?: number,
 *   conversationStatus: string,
 *   confidence: number,
 * }}
 */
export function analyzeInboundText(text = '') {
  const body = String(text || '').trim()
  if (!body) {
    return {
      intent: 'unknown',
      intentLabel: 'Sem resposta',
      outcome: 'sem_resposta',
      conversationStatus: 'empty',
      confidence: 0,
    }
  }

  const orderValue = extractOrderValue(body)

  if (DECLINE_RE.test(body)) {
    return {
      intent: 'decline',
      intentLabel: 'Sem resposta',
      outcome: 'sem_resposta',
      conversationStatus: 'declined',
      confidence: 0.7,
    }
  }

  // Pedido realizado só com confirmação explícita E valor
  if (ORDER_CONFIRMED_RE.test(body) && orderValue != null) {
    return {
      intent: 'order_confirmed',
      intentLabel: 'Pedido realizado',
      outcome: 'pedido_realizado',
      orderValue,
      conversationStatus: 'order_confirmed',
      confidence: 0.9,
    }
  }

  if (NEGOTIATION_RE.test(body) || INTEREST_RE.test(body)) {
    return {
      intent: 'interest',
      intentLabel: 'Interessado',
      outcome: 'interessado',
      conversationStatus: 'interested',
      confidence: 0.75,
    }
  }

  // Qualquer outra resposta de texto = respondeu / interessado (sem inventar pedido)
  return {
    intent: 'reply',
    intentLabel: 'Interessado',
    outcome: 'interessado',
    conversationStatus: 'replied',
    confidence: 0.45,
  }
}

function extractOrderValue(body) {
  const values = []
  let match
  VALUE_RE.lastIndex = 0
  while ((match = VALUE_RE.exec(body)) !== null) {
    const raw = (match[1] || match[2] || '').replace(',', '.')
    const num = Number(raw)
    if (Number.isFinite(num) && num > 0 && num < 100000) values.push(num)
  }
  return values.length ? values[values.length - 1] : undefined
}

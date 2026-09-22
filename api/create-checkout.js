import { silenceDep0169 } from './_lib/silenceDep0169.js'
silenceDep0169()

const PLAN_PRICES = {
  essencial: 4900,
  profissional: 9900,
  premium: 19900,
}

const PLAN_NAMES = {
  essencial: 'VoltaZap Essencial',
  profissional: 'VoltaZap Profissional',
  premium: 'VoltaZap Premium',
}

const PRICE_ENV = {
  essencial: 'STRIPE_PRICE_ESSENCIAL',
  profissional: 'STRIPE_PRICE_PROFISSIONAL',
  premium: 'STRIPE_PRICE_PREMIUM',
}

/**
 * Cria sessão Stripe Checkout (assinatura mensal).
 * Sem STRIPE_SECRET_KEY → { demo: true } para o front liberar em modo teste.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const planId = body.planId
  if (!planId || !PLAN_PRICES[planId]) {
    return res.status(400).json({ error: 'Plano inválido.' })
  }

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    return res.status(200).json({ demo: true })
  }

  const origin =
    (typeof req.headers.origin === 'string' && req.headers.origin) ||
    process.env.APP_URL ||
    'https://www.voltazap.com.br'

  const priceId = process.env[PRICE_ENV[planId]]

  try {
    const params = new URLSearchParams()
    params.set('mode', 'subscription')
    params.set('success_url', `${origin}/assinar/sucesso?plan=${planId}&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/assinar?cancelado=1`)
    params.set('allow_promotion_codes', 'true')
    params.set('locale', 'pt-BR')
    params.set('metadata[planId]', planId)
    params.set('subscription_data[metadata][planId]', planId)

    if (priceId) {
      params.set('line_items[0][price]', priceId)
      params.set('line_items[0][quantity]', '1')
    } else {
      params.set('line_items[0][price_data][currency]', 'brl')
      params.set('line_items[0][price_data][unit_amount]', String(PLAN_PRICES[planId]))
      params.set('line_items[0][price_data][recurring][interval]', 'month')
      params.set('line_items[0][price_data][product_data][name]', PLAN_NAMES[planId])
      params.set('line_items[0][quantity]', '1')
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()
    if (!stripeRes.ok || !session.url) {
      return res.status(502).json({
        error: session?.error?.message || 'Falha ao criar sessão Stripe.',
      })
    }

    return res.status(200).json({ url: session.url, id: session.id })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro no checkout.',
    })
  }
}

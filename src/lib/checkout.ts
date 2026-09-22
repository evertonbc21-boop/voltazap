import type { PlanId } from '../data/plans'

/** Links de checkout por plano (Wix Payments, Stripe Payment Link, Asaas, etc.). */
export function getCheckoutUrl(planId: PlanId): string | null {
  const map: Record<PlanId, string | undefined> = {
    essencial: import.meta.env.VITE_CHECKOUT_URL_ESSENCIAL as string | undefined,
    profissional: import.meta.env.VITE_CHECKOUT_URL_PROFISSIONAL as string | undefined,
    premium: import.meta.env.VITE_CHECKOUT_URL_PREMIUM as string | undefined,
  }
  const url = map[planId]?.trim()
  return url || null
}

export function hasAnyCheckoutUrl(): boolean {
  return Boolean(
    getCheckoutUrl('essencial') || getCheckoutUrl('profissional') || getCheckoutUrl('premium'),
  )
}

/** Abre checkout externo ou chama API Stripe se configurada. */
export async function startCheckout(planId: PlanId): Promise<{ ok: boolean; error?: string; demo?: boolean }> {
  const direct = getCheckoutUrl(planId)
  if (direct) {
    window.location.assign(direct)
    return { ok: true }
  }

  try {
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = (await response.json()) as { url?: string; error?: string; demo?: boolean }
    if (response.ok && data.url) {
      window.location.assign(data.url)
      return { ok: true }
    }
    if (response.ok && data.demo) {
      return { ok: true, demo: true }
    }
    return { ok: false, error: data.error || 'Checkout não configurado.' }
  } catch {
    return { ok: false, error: 'Não foi possível iniciar o checkout.' }
  }
}

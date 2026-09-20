/** Nomes demo/legado — não devem aparecer em conta nova. */
export const DEMO_COMPANY_NAME = 'Pizzaria do Guto'
export const DEMO_OWNER_NAME = 'Guto'

/** Nomes antigos de teste que devem aparecer como VoltaZap. */
export const LEGACY_COMPANY_ALIASES: Record<string, string> = {
  'saas ito': 'VoltaZap',
  saas: 'VoltaZap',
}

export function sanitizeCompanyName(name: string | null | undefined): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower === DEMO_COMPANY_NAME.toLowerCase()) return ''
  const aliased = LEGACY_COMPANY_ALIASES[lower]
  if (aliased) return aliased
  return trimmed
}

export function sanitizePersonName(name: string | null | undefined): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower === DEMO_OWNER_NAME.toLowerCase()) return ''
  if (LEGACY_COMPANY_ALIASES[lower]) return ''
  if (lower.startsWith('saas')) return ''
  return trimmed
}

export function isBusinessConfigured(companyName: string | null | undefined): boolean {
  return Boolean(sanitizeCompanyName(companyName))
}

export function displayCompanyName(companyName: string | null | undefined, fallback = 'Seu negócio') {
  return sanitizeCompanyName(companyName) || fallback
}

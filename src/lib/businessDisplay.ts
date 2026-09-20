/** Nome demo legado — não deve aparecer em conta nova. */
export const DEMO_COMPANY_NAME = 'Pizzaria do Guto'
export const DEMO_OWNER_NAME = 'Guto'

export function sanitizeCompanyName(name: string | null | undefined): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  if (trimmed.toLowerCase() === DEMO_COMPANY_NAME.toLowerCase()) return ''
  return trimmed
}

export function sanitizePersonName(name: string | null | undefined): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  if (trimmed.toLowerCase() === DEMO_OWNER_NAME.toLowerCase()) return ''
  return trimmed
}

export function isBusinessConfigured(companyName: string | null | undefined): boolean {
  return Boolean(sanitizeCompanyName(companyName))
}

export function displayCompanyName(companyName: string | null | undefined, fallback = 'Seu negócio') {
  return sanitizeCompanyName(companyName) || fallback
}

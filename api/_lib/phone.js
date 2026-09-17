/**
 * Normaliza telefone BR para dígitos com DDI 55 (mesmo critério do front).
 */
export function normalizePhone(input = '') {
  const digits = String(input).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length < 10) return digits
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

export function phonesMatch(a, b) {
  const left = normalizePhone(a)
  const right = normalizePhone(b)
  if (!left || !right) return false
  if (left === right) return true
  // Compara pelos últimos 10–11 dígitos (sem DDI / variações)
  const leftTail = left.slice(-11)
  const rightTail = right.slice(-11)
  return leftTail === rightTail || left.slice(-10) === right.slice(-10)
}

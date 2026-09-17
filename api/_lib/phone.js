/**
 * Normaliza telefone BR para dígitos com DDI 55.
 * Remove +, espaços, parênteses, hífen e demais não-dígitos.
 */
export function normalizePhone(input = '') {
  let digits = String(input).replace(/\D/g, '')
  digits = digits.replace(/^0+/, '')
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
  const leftTail = left.slice(-11)
  const rightTail = right.slice(-11)
  return leftTail === rightTail || left.slice(-10) === right.slice(-10)
}

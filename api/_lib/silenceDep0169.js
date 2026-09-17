/**
 * Silencia DEP0169 (url.parse deprecated) emitido pelo runtime/Node 24
 * em cima das rotas serverless — não muda o comportamento da API.
 */

let installed = false

export function silenceUrlParseDeprecation() {
  if (installed || typeof process === 'undefined' || typeof process.emitWarning !== 'function') {
    return
  }
  installed = true

  const original = process.emitWarning.bind(process)
  process.emitWarning = (warning, ...args) => {
    const code =
      (typeof warning === 'object' && warning && 'code' in warning && warning.code) ||
      (typeof args[0] === 'object' && args[0] && args[0].code) ||
      (typeof args[0] === 'string' && args[0]) ||
      (typeof args[1] === 'string' && args[1])

    if (code === 'DEP0169') return
    if (typeof warning === 'string' && warning.includes('url.parse')) return
    if (typeof warning === 'object' && warning?.message?.includes?.('url.parse')) return

    return original(warning, ...args)
  }
}

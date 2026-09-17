/**
 * Helpers HTTP compartilhados pelas funções serverless.
 */

export function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

/**
 * Lê o body cru (necessário para validar assinatura da Meta).
 * No runtime da Vercel, acessar `req.body` pode lançar "Invalid JSON" se o body
 * estiver malformado — por isso o acesso fica em try/catch.
 * @param {import('http').IncomingMessage} req
 */
export function getRawBody(req) {
  try {
    const body = req.body
    if (typeof body === 'string') {
      return Promise.resolve(body)
    }
    if (Buffer.isBuffer(body)) {
      return Promise.resolve(body.toString('utf8'))
    }
    // Vercel às vezes já parseia JSON
    if (body && typeof body === 'object') {
      return Promise.resolve(JSON.stringify(body))
    }
  } catch {
    // Continua para leitura via stream / body vazio
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => finish(Buffer.concat(chunks).toString('utf8')))
    req.on('error', (err) => {
      if (settled) return
      settled = true
      reject(err)
    })
    // Se o body já foi consumido pelo runtime, 'end' pode não disparar
    setTimeout(() => finish(''), 0)
  })
}

export function parseJsonBody(req, rawBody) {
  try {
    const body = req.body
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      return body
    }
  } catch {
    // ignore
  }
  if (!rawBody) return {}
  return JSON.parse(rawBody)
}

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
 * @param {import('http').IncomingMessage} req
 */
export function getRawBody(req) {
  if (typeof req.body === 'string') {
    return Promise.resolve(req.body)
  }
  if (Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body.toString('utf8'))
  }
  // Vercel às vezes já parseia JSON
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(JSON.stringify(req.body))
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function parseJsonBody(req, rawBody) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  if (!rawBody) return {}
  return JSON.parse(rawBody)
}

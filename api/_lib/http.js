/**
 * Helpers HTTP compartilhados pelas funções serverless.
 */

export function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

/**
 * Lê req.body sem deixar o getter da Vercel derrubar o processo.
 * Na Vercel, `IncomingMessage.body` pode lançar `Error: Invalid JSON`
 * quando o Content-Type é JSON e o corpo está vazio/malformado.
 */
export function peekRequestBody(req) {
  try {
    return { ok: true, value: req.body }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * Lê e interpreta o body JSON de forma segura.
 * @returns {Promise<{ ok: true, body: object, raw: string } | { ok: false, reason: string, raw: string }>}
 */
export async function readJsonBodySafe(req) {
  const peeked = peekRequestBody(req)

  if (!peeked.ok) {
    return { ok: false, reason: 'invalid_json_getter', raw: '' }
  }

  const value = peeked.value

  if (value != null && typeof value === 'object' && !Buffer.isBuffer(value)) {
    let raw = ''
    try {
      raw = JSON.stringify(value)
    } catch {
      raw = ''
    }
    return { ok: true, body: value, raw }
  }

  if (typeof value === 'string') {
    return parseRawJson(value)
  }

  if (Buffer.isBuffer(value)) {
    return parseRawJson(value.toString('utf8'))
  }

  // Body ainda não materializado: tenta stream (sem acessar req.body de novo)
  const raw = await readRequestStream(req)
  if (!raw || !String(raw).trim()) {
    return { ok: false, reason: 'empty_body', raw: raw || '' }
  }
  return parseRawJson(raw)
}

function parseRawJson(raw) {
  const text = String(raw ?? '')
  if (!text.trim()) {
    return { ok: false, reason: 'empty_body', raw: text }
  }
  try {
    const body = JSON.parse(text)
    if (body == null || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, reason: 'invalid_json_shape', raw: text }
    }
    return { ok: true, body, raw: text }
  } catch {
    return { ok: false, reason: 'invalid_json_parse', raw: text }
  }
}

function readRequestStream(req) {
  return new Promise((resolve) => {
    // Se o runtime já consumiu o stream, não há o que ler
    if (req.readableEnded || req.complete) {
      resolve('')
      return
    }

    const chunks = []
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const onData = (chunk) => chunks.push(chunk)
    const onEnd = () => finish(Buffer.concat(chunks).toString('utf8'))
    const onError = () => finish(Buffer.concat(chunks).toString('utf8'))

    req.on('data', onData)
    req.on('end', onEnd)
    req.on('error', onError)

    // Evita hang se o stream nunca emitir end
    setTimeout(() => finish(Buffer.concat(chunks).toString('utf8')), 25)
  })
}

/**
 * @deprecated Preferir readJsonBodySafe no webhook.
 * Mantido para rotas auxiliares (ack) que já usavam getRawBody.
 */
export async function getRawBody(req) {
  const result = await readJsonBodySafe(req)
  if (result.ok) return result.raw
  return result.raw || ''
}

export async function parseJsonBody(req, rawBody) {
  const peeked = peekRequestBody(req)
  if (peeked.ok && peeked.value && typeof peeked.value === 'object' && !Buffer.isBuffer(peeked.value)) {
    return peeked.value
  }
  if (!rawBody) return {}
  try {
    return JSON.parse(rawBody)
  } catch {
    return {}
  }
}

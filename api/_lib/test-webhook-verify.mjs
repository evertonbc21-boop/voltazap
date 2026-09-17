/**
 * Teste local da verificação GET do webhook (sem subir servidor).
 * Simula o comportamento esperado pela Meta.
 */
import assert from 'node:assert/strict'

process.env.VERIFY_TOKEN = 'teste-token-local-meta'

const { default: handler } = await import('../webhooks/whatsapp/index.js')

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v
    },
    end(v) {
      this.body = v
    },
  }
}

async function run(query) {
  const req = {
    method: 'GET',
    query,
    url: `/api/webhooks/whatsapp?${new URLSearchParams(query).toString()}`,
    headers: { host: 'localhost' },
  }
  const res = mockRes()
  await handler(req, res)
  return res
}

const ok = await run({
  'hub.mode': 'subscribe',
  'hub.verify_token': 'teste-token-local-meta',
  'hub.challenge': 'challenge-abc-123',
})
assert.equal(ok.statusCode, 200)
assert.equal(ok.body, 'challenge-abc-123')
assert.match(String(ok.headers['Content-Type']), /text\/plain/)

const bad = await run({
  'hub.mode': 'subscribe',
  'hub.verify_token': 'errado',
  'hub.challenge': 'challenge-abc-123',
})
assert.equal(bad.statusCode, 403)

const fromUrlOnly = await run({})
// empty query → status JSON 200 health
assert.equal(fromUrlOnly.statusCode, 200)

console.log('OK: verificação Meta (GET hub.mode/token/challenge) passou localmente.')

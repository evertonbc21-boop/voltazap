/**
 * Testes locais do parsing seguro do webhook WhatsApp.
 * node api/_lib/test-webhook-body.mjs
 */
import assert from 'node:assert/strict'
import { peekRequestBody, readJsonBodySafe } from './http.js'
import { clearInboundStore } from './inboundStore.js'
import { processWhatsAppWebhook } from './processInbound.js'
import handler from '../webhooks/whatsapp/index.js'

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

function mockReq({ method = 'POST', body, throwOnBody = false, headers = {} } = {}) {
  const req = {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    url: '/api/webhooks/whatsapp',
    query: {},
    readableEnded: true,
    complete: true,
  }
  Object.defineProperty(req, 'body', {
    enumerable: true,
    get() {
      if (throwOnBody) {
        const err = new Error('Invalid JSON')
        err.statusCode = 400
        throw err
      }
      return body
    },
  })
  return req
}

// 1) Getter Invalid JSON não derruba
const peek = peekRequestBody(mockReq({ throwOnBody: true }))
assert.equal(peek.ok, false)

const invalid = await readJsonBodySafe(mockReq({ throwOnBody: true }))
assert.equal(invalid.ok, false)
assert.equal(invalid.reason, 'invalid_json_getter')

// 2) Payload objeto válido
const metaBody = {
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511999999999', phone_number_id: '123' },
            contacts: [{ profile: { name: 'Everton' }, wa_id: '5511987654321' }],
            messages: [
              {
                from: '5511987654321',
                id: 'wamid.body.test.001',
                timestamp: '1726500000',
                type: 'text',
                text: { body: 'Quero fazer um pedido' },
              },
            ],
          },
        },
      ],
    },
  ],
}

const valid = await readJsonBodySafe(mockReq({ body: metaBody }))
assert.equal(valid.ok, true)
assert.equal(valid.body.object, 'whatsapp_business_account')

// 3) String JSON válida
const fromString = await readJsonBodySafe(mockReq({ body: JSON.stringify(metaBody) }))
assert.equal(fromString.ok, true)

// 4) String inválida
const badString = await readJsonBodySafe(mockReq({ body: '{not-json' }))
assert.equal(badString.ok, false)

// 5) Handler: Invalid JSON getter → 200 controlado, sem throw
{
  const res = mockRes()
  await handler(mockReq({ throwOnBody: true }), res)
  assert.equal(res.statusCode, 200)
  const json = JSON.parse(res.body)
  assert.equal(json.ok, false)
  assert.equal(json.error, 'invalid_body')
}

// 6) Handler: payload Meta válido processa + idempotência
await clearInboundStore()
{
  const res = mockRes()
  await handler(mockReq({ body: metaBody }), res)
  assert.equal(res.statusCode, 200)
  const json = JSON.parse(res.body)
  assert.equal(json.ok, true)
  assert.equal(json.received.stored, 1)
}
{
  const res = mockRes()
  await handler(mockReq({ body: metaBody }), res)
  assert.equal(res.statusCode, 200)
  const json = JSON.parse(res.body)
  assert.equal(json.ok, true)
  assert.equal(json.received.stored, 0)
}

// 7) processInbound ainda classifica interesse sem inventar pedido
await clearInboundStore()
const processed = await processWhatsAppWebhook(metaBody, { source: 'meta_whatsapp' })
assert.equal(processed.events[0].analysis.outcome, 'interessado')
assert.equal(processed.events[0].analysis.intentLabel, 'Interessado')

console.log('OK: webhook body parsing seguro (válido, inválido, idempotente).')

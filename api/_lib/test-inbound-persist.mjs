/**
 * Teste ponta a ponta: webhook → store durável → GET inbound-messages.
 * node api/_lib/test-inbound-persist.mjs
 */
import assert from 'node:assert/strict'
import { clearInboundStore, listInboundEvents } from './inboundStore.js'
import { processWhatsAppWebhook } from './processInbound.js'
import inboundHandler from '../inbound-messages/index.js'

await clearInboundStore()

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '5511999999999',
              phone_number_id: '123456789',
            },
            contacts: [
              {
                profile: { name: 'Everton' },
                wa_id: '5511959097584',
              },
            ],
            messages: [
              {
                from: '5511959097584',
                id: 'wamid.persist.test.001',
                timestamp: '1726500000',
                text: { body: 'Quero fazer um pedido' },
                type: 'text',
              },
            ],
          },
        },
      ],
    },
  ],
}

const first = await processWhatsAppWebhook(payload, { source: 'meta_whatsapp' })
assert.equal(first.stored, 1)
assert.equal(first.events[0].fromPhone, '5511959097584')
assert.equal(first.events[0].contactName, 'Everton')
assert.equal(first.events[0].text, 'Quero fazer um pedido')
assert.equal(first.events[0].status, 'received')
assert.equal(first.events[0].analysis.intentLabel, 'Interessado')

const dup = await processWhatsAppWebhook(payload, { source: 'meta_whatsapp' })
assert.equal(dup.stored, 0)

const pending = await listInboundEvents({ pendingOnly: true })
assert.equal(pending.length, 1)
assert.equal(pending[0].waMessageId, 'wamid.persist.test.001')

const res = {
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
await inboundHandler({ method: 'GET', query: { pending: '1' } }, res)
assert.equal(res.statusCode, 200)
const json = JSON.parse(res.body)
assert.equal(json.ok, true)
assert.equal(json.count, 1)
assert.equal(json.events[0].text, 'Quero fazer um pedido')
assert.equal(json.events[0].fromPhone, '5511959097584')

console.log('OK: persistência inbound + GET /api/inbound-messages retorna a mensagem.')

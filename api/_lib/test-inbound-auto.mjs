/**
 * Teste local do recebimento automático com payload no formato real da Meta.
 * node api/_lib/test-inbound-auto.mjs
 */
import assert from 'node:assert/strict'
import { analyzeInboundText } from './intentDetection.js'
import { clearInboundStore, listInboundEvents } from './inboundStore.js'
import { parseWhatsAppWebhookBody } from './parseWhatsAppWebhook.js'
import { processWhatsAppWebhook } from './processInbound.js'

clearInboundStore()

const interest = analyzeInboundText('Quero fazer um pedido')
assert.equal(interest.outcome, 'interessado')
assert.equal(interest.intentLabel, 'Interessado')
assert.equal(interest.orderValue, undefined)

const confirmed = analyzeInboundText('Já pedi, fechei o pedido por R$ 68,00')
assert.equal(confirmed.outcome, 'pedido_realizado')
assert.equal(confirmed.orderValue, 68)

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
                wa_id: '5511987654321',
              },
            ],
            messages: [
              {
                from: '5511987654321',
                id: 'wamid.test.quero.pedido.001',
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

const parsed = parseWhatsAppWebhookBody(payload)
assert.equal(parsed.messages.length, 1)
assert.equal(parsed.messages[0].fromPhone, '5511987654321')
assert.equal(parsed.messages[0].contactName, 'Everton')
assert.equal(parsed.messages[0].text, 'Quero fazer um pedido')
assert.equal(parsed.messages[0].type, 'text')

const first = await processWhatsAppWebhook(payload, { source: 'meta_whatsapp' })
assert.equal(first.stored, 1)
assert.equal(first.events[0].source, 'meta_whatsapp')
assert.equal(first.events[0].text, 'Quero fazer um pedido')
assert.equal(first.events[0].analysis.outcome, 'interessado')
assert.equal(first.events[0].analysis.intentLabel, 'Interessado')
assert.equal(first.events[0].analysis.valorPedido, null)
assert.equal(first.events[0].analysis.pedidoRealizado, false)

const duplicate = await processWhatsAppWebhook(payload, { source: 'meta_whatsapp' })
assert.equal(duplicate.stored, 0, 'idempotência: mesmo wamid não grava de novo')

const pending = listInboundEvents({ pendingOnly: true })
assert.equal(pending.length, 1)
assert.equal(pending[0].waMessageId, 'wamid.test.quero.pedido.001')

console.log('OK: recebimento automático Meta — interesse sem inventar pedido; idempotente.')

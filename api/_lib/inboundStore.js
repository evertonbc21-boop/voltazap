/**
 * Store em memória (warm instances na Vercel).
 * Interface pronta para trocar por Redis/Postgres depois.
 *
 * @typedef {object} InboundEvent
 * @property {string} id
 * @property {'message' | 'status'} kind
 * @property {string} [waMessageId]
 * @property {string} [fromPhone]
 * @property {string} [contactName]
 * @property {string} [text]
 * @property {string} receivedAt ISO
 * @property {number} [timestamp] unix seconds
 * @property {string} [type]
 * @property {string} [status] Meta delivery status
 * @property {string} [phoneNumberId]
 * @property {object} [analysis]
 * @property {'whatsapp_cloud' | 'mock'} source
 * @property {boolean} processed
 * @property {object} [raw]
 */

const globalKey = '__voltazap_inbound_store__'

function getBucket() {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = {
      events: /** @type {InboundEvent[]} */ ([]),
      seenIds: new Set(),
    }
  }
  return globalThis[globalKey]
}

const MAX_EVENTS = 500

export function addInboundEvent(event) {
  const bucket = getBucket()
  const dedupeKey = event.waMessageId || event.id
  if (dedupeKey && bucket.seenIds.has(dedupeKey)) {
    return { stored: false, reason: 'duplicate', event: null }
  }
  if (dedupeKey) bucket.seenIds.add(dedupeKey)

  bucket.events.unshift(event)
  if (bucket.events.length > MAX_EVENTS) {
    const removed = bucket.events.splice(MAX_EVENTS)
    for (const item of removed) {
      if (item.waMessageId) bucket.seenIds.delete(item.waMessageId)
      bucket.seenIds.delete(item.id)
    }
  }
  return { stored: true, event }
}

export function listInboundEvents({ pendingOnly = true } = {}) {
  const bucket = getBucket()
  return bucket.events.filter((e) => (pendingOnly ? !e.processed : true))
}

export function ackInboundEvents(ids = []) {
  const bucket = getBucket()
  const set = new Set(ids)
  let count = 0
  for (const event of bucket.events) {
    if (set.has(event.id)) {
      event.processed = true
      count += 1
    }
  }
  return { acked: count }
}

export function clearInboundStore() {
  const bucket = getBucket()
  bucket.events = []
  bucket.seenIds = new Set()
}

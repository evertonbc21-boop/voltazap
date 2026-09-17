/**
 * Store durável de eventos inbound (compartilhado entre lambdas na região).
 * Usa Vercel Runtime Cache quando disponível; fallback em memória no local.
 */

import { getCache } from '@vercel/functions'

const CACHE_KEY = 'voltazap:inbound:v1'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 14 // 14 dias
const MAX_EVENTS = 500
const memoryKey = '__voltazap_inbound_store__'

/**
 * @typedef {object} InboundEvent
 * @property {string} id
 * @property {'message' | 'status'} kind
 * @property {string} [waMessageId]
 * @property {string} [fromPhone]
 * @property {string} [contactName]
 * @property {string} [text]
 * @property {string} receivedAt
 * @property {number} [timestamp]
 * @property {string} [type]
 * @property {string} [status]
 * @property {string} [phoneNumberId]
 * @property {object} [analysis]
 * @property {string} source
 * @property {boolean} processed
 * @property {object} [raw]
 */

/**
 * @typedef {{ events: InboundEvent[], seenIds: string[] }} StoreSnapshot
 */

function getMemoryBucket() {
  if (!globalThis[memoryKey]) {
    globalThis[memoryKey] = /** @type {StoreSnapshot} */ ({
      events: [],
      seenIds: [],
    })
  }
  return globalThis[memoryKey]
}

/**
 * @returns {Promise<StoreSnapshot>}
 */
async function loadSnapshot() {
  try {
    const cache = getCache({ namespace: 'voltazap' })
    const data = await cache.get(CACHE_KEY)
    if (data && typeof data === 'object' && Array.isArray(/** @type {any} */ (data).events)) {
      const snap = /** @type {StoreSnapshot} */ (data)
      // Espelha em memória para leituras rápidas na mesma instância
      const mem = getMemoryBucket()
      mem.events = snap.events
      mem.seenIds = Array.isArray(snap.seenIds) ? snap.seenIds : []
      return {
        events: [...snap.events],
        seenIds: [...(snap.seenIds || [])],
      }
    }
  } catch (error) {
    console.warn('inboundStore cache get failed, using memory', error?.message || error)
  }
  const mem = getMemoryBucket()
  return { events: [...mem.events], seenIds: [...mem.seenIds] }
}

/**
 * @param {StoreSnapshot} snapshot
 */
async function saveSnapshot(snapshot) {
  const trimmed = {
    events: snapshot.events.slice(0, MAX_EVENTS),
    seenIds: snapshot.seenIds.slice(-MAX_EVENTS * 2),
  }
  const mem = getMemoryBucket()
  mem.events = trimmed.events
  mem.seenIds = trimmed.seenIds

  try {
    const cache = getCache({ namespace: 'voltazap' })
    await cache.set(CACHE_KEY, trimmed, {
      ttl: CACHE_TTL_SECONDS,
      tags: ['voltazap-inbound'],
      name: 'voltazap-inbound-events',
    })
  } catch (error) {
    console.warn('inboundStore cache set failed, memory only', error?.message || error)
  }
}

/**
 * @param {InboundEvent} event
 */
export async function addInboundEvent(event) {
  const snapshot = await loadSnapshot()
  const dedupeKey = event.waMessageId || event.id
  if (dedupeKey && snapshot.seenIds.includes(dedupeKey)) {
    return { stored: false, reason: 'duplicate', event: null }
  }
  if (dedupeKey) snapshot.seenIds.push(dedupeKey)

  snapshot.events.unshift(event)
  if (snapshot.events.length > MAX_EVENTS) {
    snapshot.events = snapshot.events.slice(0, MAX_EVENTS)
  }

  await saveSnapshot(snapshot)
  return { stored: true, event }
}

export async function listInboundEvents({ pendingOnly = true } = {}) {
  const snapshot = await loadSnapshot()
  return snapshot.events.filter((e) => (pendingOnly ? !e.processed : true))
}

export async function ackInboundEvents(ids = []) {
  const snapshot = await loadSnapshot()
  const set = new Set(ids.map(String))
  let count = 0
  for (const event of snapshot.events) {
    if (set.has(event.id) && !event.processed) {
      event.processed = true
      count += 1
    }
  }
  if (count > 0) await saveSnapshot(snapshot)
  return { acked: count }
}

export async function clearInboundStore() {
  await saveSnapshot({ events: [], seenIds: [] })
}

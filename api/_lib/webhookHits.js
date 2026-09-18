/**
 * Ring buffer dos últimos hits do webhook (Runtime Cache).
 */

import { getCache } from '@vercel/functions'

const HITS_KEY = 'voltazap:webhook:hits:v1'
const MAX_HITS = 30
const TTL = 60 * 60 * 24 * 14
const memoryKey = '__voltazap_webhook_hits__'

function mem() {
  if (!globalThis[memoryKey]) globalThis[memoryKey] = []
  return globalThis[memoryKey]
}

export async function recordWebhookHit(hit) {
  const entry = {
    at: new Date().toISOString(),
    ...hit,
  }
  let hits = mem()
  try {
    const cache = getCache({ namespace: 'voltazap' })
    const data = await cache.get(HITS_KEY)
    if (Array.isArray(data)) hits = data
  } catch {
    /* memory */
  }

  hits = [entry, ...hits].slice(0, MAX_HITS)
  mem().splice(0, mem().length, ...hits)

  try {
    const cache = getCache({ namespace: 'voltazap' })
    await cache.set(HITS_KEY, hits, { ttl: TTL, name: 'voltazap-webhook-hits' })
  } catch {
    /* memory only */
  }
  return entry
}

export async function listWebhookHits() {
  try {
    const cache = getCache({ namespace: 'voltazap' })
    const data = await cache.get(HITS_KEY)
    if (Array.isArray(data)) {
      mem().splice(0, mem().length, ...data)
      return data
    }
  } catch {
    /* memory */
  }
  return [...mem()]
}

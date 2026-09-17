/**
 * Stub para encaminhar eventos ao Typebot no futuro.
 * Ative com TYPEBOT_WEBHOOK_URL no ambiente.
 */

export async function forwardToTypebot(payload) {
  const url = process.env.TYPEBOT_WEBHOOK_URL
  if (!url) {
    return { forwarded: false, reason: 'not_configured' }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.TYPEBOT_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.TYPEBOT_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        source: 'voltazap',
        ...payload,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('Typebot forward failed', response.status, text)
      return { forwarded: false, reason: 'http_error', status: response.status }
    }

    return { forwarded: true }
  } catch (error) {
    console.error('Typebot forward error', error)
    return { forwarded: false, reason: 'network_error' }
  }
}

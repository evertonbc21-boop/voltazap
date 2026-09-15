/** Future WhatsApp Business API adapter. */
export async function sendCampaignMessages(_payload: {
  clientIds: string[]
  template: string
}) {
  return { queued: true, provider: 'mock' as const }
}

/** Future LLM adapter for message suggestions. */
export async function suggestMessage(_context: { audience: string }) {
  return { provider: 'mock' as const }
}

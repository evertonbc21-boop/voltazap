import { getAiSuggestions } from '../data/messageTemplates'
import type { Segment } from '../context/SettingsContext'
import type { AudienceKey } from '../types'

export type AiSuggestProvider = 'openai' | 'mock'

export interface AiSuggestResult {
  suggestion: string
  provider: AiSuggestProvider
}

const AUDIENCE_LABEL: Record<AudienceKey, string> = {
  proxima_compra: 'clientes próximos da próxima compra',
  atrasado: 'clientes atrasados',
  muito_tempo: 'clientes há muito tempo sem pedir',
  personalizado: 'clientes selecionados manualmente',
}

/**
 * Tenta GPT via /api/suggest-message (OPENAI_API_KEY no servidor).
 * Em falha (sem chave, rede, local Vite), usa templates locais.
 */
export async function suggestCampaignMessage(input: {
  segment: Segment
  companyName: string
  audience: AudienceKey
  previousMessage?: string
}): Promise<AiSuggestResult> {
  try {
    const response = await fetch('/api/suggest-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment: input.segment,
        companyName: input.companyName,
        audience: AUDIENCE_LABEL[input.audience],
        previousMessage: input.previousMessage || undefined,
      }),
    })

    if (response.ok) {
      const data = (await response.json()) as { suggestion?: string; provider?: string }
      if (data.suggestion?.trim()) {
        return { suggestion: data.suggestion.trim(), provider: 'openai' }
      }
    }
  } catch {
    // fallback abaixo
  }

  const local = getAiSuggestions(input.segment)
  const seed = input.previousMessage
    ? (local.findIndex((m) => m === input.previousMessage) + 1) % local.length
    : Math.floor(Math.random() * local.length)
  return { suggestion: local[seed] ?? local[0], provider: 'mock' }
}

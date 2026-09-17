/**
 * Vercel serverless: gera sugestão de mensagem via OpenAI.
 * Configure OPENAI_API_KEY no painel da Vercel (Environment Variables).
 */

const SYSTEM_PROMPT = `Você escreve mensagens curtas de reativação de clientes via WhatsApp, em português do Brasil.
Regras:
- Tom amigável, comercial e natural (não robótico).
- Use obrigatoriamente estas variáveis literais (não invente nomes reais): {nome}, {produto_favorito}, {dias_sem_pedir}, {frequencia_media}.
- Máximo 900 caracteres.
- Pode usar 1–3 emojis relevantes ao segmento.
- Não use markdown, aspas envolventes nem explicações — responda só com o texto da mensagem.
- Varie o ângulo a cada pedido (saudade, timing, oferta suave, convite a agendar/pedir).`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'missing_key', provider: 'none' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const segment = body.segment || 'Negócio'
  const companyName = body.companyName || 'sua empresa'
  const audience = body.audience || 'clientes inativos'
  const previousMessage = body.previousMessage || ''

  const userPrompt = [
    `Empresa: ${companyName}`,
    `Segmento: ${segment}`,
    `Público da campanha: ${audience}`,
    previousMessage
      ? `Gere uma versão DIFERENTE desta mensagem (não copie):\n${previousMessage}`
      : 'Gere uma mensagem de reativação nova e persuasiva.',
  ].join('\n')

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.95,
        max_tokens: 450,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI error', response.status, errText)
      return res.status(502).json({ error: 'openai_failed', provider: 'openai' })
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    const suggestion = raw
      .replace(/^["“]|["”]$/g, '')
      .slice(0, 1000)

    if (!suggestion) {
      return res.status(502).json({ error: 'empty_response', provider: 'openai' })
    }

    return res.status(200).json({ suggestion, provider: 'openai' })
  } catch (error) {
    console.error('suggest-message error', error)
    return res.status(500).json({ error: 'server_error', provider: 'openai' })
  }
}

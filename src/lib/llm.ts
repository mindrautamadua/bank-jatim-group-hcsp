import 'server-only'

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function llmConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

// Panggil OpenRouter (kompatibel OpenAI Chat Completions).
export async function chatLLM(messages: ChatMsg[]): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY belum diset')
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'HCSP Strategic Assistant',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 700,
    }),
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content?.trim() ?? '(tidak ada jawaban)'
}

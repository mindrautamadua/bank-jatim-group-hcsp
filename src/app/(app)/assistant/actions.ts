'use server'

import { getSession } from '@/lib/auth'
import { answerQuestion, buildKnowledgeContext, SYSTEM_PROMPT, type Answer } from '@/lib/assistant'
import { chatLLM, llmConfigured, type ChatMsg } from '@/lib/llm'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export type AskResult =
  | { mode: 'llm'; text: string; suggestions: string[] }
  | { mode: 'rule'; answer: Answer; note?: string }

const DEFAULT_SUGGEST = [
  'Program apa yang paling berisiko?',
  'Apa dampak bila PP.6 terlambat?',
  'Area maturity mana yang gap-nya terbesar?',
  'Program apa yang paling fondasional?',
]

export async function askAssistant(question: string, history: ChatTurn[]): Promise<AskResult> {
  const user = await getSession()
  if (!user) {
    return { mode: 'rule', answer: { title: 'Sesi berakhir', blocks: [{ kind: 'text', text: 'Silakan masuk kembali untuk melanjutkan.' }], suggestions: [] } }
  }
  const q = (question || '').trim().slice(0, 500)
  if (!q) return { mode: 'rule', answer: await answerQuestion('') }

  if (llmConfigured()) {
    try {
      const kb = await buildKnowledgeContext()
      const messages: ChatMsg[] = [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${kb}` },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: q },
      ]
      const text = await chatLLM(messages)
      return { mode: 'llm', text, suggestions: DEFAULT_SUGGEST }
    } catch (e) {
      console.error('[assistant] LLM gagal, fallback ke mesin data:', e)
      const answer = await answerQuestion(q)
      return { mode: 'rule', answer, note: 'Layanan LLM sedang tidak tersedia. Menampilkan jawaban dari mesin penalaran data.' }
    }
  }

  const answer = await answerQuestion(q)
  return { mode: 'rule', answer, note: 'Mode data (OPENROUTER_API_KEY belum diset). Jawaban dihitung langsung dari knowledge graph & data.' }
}

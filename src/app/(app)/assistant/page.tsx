import { PageHeader, Badge } from '@/components/ui'
import AssistantChat from '@/components/AssistantChat'
import { llmConfigured } from '@/lib/llm'

export const dynamic = 'force-dynamic'

export default function AssistantPage() {
  const ai = llmConfigured()
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Strategic Assistant"
        subtitle="Tanya-jawab eksekusi Blueprint HCM, di-grounding ke data & knowledge graph agar akurat (tanpa mengarang angka). Telusuri dampak, dependensi, risiko, dan kematangan."
        right={
          ai
            ? <Badge className="bg-bbgreen-light text-bbgreen-dark">AI: gpt-4o-mini (OpenRouter)</Badge>
            : <Badge className="bg-amber-50 text-amber-700">Mode data (set OPENROUTER_API_KEY)</Badge>
        }
      />
      <AssistantChat />
    </div>
  )
}

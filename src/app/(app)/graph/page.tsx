import { getKnowledgeGraph } from '@/lib/graph'
import KnowledgeGraph from '@/components/KnowledgeGraph'
import { PageHeader } from '@/components/ui'
import { Anchor, GitFork } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GraphPage() {
  const data = await getKnowledgeGraph()

  const out = new Map<string, number>()
  const inn = new Map<string, number>()
  for (const r of data.relasi) {
    out.set(r.dari, (out.get(r.dari) ?? 0) + 1)
    inn.set(r.ke, (inn.get(r.ke) ?? 0) + 1)
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  const foundational = top(out)
  const dependent = top(inn).filter(([k]) => k !== 'PBI.1')

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Knowledge Graph Strategi"
        subtitle="Ontologi eksekusi HCM sebagai jaringan: sasaran strategis, rollup kematangan, dan unit penanggung jawab, dihubungkan relasi dependensi nyata dari Blueprint (PP fondasi -> PBI -> KS -> F)."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="bb-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-bbink">
            <Anchor size={16} className="text-bbgreen" /> Paling fondasional
          </div>
          <p className="mt-0.5 text-xs text-bbmuted">Node yang menjadi pendukung bagi paling banyak sasaran lain.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {foundational.map(([k, n]) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-lg bg-bbgreen-light px-2.5 py-1 text-xs font-semibold text-bbgreen-dark">
                <span className="font-mono">{k}</span>
                <span className="tabular-nums text-bbgreen">{n}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="bb-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-bbink">
            <GitFork size={16} className="text-bbamber" /> Paling bergantung
          </div>
          <p className="mt-0.5 text-xs text-bbmuted">Sasaran yang membutuhkan paling banyak dukungan untuk tercapai.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {dependent.map(([k, n]) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <span className="font-mono">{k}</span>
                <span className="tabular-nums text-bbamber">{n}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <KnowledgeGraph data={data} />
    </div>
  )
}

import Link from 'next/link'
import { Badge } from '@/components/ui'
import { ExternalLink } from 'lucide-react'
import type { Sasaran } from '@/lib/types'

// Header ringkas program untuk sub-halaman (benefit/budget/roadmap),
// dipakai baik di halaman penuh maupun modal.
export default function ProgramSubpageHeader({ sasaran, showKeyProgram = false }: { sasaran: Sasaran; showKeyProgram?: boolean }) {
  return (
    <div className="bb-card mb-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md px-2 py-0.5 font-mono text-sm font-bold text-white" style={{ background: sasaran.perspektif_warna ?? '#00814f' }}>{sasaran.kode}</span>
            <Badge className="bg-bbgreen-light text-bbgreen-dark">{sasaran.perspektif_nama}</Badge>
          </div>
          <h1 className="font-display text-xl font-bold leading-snug text-bbink">{sasaran.nama}</h1>
          {showKeyProgram && sasaran.key_program && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bbmuted">{sasaran.key_program}</p>}
        </div>
        <Link href={`/portfolio/${encodeURIComponent(sasaran.kode)}`} className="bb-press inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-bbgreen hover:underline">
          Detail program <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  )
}

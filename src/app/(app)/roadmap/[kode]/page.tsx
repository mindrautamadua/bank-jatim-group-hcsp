import Link from 'next/link'
import RoadmapDetailView from '@/components/RoadmapDetailView'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProgramRoadmapPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard" className="bb-press mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen">
        <ArrowLeft size={15} /> Kembali ke Dashboard
      </Link>
      <RoadmapDetailView kode={kode} />
    </div>
  )
}

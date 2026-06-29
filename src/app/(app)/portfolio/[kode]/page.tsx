import Link from 'next/link'
import ProgramDetailView from '@/components/ProgramDetailView'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProgramDetailPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params

  return (
    <div className="max-w-6xl">
      <Link href="/strategy-map" className="bb-press group mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen">
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Kembali ke Strategy Map
      </Link>
      <ProgramDetailView kode={kode} />
    </div>
  )
}

import Link from 'next/link'
import BenefitDetailView from '@/components/BenefitDetailView'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProgramBenefitsPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params

  return (
    <div className="max-w-4xl">
      <Link href="/benefits" className="bb-press mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen">
        <ArrowLeft size={15} /> Kembali ke Benefit Register
      </Link>
      <BenefitDetailView kode={kode} />
    </div>
  )
}

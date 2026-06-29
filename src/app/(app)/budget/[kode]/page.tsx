import Link from 'next/link'
import BudgetDetailView from '@/components/BudgetDetailView'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProgramBudgetPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params

  return (
    <div className="max-w-3xl">
      <Link href="/budget" className="bb-press mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen">
        <ArrowLeft size={15} /> Kembali ke Anggaran
      </Link>
      <BudgetDetailView kode={kode} />
    </div>
  )
}

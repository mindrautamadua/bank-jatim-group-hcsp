import Link from 'next/link'
import GovernanceDetailView from '@/components/GovernanceDetailView'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="max-w-4xl">
      <Link href="/governance" className="bb-press mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen">
        <ArrowLeft size={15} /> Kembali ke Governance
      </Link>
      <GovernanceDetailView id={id} />
    </div>
  )
}

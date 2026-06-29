import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import RouteModal from '@/components/RouteModal'
import GovernanceDetailView from '@/components/GovernanceDetailView'

export const dynamic = 'force-dynamic'

export default async function MeetingModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <RouteModal>
      <Suspense fallback={<div className="grid place-items-center py-24 text-bbgreen"><Loader2 className="animate-spin" /></div>}>
        <GovernanceDetailView id={id} />
      </Suspense>
    </RouteModal>
  )
}

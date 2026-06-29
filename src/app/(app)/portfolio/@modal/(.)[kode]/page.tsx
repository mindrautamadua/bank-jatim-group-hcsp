import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import RouteModal from '@/components/RouteModal'
import ProgramDetailView from '@/components/ProgramDetailView'

export const dynamic = 'force-dynamic'

export default async function ProgramModal({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params
  return (
    <RouteModal>
      <Suspense fallback={<div className="grid place-items-center py-24 text-bbgreen"><Loader2 className="animate-spin" /></div>}>
        <ProgramDetailView kode={kode} />
      </Suspense>
    </RouteModal>
  )
}

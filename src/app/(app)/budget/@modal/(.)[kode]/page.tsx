import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import RouteModal from '@/components/RouteModal'
import BudgetDetailView from '@/components/BudgetDetailView'

export const dynamic = 'force-dynamic'

export default async function BudgetModal({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params
  return (
    <RouteModal>
      <Suspense fallback={<div className="grid place-items-center py-24 text-bbgreen"><Loader2 className="animate-spin" /></div>}>
        <BudgetDetailView kode={kode} />
      </Suspense>
    </RouteModal>
  )
}

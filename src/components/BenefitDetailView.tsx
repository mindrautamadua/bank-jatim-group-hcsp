import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getSasaranByKode } from '@/lib/queries'
import { getBenefitsForSasaran } from '@/lib/benefit'
import BenefitManager from '@/components/BenefitManager'
import ProgramSubpageHeader from '@/components/ProgramSubpageHeader'

// Isi detail benefit program. Dipakai halaman penuh /benefits/[kode] DAN modal.
export default async function BenefitDetailView({ kode }: { kode: string }) {
  const k = decodeURIComponent(kode)
  const [sasaran, benefits, user] = await Promise.all([getSasaranByKode(k), getBenefitsForSasaran(k), getSession()])
  if (!sasaran) notFound()
  const canEdit = isEditor(user?.role)

  return (
    <>
      <ProgramSubpageHeader sasaran={sasaran} />
      <BenefitManager kode={sasaran.kode} benefits={benefits} canEdit={canEdit} />
    </>
  )
}

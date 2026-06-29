import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getSasaranByKode } from '@/lib/queries'
import { getMilestonesForSasaran } from '@/lib/milestone'
import MilestoneManager from '@/components/MilestoneManager'
import ProgramSubpageHeader from '@/components/ProgramSubpageHeader'

// Isi detail roadmap/milestone program. Dipakai halaman penuh /roadmap/[kode] DAN modal.
export default async function RoadmapDetailView({ kode }: { kode: string }) {
  const k = decodeURIComponent(kode)
  const [sasaran, milestones, user] = await Promise.all([getSasaranByKode(k), getMilestonesForSasaran(k), getSession()])
  if (!sasaran) notFound()
  const canEdit = isEditor(user?.role)

  return (
    <>
      <ProgramSubpageHeader sasaran={sasaran} showKeyProgram />
      <MilestoneManager kode={sasaran.kode} milestones={milestones} canEdit={canEdit} now={new Date()} />
    </>
  )
}

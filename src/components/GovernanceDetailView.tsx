import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getMeeting, getDecisions, getActions } from '@/lib/governance'
import { getAllSasaran } from '@/lib/queries'
import MeetingWorkspace from '@/components/MeetingWorkspace'

// Isi detail rapat governance. Dipakai halaman penuh /governance/[id] DAN modal.
export default async function GovernanceDetailView({ id }: { id: string }) {
  const mid = Number(id)
  if (!Number.isFinite(mid)) notFound()

  const [meeting, decisions, actions, sasaran, user] = await Promise.all([
    getMeeting(mid), getDecisions(mid), getActions(mid), getAllSasaran(), getSession(),
  ])
  if (!meeting) notFound()
  const canEdit = isEditor(user?.role)
  const sasaranOptions = sasaran.map((s) => ({ kode: s.kode, nama: s.nama }))

  return (
    <MeetingWorkspace
      meeting={meeting}
      decisions={decisions}
      actions={actions}
      sasaranOptions={sasaranOptions}
      canEdit={canEdit}
    />
  )
}

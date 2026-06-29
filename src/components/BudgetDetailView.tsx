import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getSasaranByKode } from '@/lib/queries'
import { getAnggaranForSasaran } from '@/lib/anggaran'
import AnggaranManager from '@/components/AnggaranManager'
import ProgramSubpageHeader from '@/components/ProgramSubpageHeader'

// Isi detail anggaran program. Dipakai halaman penuh /budget/[kode] DAN modal.
export default async function BudgetDetailView({ kode }: { kode: string }) {
  const k = decodeURIComponent(kode)
  const [sasaran, rows, user] = await Promise.all([getSasaranByKode(k), getAnggaranForSasaran(k), getSession()])
  if (!sasaran) notFound()
  const canEdit = isEditor(user?.role)

  return (
    <>
      <ProgramSubpageHeader sasaran={sasaran} />
      <AnggaranManager kode={sasaran.kode} rows={rows} canEdit={canEdit} />
    </>
  )
}

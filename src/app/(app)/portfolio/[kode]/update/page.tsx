import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getSasaranByKode, getIKForSasaran } from '@/lib/queries'
import { PageHeader, Badge, EmptyState } from '@/components/ui'
import PmoUpdateForm from '@/components/PmoUpdateForm'
import { ArrowLeft, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PmoUpdatePage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params
  const decoded = decodeURIComponent(kode)

  const sasaran = await getSasaranByKode(decoded)
  if (!sasaran) notFound()

  const user = await getSession()
  const canEdit = isEditor(user?.role)

  return (
    <div className="max-w-4xl">
      <Link
        href={`/portfolio/${encodeURIComponent(decoded)}`}
        className="bb-press group mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen"
      >
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Kembali ke Program
      </Link>

      <PageHeader
        title="Update PMO"
        subtitle="Perbarui realisasi indikator kinerja. Status, health & progress sasaran dihitung otomatis dari Key Program. Data target & blueprint tidak berubah."
        right={
          <span className="font-mono font-bold text-sm px-2.5 py-1 rounded" style={{ background: `${sasaran.perspektif_warna ?? '#00814f'}1a`, color: sasaran.perspektif_warna ?? '#00814f' }}>
            {sasaran.kode}
          </span>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className="bg-bbgreen-light text-bbgreen-dark">{sasaran.perspektif_nama}</Badge>
        <span className="text-sm text-bbink">{sasaran.nama}</span>
      </div>

      {canEdit ? (
        <PmoUpdateForm sasaran={sasaran} iks={await getIKForSasaran(sasaran.id)} />
      ) : (
        <EmptyState
          icon={<Lock size={28} />}
          title="Akses terbatas"
          hint="Hanya pengguna dengan peran PMO atau Admin yang dapat memperbarui data eksekusi. Hubungi administrator bila Anda memerlukan akses."
        />
      )}
    </div>
  )
}

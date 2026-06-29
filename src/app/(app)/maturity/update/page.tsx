import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getMaturityDomains } from '@/lib/queries'
import { PageHeader, EmptyState } from '@/components/ui'
import MaturityUpdateForm from '@/components/MaturityUpdateForm'
import { ArrowLeft, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MaturityUpdatePage() {
  const user = await getSession()
  const canEdit = isEditor(user?.role)

  return (
    <div className="max-w-5xl">
      <Link
        href="/maturity"
        className="bb-press group mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbmuted transition-colors hover:text-bbgreen"
      >
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Kembali ke Maturity & Gap
      </Link>

      <PageHeader
        title="Update PMO - Realisasi Kematangan"
        subtitle="Isi realisasi tingkat kematangan HCM per sub-domain per tahun (skala 1-4). Baseline asesmen 2025 dan target roadmap tidak berubah."
      />

      {canEdit ? (
        <MaturityUpdateForm domains={await getMaturityDomains()} />
      ) : (
        <EmptyState
          icon={<Lock size={28} />}
          title="Akses terbatas"
          hint="Hanya pengguna dengan peran PMO atau Admin yang dapat memperbarui data kematangan. Hubungi administrator bila Anda memerlukan akses."
        />
      )}
    </div>
  )
}

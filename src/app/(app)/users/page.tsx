import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listUsers, getUserStats } from '@/lib/users'
import { roleBadge, roleLabel } from '@/lib/users-constants'
import { PageHeader, StatCard } from '@/components/ui'
import UserAdmin from '@/components/UserAdmin'
import { Users, ShieldCheck, UserCheck, UserCog, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/dashboard')

  const [users, stats] = await Promise.all([listUsers(), getUserStats()])

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola akun, peran, dan akses platform HCSP."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Pengguna" value={stats.total} sub={`${stats.active} aktif`} accent="var(--bb-green)" icon={<Users size={20} />} />
        <StatCard label="Administrator" value={stats.admin} sub="akses penuh" accent="#7A4FA0" icon={<ShieldCheck size={20} />} />
        <StatCard label="PMO" value={stats.pmo} sub="input & update eksekusi" accent="var(--bb-green)" icon={<UserCog size={20} />} />
        <StatCard label="Penanggung Jawab" value={stats.viewer} sub="ajukan / setujui laporan" accent="var(--bb-amber)" icon={<UserCheck size={20} />} />
      </div>

      <RoleLegend />

      <UserAdmin users={users} currentUserId={user.id} />
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadge[role] ?? 'bg-gray-100 text-gray-600'}`}>{roleLabel[role] ?? role}</span>
}

function RoleLegend() {
  return (
    <div className="bb-card mb-6 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-bbink">
        <Info size={17} className="text-bbgreen" /> Peran &amp; akses
      </h2>
      <ul className="space-y-2.5 text-sm leading-relaxed text-bbmuted">
        <li className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
          <span className="shrink-0"><RolePill role="admin" /></span>
          <span>Mengelola seluruh data <span className="font-medium text-bbink">dan akun pengguna</span> (akses penuh).</span>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
          <span className="shrink-0"><RolePill role="pmo" /></span>
          <span>Menginput &amp; memperbarui <span className="font-medium text-bbink">data eksekusi lintas sasaran</span>: realisasi IK, tingkat kematangan, serta data pendukung (governance, dokumen, anggaran, snapshot tren). <span className="font-medium text-bbink">Status, health &amp; progress sasaran dihitung otomatis</span>; progress key program dikelola Penanggung Jawab. <span className="text-bbfaint">Bukan PIC program.</span></span>
        </li>
        <li className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
          <span className="shrink-0"><RolePill role="viewer" /></span>
          <span>Mengajukan &amp; menyetujui update <span className="font-medium text-bbink">kegiatan utama dan hasil pekerjaan</span> pada program unitnya. Bila diberi <span className="font-medium text-bbink">Unit / Divisi</span>, otomatis menjadi PIC kegiatan — <span className="font-medium text-bbink">Utama</span> (memverifikasi/menyetujui laporan) atau <span className="font-medium text-bbink">Pendukung</span> (mengajukan laporan + evidence), sesuai pemetaan PIC tiap sasaran. Tanpa unit, hanya dapat melihat data.</span>
        </li>
      </ul>
      <p className="mt-3 rounded-lg bg-bbgreen-light/30 px-3 py-2 text-xs text-bbmuted">
        <span className="font-semibold text-bbink">PMO ≠ Penanggung Jawab.</span> PMO mengelola data eksekusi keseluruhan platform; Penanggung Jawab hanya menangani alur laporan kegiatan di program unitnya.
      </p>
    </div>
  )
}

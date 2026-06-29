import { getGanttData } from '@/lib/gantt'
import { getSession } from '@/lib/auth'
import { PageHeader, StatCard } from '@/components/ui'
import GanttChart from '@/components/GanttChart'
import PendingVerificationCard from '@/components/PendingVerificationCard'
import { GanttChartSquare, FolderKanban, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GanttPage() {
  const [programs, user] = await Promise.all([getGanttData(), getSession()])
  const totalKeg = programs.reduce((a, p) => a + p.kegiatan.length, 0)
  const diverifikasi = programs.reduce((a, p) => a + p.kegiatan.filter((k) => k.status === 'Diverifikasi').length, 0)
  const avg = programs.length ? Math.round(programs.reduce((a, p) => a + p.overallProgress, 0) / programs.length) : 0

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Gantt Chart Program"
        subtitle="Linimasa 2026–2030. Klik program → Key Program untuk membuka Kegiatan Utama & Hasil Pelaksanaan. Pendukung mengunggah evidence per item hasil, Utama memverifikasi."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Program" value={programs.length} sub="sasaran strategis" accent="var(--bb-green)" icon={<FolderKanban size={20} />} />
        <StatCard label="Rata-rata Progress" value={`${avg}%`} sub="rata-rata progress key program" accent="var(--bb-gold)" icon={<GanttChartSquare size={20} />} />
        <StatCard label="Kegiatan Diverifikasi" value={diverifikasi} sub={`dari ${totalKeg} kegiatan`} accent="var(--bb-green)" icon={<CheckCircle2 size={20} />} />
        <PendingVerificationCard programs={programs} />
      </div>

      <GanttChart programs={programs} currentUserId={user?.id ?? null} isAdmin={user?.role === 'admin'} />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-bbmuted">
        <span className="font-medium text-bbink">Keterangan:</span>
        <Legend color="var(--bb-green)" label="Health hijau / Diverifikasi" />
        <Legend color="var(--bb-gold)" label="Health kuning" />
        <Legend color="var(--bb-red)" label="Health merah / Dikembalikan" />
        <Legend color="var(--bb-amber)" label="Menunggu verifikasi (Diajukan)" />
        <Legend color="#9aa8a3" label="Belum dikerjakan" />
        <span>Isian batang = % progress · garis merah putus-putus = posisi waktu kini.</span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-5 rounded" style={{ background: `${color}2e` }}>
        <span className="block h-full w-2/3 rounded" style={{ background: color }} />
      </span>
      {label}
    </span>
  )
}

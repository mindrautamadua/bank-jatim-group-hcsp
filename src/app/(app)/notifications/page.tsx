import Link from 'next/link'
import { getNotifications, type NotificationItem } from '@/lib/notifications'
import { getSession } from '@/lib/auth'
import { PageHeader, StatCard } from '@/components/ui'
import { Bell, AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const sevDot: Record<string, string> = { high: 'var(--bb-red)', medium: 'var(--bb-amber)', info: '#9aa8a3' }
const KATEGORI = ['Tindak Lanjut', 'Verifikasi Kegiatan', 'Milestone', 'Review Program', 'Benefit']

export default async function NotificationsPage() {
  const user = await getSession()
  const { items, count } = await getNotifications(user ? { unit: user.unit, role: user.role } : null)
  const high = items.filter((i) => i.severity === 'high').length
  const medium = items.filter((i) => i.severity === 'medium').length
  const info = items.filter((i) => i.severity === 'info').length
  const byKat = (k: string) => items.filter((i) => i.kategori === k)

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Notifikasi & Jatuh Tempo"
        subtitle="Hal-hal yang perlu tindakan, dihitung otomatis dari data: tindak lanjut terlambat, milestone lewat jadwal, program telat direview sesuai cadence Blueprint, dan benefit yang belum diukur."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Perlu Tindakan" value={count} sub="terlambat + jatuh tempo" accent="var(--bb-red)" icon={<Bell size={20} />} />
        <StatCard label="Terlambat" value={high} sub="prioritas tinggi" accent="var(--bb-red)" icon={<AlertTriangle size={20} />} />
        <StatCard label="Jatuh Tempo" value={medium} sub="perlu ditindaklanjuti" accent="var(--bb-amber)" icon={<Clock size={20} />} />
        <StatCard label="Informasi" value={info} sub="belum ada pembaruan" accent="#9aa8a3" icon={<CheckCircle2 size={20} />} />
      </div>

      {items.length === 0 ? (
        <div className="bb-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <CheckCircle2 size={30} className="mb-2 text-bbgreen" />
          <p className="text-sm font-medium text-bbink">Semua terkendali</p>
          <p className="mt-1 text-xs text-bbmuted">Tidak ada tindak lanjut terlambat, milestone tertunda, atau review yang jatuh tempo.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {KATEGORI.map((k) => {
            const list = byKat(k)
            if (list.length === 0) return null
            return (
              <div key={k} className="bb-card p-5">
                <h2 className="mb-3 font-display font-semibold text-bbink">{k} <span className="text-sm font-normal text-bbmuted">({list.length})</span></h2>
                <div className="divide-y divide-bbborder">
                  {list.map((it: NotificationItem) => (
                    <Link key={it.key} href={it.href} className="bb-press flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sevDot[it.severity] }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-bbink">{it.judul}</p>
                        <p className="text-xs text-bbmuted">{it.detail}</p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-bbgreen" />
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

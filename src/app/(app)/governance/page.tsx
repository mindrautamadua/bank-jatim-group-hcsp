import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { listMeetings, getActionTracker, getGovStats } from '@/lib/governance'
import { PageHeader, StatCard, Card, Badge } from '@/components/ui'
import GovCreateForm from '@/components/GovCreateForm'
import { CalendarDays, Gavel, ListTodo, AlertTriangle, ArrowRight, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GovernancePage() {
  const [meetings, tracker, stats, user] = await Promise.all([
    listMeetings(), getActionTracker(), getGovStats(), getSession(),
  ])
  const canEdit = user?.role === 'pmo' || user?.role === 'admin'

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Governance & Steering Committee"
        subtitle="Forum eksekusi Blueprint HCM: agenda rapat, Minutes of Meeting, Decision Log, dan Action Item Tracker yang menutup loop keputusan ke pelaksanaan."
        right={canEdit ? <GovCreateForm /> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Rapat" value={stats.meetings} sub={`${stats.held} terlaksana`} accent="var(--bb-green)" icon={<CalendarDays size={20} />} />
        <StatCard label="Keputusan" value={stats.decisions} sub="Decision log" accent="#7A4FA0" icon={<Gavel size={20} />} />
        <StatCard label="Tindak Lanjut Terbuka" value={stats.actionsOpen} sub="belum selesai" accent="var(--bb-amber)" icon={<ListTodo size={20} />} />
        <StatCard label="Terlambat" value={stats.actionsOverdue} sub="lewat jatuh tempo" accent="var(--bb-red)" icon={<AlertTriangle size={20} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Meetings list */}
        <Card hover className="lg:col-span-2">
          <h2 className="mb-3 font-display font-semibold text-bbink">Rapat</h2>
          {meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-bbborder bg-white/50 px-6 py-12 text-center">
              <CalendarDays size={26} className="mb-2 text-bbfaint" />
              <p className="text-sm font-medium text-bbink">Belum ada rapat</p>
              <p className="mt-1 text-xs text-bbmuted">{canEdit ? 'Klik "Rapat baru" untuk mencatat steering committee pertama.' : 'Rapat akan muncul di sini setelah dicatat PMO.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-bbborder">
              {meetings.map((m) => (
                <Link key={m.id} href={`/governance/${m.id}`} className="bb-press flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-bbink">{m.judul}</span>
                      <Badge className={m.status === 'Held' ? 'bg-bbgreen-light text-bbgreen-dark' : m.status === 'Cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}>{m.status}</Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-bbmuted">
                      <span>{m.jenis}</span>
                      {m.tanggal && <span className="inline-flex items-center gap-1"><Clock size={11} /> {m.tanggal}</span>}
                      <span>{m.decisions} keputusan</span>
                      <span>{m.actions_open} tindak lanjut</span>
                      {m.actions_overdue > 0 && <span className="font-medium text-bbred">{m.actions_overdue} terlambat</span>}
                    </div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-bbgreen" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Action tracker */}
        <Card hover>
          <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-bbink"><ListTodo size={17} className="text-bbgreen" /> Action Tracker</h2>
          <p className="mb-3 text-xs text-bbmuted">Tindak lanjut terbuka lintas rapat, terlambat di atas.</p>
          {tracker.length === 0 ? (
            <p className="text-sm text-bbfaint">Tidak ada tindak lanjut terbuka.</p>
          ) : (
            <div className="space-y-2">
              {tracker.slice(0, 10).map((a) => (
                <Link key={a.id} href={a.meeting_id ? `/governance/${a.meeting_id}` : '/governance'} className="bb-press block rounded-lg border border-bbborder px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full`} style={{ background: a.overdue ? 'var(--bb-red)' : a.status === 'In Progress' ? 'var(--bb-amber)' : '#9aa8a3' }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-bbink">{a.judul}</span>
                  </div>
                  <div className="mt-0.5 pl-4 text-xs text-bbmuted">
                    {a.pic && <span>{a.pic}</span>}{a.pic && a.due_date && ' · '}{a.due_date && <span className={a.overdue ? 'font-medium text-bbred' : ''}>{a.due_date}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

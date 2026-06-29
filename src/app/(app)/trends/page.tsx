import { getSession } from '@/lib/auth'
import { listSnapshots } from '@/lib/snapshot'
import { PageHeader, StatCard, Card } from '@/components/ui'
import { MaturityTrend, HealthTrend, ExecutionTrend, type TrendPoint } from '@/components/TrendCharts'
import SnapshotButton from '@/components/SnapshotButton'
import SnapshotDelete from '@/components/SnapshotDelete'
import { TrendingUp, Camera, ArrowUp, ArrowDown, Minus } from 'lucide-react'

export const dynamic = 'force-dynamic'

function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0 }

function Delta({ now, prev, unit = '', invert = false }: { now: number; prev?: number; unit?: string; invert?: boolean }) {
  if (prev === undefined) return null
  const d = now - prev
  if (d === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-bbmuted"><Minus size={11} /> 0{unit}</span>
  const good = invert ? d < 0 : d > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-bbgreen-dark' : 'text-bbred'}`}>
      {d > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(d).toFixed(unit === '' ? 2 : 0)}{unit}
    </span>
  )
}

export default async function TrendsPage() {
  const [snaps, user] = await Promise.all([listSnapshots(), getSession()])
  const canEdit = user?.role === 'pmo' || user?.role === 'admin'

  const data: TrendPoint[] = snaps.map((s) => ({
    periode: s.periode,
    maturity: s.maturity_overall,
    green: s.health_green, yellow: s.health_yellow, red: s.health_red,
    progress: s.avg_progress,
    msDone: pct(s.milestones_done, s.milestones_total),
    benReached: pct(s.benefits_reached, s.benefits_total),
    overdue: s.actions_overdue,
  }))
  const last = snaps[snaps.length - 1]
  const prev = snaps[snaps.length - 2]

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Snapshot & Tren Waktu"
        subtitle="Ambil potret metrik kunci tiap periode (mis. per triwulan) untuk melihat apakah eksekusi membaik dari waktu ke waktu."
        right={canEdit ? <SnapshotButton /> : undefined}
      />

      {snaps.length === 0 ? (
        <div className="bb-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <Camera size={30} className="mb-2 text-bbfaint" />
          <p className="text-sm font-medium text-bbink">Belum ada snapshot</p>
          <p className="mt-1 max-w-md text-xs text-bbmuted">{canEdit ? 'Klik "Ambil snapshot" untuk merekam kondisi saat ini. Ambil tiap triwulan agar tren terbentuk.' : 'Snapshot akan muncul setelah direkam PMO.'}</p>
        </div>
      ) : (
        <>
          {last && (
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Kematangan Terkini" value={last.maturity_overall?.toFixed(2) ?? '-'} sub={<Delta now={last.maturity_overall ?? 0} prev={prev?.maturity_overall ?? undefined} />} accent="var(--bb-green)" icon={<TrendingUp size={20} />} />
              <StatCard label="Rata-rata Progress" value={`${last.avg_progress}%`} sub={<Delta now={last.avg_progress} prev={prev?.avg_progress} unit="%" />} accent="var(--bb-green)" icon={<TrendingUp size={20} />} />
              <StatCard label="Health Merah" value={last.health_red} sub={<Delta now={last.health_red} prev={prev?.health_red} unit="" invert />} accent="var(--bb-red)" icon={<TrendingUp size={20} />} />
              <StatCard label="Tindak Lanjut Terlambat" value={last.actions_overdue} sub={<Delta now={last.actions_overdue} prev={prev?.actions_overdue} unit="" invert />} accent="var(--bb-amber)" icon={<TrendingUp size={20} />} />
            </div>
          )}

          {snaps.length < 2 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Baru ada 1 snapshot. Ambil minimal 2 (periode berbeda) agar grafik tren terbentuk.
            </div>
          )}

          <div className="mb-6 grid gap-5 lg:grid-cols-2">
            <Card hover><h2 className="mb-2 font-display font-semibold text-bbink">Tren Kematangan HCM</h2><MaturityTrend data={data} /></Card>
            <Card hover><h2 className="mb-2 font-display font-semibold text-bbink">Tren Kesehatan Portfolio</h2><HealthTrend data={data} /></Card>
          </div>
          <Card hover className="mb-6"><h2 className="mb-2 font-display font-semibold text-bbink">Tren Eksekusi (%)</h2><ExecutionTrend data={data} /></Card>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-bbborder bg-bbgreen-light/40 text-left text-xs uppercase tracking-wide text-bbmuted">
                    <th className="px-4 py-3 font-semibold">Periode</th>
                    <th className="px-4 py-3 text-right font-semibold">Maturity</th>
                    <th className="px-4 py-3 text-right font-semibold">Progress</th>
                    <th className="px-4 py-3 text-right font-semibold">Health (H/K/M)</th>
                    <th className="px-4 py-3 text-right font-semibold">Milestone</th>
                    <th className="px-4 py-3 text-right font-semibold">Benefit</th>
                    {canEdit && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {[...snaps].reverse().map((s) => (
                    <tr key={s.id} className="border-b border-bbborder/60 last:border-0">
                      <td className="px-4 py-3"><div className="font-medium text-bbink">{s.periode}</div><div className="text-xs text-bbmuted">{s.tanggal}{s.created_by ? ` · ${s.created_by}` : ''}</div></td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.maturity_overall?.toFixed(2) ?? '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.avg_progress}%</td>
                      <td className="px-4 py-3 text-right tabular-nums"><span className="text-bbgreen-dark">{s.health_green}</span> / <span className="text-bbamber">{s.health_yellow}</span> / <span className="text-bbred">{s.health_red}</span></td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.milestones_done}/{s.milestones_total}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.benefits_reached}/{s.benefits_total}</td>
                      {canEdit && <td className="px-4 py-3 text-right"><SnapshotDelete id={s.id} periode={s.periode} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

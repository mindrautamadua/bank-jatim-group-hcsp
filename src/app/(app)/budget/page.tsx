import Link from 'next/link'
import { listAnggaranSummary, getAnggaranStats, serapan, fmtRp, serapanTone } from '@/lib/anggaran'
import { ROADMAP_YEARS } from '@/lib/milestone-constants'
import { PageHeader, StatCard, Card } from '@/components/ui'
import { Wallet, TrendingUp, PieChart } from 'lucide-react'

export const dynamic = 'force-dynamic'

const toneText: Record<string, string> = { green: 'text-bbgreen-dark', amber: 'text-bbamber', red: 'text-bbred', neutral: 'text-bbmuted' }

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const { tahun } = await searchParams
  const y = tahun && /^\d{4}$/.test(tahun) ? Number(tahun) : undefined
  const [rows, stats] = await Promise.all([listAnggaranSummary(y), getAnggaranStats(y)])
  const totalS = serapan(stats.rencana, stats.realisasi)

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Anggaran Program"
        subtitle="Rencana vs realisasi anggaran pengembangan per program (Rp Juta). Serapan = realisasi / rencana. Klik program untuk mengisi per tahun."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`Rencana${y ? ` ${y}` : ''}`} value={fmtRp(stats.rencana)} sub={`${stats.programs} program beranggaran`} accent="var(--bb-green)" icon={<Wallet size={20} />} />
        <StatCard label={`Realisasi${y ? ` ${y}` : ''}`} value={fmtRp(stats.realisasi)} sub="terserap" accent="var(--bb-amber)" icon={<TrendingUp size={20} />} />
        <StatCard label="Serapan" value={totalS === null ? '-' : `${totalS}%`} sub="realisasi / rencana" accent={totalS !== null && totalS < 70 ? 'var(--bb-red)' : 'var(--bb-green)'} icon={<PieChart size={20} />} />
        <StatCard label="Sisa Anggaran" value={fmtRp(Math.max(0, stats.rencana - stats.realisasi))} sub="belum terserap" accent="#7A4FA0" icon={<Wallet size={20} />} />
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Tahun</span>
          <select name="tahun" defaultValue={y ?? ''} className="rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink">
            <option value="">Semua tahun (2026-2030)</option>{ROADMAP_YEARS.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
          </select>
        </label>
        <button type="submit" className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark">Terapkan</button>
        {y && <Link href="/budget" className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Reset</Link>}
      </form>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-bbborder bg-bbgreen-light/40 text-left text-xs uppercase tracking-wide text-bbmuted">
              <th className="px-4 py-3 font-semibold">Program</th>
              <th className="px-4 py-3 text-right font-semibold">Rencana</th>
              <th className="px-4 py-3 text-right font-semibold">Realisasi</th>
              <th className="px-4 py-3 text-right font-semibold">Serapan</th>
              <th className="px-4 py-3 font-semibold w-40">Penyerapan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = serapan(r.rencana, r.realisasi)
              return (
                <tr key={r.kode} className="border-b border-bbborder/60 last:border-0 hover:bg-bbgreen-light/15">
                  <td className="px-4 py-3">
                    <Link href={`/budget/${encodeURIComponent(r.kode)}`} className="bb-press block">
                      <span className="font-mono text-xs font-bold" style={{ color: r.warna ?? '#00814f' }}>{r.kode}</span>
                      <div className="max-w-[260px] truncate text-xs text-bbink" title={r.nama}>{r.nama.replace('Meningkatkan Efektivitas dan Kematangan ', '').replace('Manajemen ', '')}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-bbmuted">{r.punya ? fmtRp(r.rencana) : '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-bbink">{r.punya ? fmtRp(r.realisasi) : '-'}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${toneText[serapanTone(s)]}`}>{s === null ? '-' : `${s}%`}</td>
                  <td className="px-4 py-3">
                    {s === null ? <span className="text-xs text-bbfaint">belum diisi</span> : (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bbgreen-light">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, s)}%`, background: serapanTone(s) === 'red' ? 'var(--bb-red)' : serapanTone(s) === 'amber' ? 'var(--bb-amber)' : 'var(--bb-green)' }} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  )
}

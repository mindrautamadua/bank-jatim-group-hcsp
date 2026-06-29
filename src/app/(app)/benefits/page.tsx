import Link from 'next/link'
import { getAllSasaran } from '@/lib/queries'
import { listBenefits, getBenefitStats, JENIS_BENEFIT } from '@/lib/benefit'
import { realizationPct, benefitStatus, benefitToneBadge, jenisBadge, fmtVal } from '@/lib/benefit-constants'
import { PageHeader, StatCard, Card, Badge } from '@/components/ui'
import { Trophy, CheckCircle2, Activity, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BenefitsPage({ searchParams }: { searchParams: Promise<{ kode?: string; jenis?: string }> }) {
  const { kode, jenis } = await searchParams
  const [benefits, stats, sasaran] = await Promise.all([listBenefits({ kode, jenis }), getBenefitStats(), getAllSasaran()])
  const opts = sasaran.map((s) => ({ kode: s.kode, nama: s.nama }))

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Benefit Register"
        subtitle="Benefit Realization Tracking: manfaat & dampak yang diharapkan per program (Output, Outcome, Business Impact) - baseline menuju target, dibandingkan dengan realisasinya."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Benefit" value={stats.total} sub={`di ${stats.programsWith} program`} accent="var(--bb-green)" icon={<Trophy size={20} />} />
        <StatCard label="Tercapai" value={stats.reached} sub={stats.total ? `${Math.round((stats.reached / stats.total) * 100)}% benefit` : '-'} accent="var(--bb-green)" icon={<CheckCircle2 size={20} />} />
        <StatCard label="Sudah Diukur" value={stats.measured} sub={`${stats.total - stats.measured} belum diukur`} accent="var(--bb-amber)" icon={<Activity size={20} />} />
        <StatCard label="Tingkatan" value={3} sub="Output - Outcome - Impact" accent="#7A4FA0" icon={<Layers size={20} />} />
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Program</span>
          <select name="kode" defaultValue={kode ?? ''} className="rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink">
            <option value="">Semua program</option>{opts.map((o) => <option key={o.kode} value={o.kode}>{o.kode}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Tingkatan</span>
          <select name="jenis" defaultValue={jenis ?? ''} className="rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink">
            <option value="">Semua tingkatan</option>{JENIS_BENEFIT.map((j) => <option key={j}>{j}</option>)}
          </select>
        </label>
        <button type="submit" className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark">Terapkan</button>
        {(kode || jenis) && <Link href="/benefits" className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Reset</Link>}
      </form>

      <Card className="overflow-hidden p-0">
        {benefits.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Trophy size={28} className="mb-2 text-bbfaint" />
            <p className="text-sm font-medium text-bbink">Belum ada benefit terdaftar</p>
            <p className="mt-1 text-xs text-bbmuted">Buka sebuah program untuk mendaftarkan manfaat/dampak yang diharapkan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-bbborder bg-bbgreen-light/40 text-left text-xs uppercase tracking-wide text-bbmuted">
                <th className="px-4 py-3 font-semibold">Program</th>
                <th className="px-4 py-3 font-semibold">Benefit</th>
                <th className="px-4 py-3 font-semibold">Tingkatan</th>
                <th className="px-4 py-3 text-right font-semibold">Baseline</th>
                <th className="px-4 py-3 text-right font-semibold">Target</th>
                <th className="px-4 py-3 text-right font-semibold">Actual</th>
                <th className="px-4 py-3 text-right font-semibold">Realisasi</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {benefits.map((b) => {
                const pct = realizationPct(b); const st = benefitStatus(b)
                return (
                  <tr key={b.id} className="border-b border-bbborder/60 last:border-0 hover:bg-bbgreen-light/15">
                    <td className="px-4 py-3"><Link href={`/benefits/${encodeURIComponent(b.sasaran_kode)}`} className="font-mono text-xs font-bold hover:underline" style={{ color: b.perspektif_warna ?? '#00814f' }}>{b.sasaran_kode}</Link></td>
                    <td className="px-4 py-3"><div className="max-w-[260px] text-bbink">{b.nama}</div></td>
                    <td className="px-4 py-3"><Badge className={jenisBadge[b.jenis] ?? 'bg-gray-100 text-gray-600'}>{b.jenis}</Badge></td>
                    <td className="px-4 py-3 text-right tabular-nums text-bbmuted">{fmtVal(b.baseline, b.satuan)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-bbgreen-dark">{fmtVal(b.target, b.satuan)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-bbink">{fmtVal(b.actual, b.satuan)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-bbink">{pct === null ? '-' : `${pct}%`}</td>
                    <td className="px-4 py-3"><Badge className={benefitToneBadge[st.tone]}>{st.label}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  )
}

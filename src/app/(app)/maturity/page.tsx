import Link from 'next/link'
import { getMaturityDomains, getMaturitySummary, getMaturityTrajectory } from '@/lib/queries'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { Card, PageHeader, StatCard, Badge } from '@/components/ui'
import { MaturitySpider, GapBars, MaturityTrajectory } from '@/components/charts'
import { clusterLabel } from '@/lib/format'
import { PencilLine } from 'lucide-react'

export const dynamic = 'force-dynamic'

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030]

function shortName(n: string) {
  return n.replace('Manajemen ', '').replace(' Pegawai', '').replace(' (Penggajian & Penghargaan)', '')
}

export default async function Maturity() {
  const [domains, summary, trajectory, user] = await Promise.all([
    getMaturityDomains(),
    getMaturitySummary(),
    getMaturityTrajectory(),
    getSession(),
  ])
  const canEdit = isEditor(user?.role)

  // Realisasi terkini = tahun terbaru yang sudah punya nilai realisasi.
  const latestRealisasi = (d: (typeof domains)[number]): number | null => {
    const filled = d.targets.filter((t) => t.realisasi !== null && t.realisasi !== undefined)
    if (!filled.length) return null
    return Number(filled.reduce((a, b) => (b.tahun > a.tahun ? b : a)).realisasi)
  }
  // Hanya hitung "ada realisasi" bila ada nilai aktual SETELAH 2025 (2025 = baseline asesmen).
  const adaRealisasi = domains.some((d) =>
    d.targets.some((t) => t.tahun > 2025 && t.realisasi !== null && t.realisasi !== undefined)
  )

  const traj = trajectory.map((p) => ({ tahun: String(p.tahun), target: p.target, baseline: p.realisasi }))

  const spider = domains.map((d) => ({
    domain: shortName(d.nama),
    baseline: Number(d.baseline2025 ?? 0),
    target: Number(d.targets.find((t) => t.tahun === 2030)?.target_itk ?? 0),
    realisasi: latestRealisasi(d),
  }))

  const gaps = domains
    .map((d) => {
      const base = Number(d.baseline2025 ?? 0)
      const tgt = Number(d.targets.find((t) => t.tahun === 2030)?.target_itk ?? 0)
      return { nama: shortName(d.nama), baseline: base, target: tgt, gap: Number((tgt - base).toFixed(2)) }
    })
    .sort((a, b) => b.gap - a.gap)

  const clusters = ['Strategic', 'Services', 'HCIS']

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Maturity & Gap Analysis"
        subtitle="Tingkat kematangan HCM (Lampiran 2) - baseline asesmen 2025 vs target roadmap 2026-2030 per 13 sub-domain, dalam 3 cluster: HCM Strategic, HCM Services, dan HCM Information System (skala 1-4)."
        right={
          canEdit ? (
            <Link
              href="/maturity/update"
              className="bb-press inline-flex shrink-0 items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark"
            >
              <PencilLine size={16} /> Update PMO
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Maturity Overall 2025" value={summary.baselineOverall.toFixed(2)} sub="Skala 1-4 (Asesmen)" accent="var(--bb-amber)" />
        <StatCard label="Target Overall 2030" value={summary.target2030Overall.toFixed(2)} sub={`Gap +${(summary.target2030Overall - summary.baselineOverall).toFixed(2)}`} accent="var(--bb-green)" />
        {summary.byCluster.map((c) => (
          <StatCard key={c.cluster} label={clusterLabel[c.cluster] ?? c.cluster} value={c.baseline.toFixed(2)} sub={`→ ${c.target2030.toFixed(2)} (2030)`} accent={c.cluster === 'HCIS' ? 'var(--bb-red)' : 'var(--bb-green)'} />
        )).slice(0, 2)}
      </div>

      <Card hover className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display font-semibold text-bbink">Trajektori Kematangan HCM</h2>
          {!adaRealisasi && <Badge className="bg-amber-50 text-amber-700">Realisasi 2026+ belum diisi</Badge>}
        </div>
        <p className="text-xs text-bbmuted mb-2">
          Target resmi roadmap (PBI.1) vs realisasi rata-rata domain. 2025 = baseline asesmen.
        </p>
        <MaturityTrajectory data={traj} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <Card>
          <h2 className="font-display font-semibold text-bbink mb-1">Spider Chart - Kematangan per Domain</h2>
          <p className="text-xs text-bbmuted mb-2">Baseline 2025 vs Target 2030{adaRealisasi ? ' vs Realisasi terkini' : ''}</p>
          <MaturitySpider data={spider} showRealisasi={adaRealisasi} />
        </Card>
        <Card>
          <h2 className="font-display font-semibold text-bbink mb-1">Gap Analysis terhadap Target 2030</h2>
          <p className="text-xs text-bbmuted mb-2">Domain dengan gap terbesar diprioritaskan (amber ≥ 0,60)</p>
          <GapBars data={gaps} />
        </Card>
      </div>

      {clusters.map((cl) => {
        const rows = domains.filter((d) => d.cluster === cl)
        if (!rows.length) return null
        return (
          <Card key={cl} className="mb-5">
            <h2 className="font-display font-semibold text-bbink mb-3 flex items-center gap-2">
              {clusterLabel[cl] ?? cl}
              <Badge className="bg-bbgreen-light text-bbgreen-dark">{rows.length} domain</Badge>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-bbmuted border-b border-bbborder">
                    <th className="text-left py-2 font-semibold">Domain</th>
                    {YEARS.map((y) => <th key={y} className="py-2 font-semibold text-right tabular-nums w-16">{y}</th>)}
                    <th className="py-2 font-semibold text-right w-16">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const base = Number(d.baseline2025 ?? 0)
                    const t2030 = Number(d.targets.find((t) => t.tahun === 2030)?.target_itk ?? 0)
                    const gap = t2030 - base
                    return (
                      <tr key={d.id} className="border-b border-bbborder/50 last:border-0 align-top">
                        <td className="py-2 text-bbink pr-3">{d.nama}</td>
                        {YEARS.map((y) => {
                          const isBaseline = y === 2025
                          const row = d.targets.find((t) => t.tahun === y)
                          const v = isBaseline ? base : row?.target_itk
                          const real = isBaseline ? null : row?.realisasi
                          return (
                            <td key={y} className={`py-2 text-right tabular-nums ${isBaseline ? 'text-bbamber font-medium' : 'text-bbink'}`}>
                              {v !== null && v !== undefined ? Number(v).toFixed(2) : '-'}
                              {real !== null && real !== undefined && (
                                <span className="block text-[11px] font-medium text-bbgreen-dark" title="Realisasi">
                                  R {Number(real).toFixed(2)}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        <td className={`py-2 text-right tabular-nums font-semibold ${gap >= 0.6 ? 'text-bbamber' : gap > 0 ? 'text-bbgreen-dark' : 'text-bbmuted'}`}>
                          {gap > 0 ? '+' : ''}{gap.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}

      <p className="text-[11px] text-bbmuted mt-2">
        Catatan: kolom 2025 = realisasi asesmen (Lampiran 2); angka utama tiap tahun = target ITK, baris <span className="font-medium text-bbgreen-dark">R</span> = realisasi yang diinput PMO. Pada cluster HCIS, target ITK awal (PP.4/PP.5) mengikuti trajektori pembangunan sistem sesuai Blueprint sehingga dapat berbeda dari baseline asesmen 2025.
      </p>
    </div>
  )
}

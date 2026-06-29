import { getMaturitySummary, getPerformanceOverview, getOutcomeKPIs, getPortfolioStats, getAttentionList } from '@/lib/queries'
import Image from 'next/image'
import { getActiveTenant } from '@/lib/tenant'
import { getMilestoneStats } from '@/lib/milestone'
import { getGovStats, getActionTracker } from '@/lib/governance'
import { fmtTarget } from '@/lib/format'
import PrintButton from '@/components/PrintButton'
import { FileSpreadsheet } from 'lucide-react'

export const dynamic = 'force-dynamic'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function Section({ title, children, brk }: { title: string; children: React.ReactNode; brk?: boolean }) {
  return (
    <section className={`mb-6 ${brk ? 'print-break' : ''}`}>
      <h2 className="mb-2 border-b-2 border-bbgreen pb-1 font-display text-base font-bold text-bbgreen-dark">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-bbborder p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-bbmuted">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-bbink">{value}</div>
      {sub && <div className="text-[11px] text-bbmuted">{sub}</div>}
    </div>
  )
}
const th = 'border border-bbborder px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-bbmuted'
const td = 'border border-bbborder px-2 py-1 text-sm'

export default async function ReportPage() {
  const [mat, perf, outcomes, stats, attention, msStats, gov, actions] = await Promise.all([
    getMaturitySummary(), getPerformanceOverview(), getOutcomeKPIs(), getPortfolioStats(), getAttentionList(),
    getMilestoneStats(), getGovStats(), getActionTracker(),
  ])
  const now = new Date()
  const tanggal = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  const tenant = await getActiveTenant()

  return (
    <div className="mx-auto max-w-4xl">
      {/* Toolbar (tidak ikut cetak) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-bbink">Board Pack / Laporan Eksekutif</h1>
          <p className="text-sm text-bbmuted">Cetak ke PDF untuk paket Direksi, atau ekspor data ke Excel (CSV).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[['portfolio', 'Portfolio'], ['maturity', 'Maturity']].map(([k, l]) => (
            <a key={k} href={`/api/export/${k}`} className="bb-press inline-flex items-center gap-1.5 rounded-lg border border-bbborder bg-white px-3 py-2 text-xs font-medium text-bbmuted hover:border-bbgreen hover:text-bbgreen-dark">
              <FileSpreadsheet size={14} /> {l}.csv
            </a>
          ))}
          <PrintButton />
        </div>
      </div>

      {/* Dokumen laporan */}
      <div className="bb-card p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-bbborder pb-4">
          <div className="flex items-center gap-3">
            <Image src={tenant.logo} alt={`Logo ${tenant.nama}`} width={240} height={60} className="h-11 w-auto object-contain" priority />
            <div className="border-l border-bbborder pl-3 leading-tight">
              <div className="font-display text-sm font-bold text-bbink">{tenant.nama}</div>
              <div className="text-[11px] tracking-wide text-bbmuted">HUMAN CAPITAL STRATEGIC PLANNING</div>
            </div>
          </div>
          <div className="text-right text-xs text-bbmuted">
            <div className="font-semibold text-bbink">Laporan Eksekutif HCSP</div>
            <div>Periode roadmap 2026-2030</div>
            <div>Per {tanggal}</div>
          </div>
        </div>

        <Section title="Ringkasan Eksekutif">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <KPI label="Kematangan HCM" value={`${mat.baselineOverall.toFixed(2)} → ${mat.target2030Overall.toFixed(2)}`} sub="2025 menuju target 2030 (skala 4)" />
            <KPI label="Program Strategis" value={stats.total} sub={`${perf.status.onTrack} on track`} />
            <KPI label="Kesehatan Portfolio" value={`${perf.health.green} / ${perf.health.yellow} / ${perf.health.red}`} sub="hijau / kuning / merah" />
            <KPI label="Milestone" value={`${msStats.done}/${msStats.total}`} sub={`${msStats.behind} terlambat`} />
            <KPI label="Tindak Lanjut" value={gov.actionsOpen} sub={`${gov.actionsOverdue} terlambat`} />
          </div>
        </Section>

        <Section title="Tingkat Kematangan HCM per Cluster">
          <table className="w-full min-w-[520px] border-collapse">
            <thead><tr><th className={th}>Cluster</th><th className={`${th} text-right`}>Baseline 2025</th><th className={`${th} text-right`}>Target 2030</th><th className={`${th} text-right`}>Gap</th></tr></thead>
            <tbody>
              {mat.byCluster.map((c) => (
                <tr key={c.cluster}>
                  <td className={td}>{c.cluster === 'Strategic' ? 'HCM Strategic' : c.cluster === 'Services' ? 'HCM Services' : 'HCM Information System'}</td>
                  <td className={`${td} text-right tabular-nums`}>{c.baseline.toFixed(2)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums text-bbgreen-dark`}>{c.target2030.toFixed(2)}</td>
                  <td className={`${td} text-right tabular-nums`}>+{(c.target2030 - c.baseline).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-bbgreen-light/40 font-semibold">
                <td className={td}>HCM Keseluruhan</td>
                <td className={`${td} text-right tabular-nums`}>{mat.baselineOverall.toFixed(2)}</td>
                <td className={`${td} text-right tabular-nums text-bbgreen-dark`}>{mat.target2030Overall.toFixed(2)}</td>
                <td className={`${td} text-right tabular-nums`}>+{(mat.target2030Overall - mat.baselineOverall).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Dampak Bisnis yang Dikejar (Outcome KPI)">
          <table className="w-full min-w-[520px] border-collapse">
            <thead><tr><th className={th}>Kode</th><th className={th}>Indikator</th><th className={`${th} text-right`}>Target 2026</th><th className={`${th} text-right`}>Target 2030</th><th className={`${th} text-right`}>Realisasi 2026</th></tr></thead>
            <tbody>
              {outcomes.map((o) => (
                <tr key={o.kode}>
                  <td className={`${td} font-mono text-xs font-bold`}>{o.kode}</td>
                  <td className={`${td} text-xs`}>{o.ik_nama}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtTarget(o.t2026, o.satuan)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums text-bbgreen-dark`}>{fmtTarget(o.t2030, o.satuan)}</td>
                  <td className={`${td} text-right tabular-nums`}>{o.r2026 === null ? '-' : fmtTarget(o.r2026, o.satuan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Portfolio per Perspektif" brk>
          <table className="w-full min-w-[520px] border-collapse">
            <thead><tr><th className={th}>Perspektif</th><th className={`${th} text-right`}>Jumlah Program</th></tr></thead>
            <tbody>
              {stats.byPerspektif.map((p) => (<tr key={p.kode}><td className={td}>{p.kode} - {p.nama}</td><td className={`${td} text-right tabular-nums`}>{p.count}</td></tr>))}
            </tbody>
          </table>
        </Section>

        <Section title={`Perlu Perhatian (${attention.length})`}>
          {attention.length === 0 ? <p className="text-sm text-bbmuted">Tidak ada program yang ditandai berisiko atau terlambat.</p> : (
            <table className="w-full min-w-[520px] border-collapse">
              <thead><tr><th className={th}>Kode</th><th className={th}>Program</th><th className={th}>Status</th><th className={`${th} text-right`}>Progress</th></tr></thead>
              <tbody>{attention.map((a) => (<tr key={a.kode}><td className={`${td} font-mono text-xs font-bold`}>{a.kode}</td><td className={`${td} text-xs`}>{a.nama}</td><td className={td}>{a.status} ({a.health})</td><td className={`${td} text-right tabular-nums`}>{a.progress}%</td></tr>))}</tbody>
            </table>
          )}
        </Section>

        <Section title="Tata Kelola (Governance)">
          <p className="text-sm text-bbmuted">{gov.meetings} rapat ({gov.held} terlaksana), {gov.decisions} keputusan, {gov.actionsOpen} tindak lanjut terbuka ({gov.actionsOverdue} terlambat).</p>
          {actions.length > 0 && (
            <table className="mt-2 w-full min-w-[420px] border-collapse">
              <thead><tr><th className={th}>Tindak Lanjut Terbuka</th><th className={th}>PIC</th><th className={`${th} text-right`}>Jatuh Tempo</th></tr></thead>
              <tbody>{actions.slice(0, 8).map((a) => (<tr key={a.id}><td className={`${td} text-xs`}>{a.judul}</td><td className={`${td} text-xs`}>{a.pic ?? '-'}</td><td className={`${td} text-right text-xs tabular-nums ${a.overdue ? 'font-semibold text-bbred' : ''}`}>{a.due_date ?? '-'}</td></tr>))}</tbody>
            </table>
          )}
        </Section>

        <div className="mt-8 border-t border-bbborder pt-3 text-center text-[11px] text-bbmuted">
          Dokumen ini dihasilkan otomatis oleh platform HCSP {tenant.nama}. Penggunaan internal. Dicetak {tanggal}.
        </div>
      </div>
    </div>
  )
}

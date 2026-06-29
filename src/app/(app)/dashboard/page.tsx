import Link from 'next/link'
import {
  getPortfolioStats,
  getMaturitySummary,
  getMaturityDomains,
  getPicWorkload,
  getOutcomeKPIs,
  getFokus,
  getClusterTrajectory,
  getMaturityTrajectory,
  getPerformanceOverview,
  getAttentionList,
  getRecentUpdates,
  getProgressByPerspektif,
  type AttentionItem,
} from '@/lib/queries'
import { Card, StatCard, PageHeader, Badge, ProgressBar, HealthDot } from '@/components/ui'
import { ClusterTrajectory, MaturityTrajectory, PerspektifBars } from '@/components/charts'
import UpdateTimeline from '@/components/UpdateTimeline'
import { fmtTarget, statusBadge } from '@/lib/format'
import { getActiveTenant } from '@/lib/tenant'
import {
  Target,
  Gauge,
  FolderKanban,
  Users,
  ArrowRight,
  TrendingUp,
  CalendarClock,
  AlertTriangle,
  Activity,
  CheckCircle2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Tahun fokus = tahun berjalan, diklem ke horizon blueprint (2026–2030) agar data Fokus tetap relevan.
const BLUEPRINT_START = 2026
const BLUEPRINT_END = 2030

// Label cluster yang ramah-baca (selaras dengan legenda Trajektori Kematangan).
const CLUSTER_LABEL: Record<string, string> = {
  Strategic: 'HCM Strategic',
  Services: 'HCM Services',
  HCIS: 'HCIS',
}

export default async function Dashboard() {
  const CURRENT_YEAR = Math.min(BLUEPRINT_END, Math.max(BLUEPRINT_START, new Date().getFullYear()))
  const tenant = await getActiveTenant()

  const [stats, mat, domains, pic, outcomes, fokus, clusterTraj, maturityTraj, perf, attention, recentUpdates, perspProgress] = await Promise.all([
    getPortfolioStats(),
    getMaturitySummary(),
    getMaturityDomains(),
    getPicWorkload(),
    getOutcomeKPIs(),
    getFokus(CURRENT_YEAR),
    getClusterTrajectory(),
    getMaturityTrajectory(),
    getPerformanceOverview(),
    getAttentionList(),
    getRecentUpdates(8),
    getProgressByPerspektif(),
  ])

  const perspData = stats.byPerspektif.map((p) => ({ kode: p.kode, count: p.count, warna: p.warna ?? '#00814f' }))

  // Trajektori kematangan keseluruhan: realisasi vs target resmi per tahun (skala 4).
  const maturityTrajData = maturityTraj.map((p) => ({ tahun: String(p.tahun), target: p.target, baseline: p.realisasi }))

  const pct = (n: number) => (perf.total ? (n / perf.total) * 100 : 0)

  // Pisahkan eksepsi: berisiko/terlambat vs seharusnya sudah mulai tapi belum.
  const berisiko = attention.filter((a) => a.status !== 'Not Started')
  const belumMulai = attention.filter((a) => a.status === 'Not Started')
  const BELUM_MULAI_LIMIT = 8

  // Spotlight: cluster dengan baseline kematangan terendah (dihitung dinamis dari data).
  const weakestCluster = [...mat.byCluster].sort((a, b) => a.baseline - b.baseline)[0]
  const weakClusterDomains = domains.filter((d) => d.cluster === weakestCluster?.cluster)
  const weakestDomain = weakClusterDomains.reduce(
    (min, d) => (Number(d.baseline2025) < Number(min.baseline2025) ? d : min),
    weakClusterDomains[0]
  )
  const weakestLabel = CLUSTER_LABEL[weakestCluster?.cluster] ?? weakestCluster?.cluster ?? '—'

  // Risiko konsentrasi PIC
  const sdm = pic.find((p) => /Sumber Daya Manusia/i.test(p.unit)) ?? pic[0]
  const sdmPct = sdm && stats.total ? Math.round((sdm.utama / stats.total) * 100) : 0
  const pendukungTop = [...pic].sort((a, b) => b.pendukung - a.pendukung).slice(0, 3)

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Executive Dashboard"
        subtitle={`Ringkasan eksekusi Blueprint Human Capital Management ${tenant.nama} 2026-2030, berbasis Balanced Scorecard.`}
        right={<Badge className="bg-bbgreen-light text-bbgreen-dark">Periode 2026-2030</Badge>}
      />

      {/* KPI ringkas */}
      <div className="bb-rise mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Program Strategis" value={stats.total} sub="26 sasaran · 4 perspektif BSC" accent="var(--bb-green)" icon={<FolderKanban size={20} />} />
        <StatCard label="Maturity Saat Ini" value={mat.baselineOverall.toFixed(2)} sub={`Target 2030: ${mat.target2030Overall.toFixed(2)} (skala 4)`} accent="var(--bb-amber)" icon={<Gauge size={20} />} />
        <StatCard label="Program On Track" value={stats.onTrack} sub={`${stats.delayed} delayed · ${stats.atRisk} at risk`} accent="var(--bb-green)" icon={<Target size={20} />} />
        <StatCard label="Unit Penanggung Jawab" value={pic.length} sub="Divisi & Bagian terlibat" accent="#7A4FA0" icon={<Users size={20} />} />
      </div>

      {/* Lapisan performa - kesehatan portfolio + perlu perhatian */}
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card hover>
          <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
            <Activity size={18} className="text-bbgreen" /> Kesehatan Portfolio
          </h2>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-bbborder">
            {perf.health.green > 0 && <div style={{ width: `${pct(perf.health.green)}%`, background: 'var(--bb-green)' }} />}
            {perf.health.yellow > 0 && <div style={{ width: `${pct(perf.health.yellow)}%`, background: 'var(--bb-gold)' }} />}
            {perf.health.red > 0 && <div style={{ width: `${pct(perf.health.red)}%`, background: 'var(--bb-red)' }} />}
            {perf.health.grey > 0 && <div style={{ width: `${pct(perf.health.grey)}%`, background: '#9aa8a3' }} />}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {([['green', perf.health.green, 'Hijau'], ['yellow', perf.health.yellow, 'Kuning'], ['red', perf.health.red, 'Merah'], ['grey', perf.health.grey, 'Belum mulai']] as const).map(([h, n, l]) => (
              <div key={h} className="rounded-lg bg-bbbg px-2 py-2">
                <div className="flex items-center justify-center gap-1.5">
                  <HealthDot health={h} />
                  <span className="font-display text-lg font-bold tabular-nums text-bbink">{n}</span>
                </div>
                <div className="text-[11px] text-bbmuted">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-bbborder pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-bbmuted">Rata-rata progress <span className="text-bbfaint">(key program terverifikasi)</span></span>
              <span className="font-display font-semibold tabular-nums text-bbink">{perf.avgProgress}%</span>
            </div>
            <ProgressBar value={perf.avgProgress} accent="var(--bb-green)" />
          </div>
        </Card>

        <Card hover className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
              <AlertTriangle size={18} className="text-bbamber" /> Perlu Perhatian
            </h2>
            <Badge className={attention.length ? 'bg-red-50 text-red-700' : 'bg-bbgreen-light text-bbgreen-dark'}>
              {attention.length} program
            </Badge>
          </div>
          {attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-bbborder bg-white/50 px-6 py-10 text-center">
              <CheckCircle2 size={26} className="mb-2 text-bbgreen" />
              <p className="text-sm font-medium text-bbink">Tidak ada program yang perlu perhatian</p>
              <p className="mt-1 max-w-sm text-xs text-bbmuted">
                Program muncul di sini bila berstatus Delayed/At Risk (health merah/kuning), atau seharusnya sudah dimulai tahun ini namun masih &ldquo;Not Started&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {berisiko.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bbred">Berisiko / Terlambat ({berisiko.length})</div>
                  <div className="divide-y divide-bbborder">
                    {berisiko.map((a) => <AttentionRow key={a.kode} a={a} />)}
                  </div>
                </div>
              )}
              {belumMulai.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bbmuted">Belum dimulai — seharusnya sudah jalan ({belumMulai.length})</div>
                  <div className="divide-y divide-bbborder">
                    {belumMulai.slice(0, BELUM_MULAI_LIMIT).map((a) => <AttentionRow key={a.kode} a={a} />)}
                  </div>
                  {belumMulai.length > BELUM_MULAI_LIMIT && (
                    <p className="mt-2 text-[11px] text-bbfaint">+{belumMulai.length - BELUM_MULAI_LIMIT} program belum dimulai lainnya</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* B - Outcome / dampak bisnis */}
      <Card hover className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
              <TrendingUp size={18} className="text-bbgreen" /> Dampak Bisnis yang Dikejar
            </h2>
            <p className="mt-0.5 text-xs text-bbmuted">Indikator hasil (lag) perspektif Finansial &amp; Key Stakeholder, target 2026 menuju 2030.</p>
          </div>
          <Link href="/strategy-map" className="hidden text-xs font-medium text-bbgreen hover:underline sm:flex sm:items-center sm:gap-1">
            Strategy Map <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {outcomes.map((k) => (
            <Link
              key={k.kode}
              href={`/portfolio/${encodeURIComponent(k.kode)}`}
              className="bb-press group rounded-xl border border-bbborder bg-white p-3.5 transition-colors hover:border-bbgreen-dark"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-bbgreen-dark">{k.kode}</span>
                <ArrowRight size={13} className="text-bbgreen opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-1.5 line-clamp-2 min-h-[2.4em] text-[11.5px] leading-snug text-bbmuted" title={k.ik_nama}>
                {k.ik_nama}
              </p>
              <div className="mt-2 font-display text-xl font-bold tabular-nums text-bbink">
                {fmtTarget(k.t2030, k.satuan)}
              </div>
              <div className="mt-0.5 text-[11px] text-bbfaint tabular-nums">
                target 2030 · 2026: {fmtTarget(k.t2026, k.satuan)}
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Momentum kematangan keseluruhan: realisasi vs target resmi */}
      <Card hover className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
            <TrendingUp size={18} className="text-bbgreen" /> Momentum Kematangan HCM
          </h2>
          <Link href="/maturity" className="flex items-center gap-1 text-xs font-medium text-bbgreen hover:underline">
            Detail <ArrowRight size={13} />
          </Link>
        </div>
        <p className="mb-3 text-xs text-bbmuted">
          Realisasi kematangan HCM keseluruhan dibanding target resmi per tahun (skala 4) — apakah eksekusi on-pace menuju 2030.
        </p>
        <MaturityTrajectory data={maturityTrajData} />
      </Card>

      {/* C - Kematangan per cluster + spotlight cluster terlemah */}
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card hover className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-bbink">Trajektori Kematangan per Cluster</h2>
            <Link href="/maturity" className="flex items-center gap-1 text-xs font-medium text-bbgreen hover:underline">
              Detail <ArrowRight size={13} />
            </Link>
          </div>
          <ClusterTrajectory data={clusterTraj} />
        </Card>

        <Card hover className="border-bbred/30 bg-red-50/40">
          <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
            <Gauge size={18} className="text-bbred" /> Spotlight: {weakestLabel}
          </h2>
          <p className="mt-1 text-xs text-bbmuted">Cluster paling tertinggal dan butuh pembangunan terbesar.</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-4xl font-bold tabular-nums text-bbred">{weakestCluster?.baseline.toFixed(2)}</span>
            <span className="mb-1 text-sm text-bbmuted">→ {weakestCluster?.target2030.toFixed(2)} (2030)</span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {weakestDomain && (
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="truncate text-bbink" title={weakestDomain.nama}>{weakestDomain.nama}</span>
                <span className="ml-2 shrink-0 font-display font-semibold tabular-nums text-bbred">
                  {Number(weakestDomain.baseline2025).toFixed(2)}
                </span>
              </div>
            )}
            <p className="text-xs leading-relaxed text-bbmuted">
              Domain dengan skor terendah pada cluster ini.
              {weakestCluster?.cluster === 'HCIS' && (
                <> Bergantung pada program <strong>PP.4</strong> (Aplikasi HCIS) dan <strong>PP.5</strong> (Database HCM).</>
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* A & D - Fokus 2026 + Risiko konsentrasi PIC */}
      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <Card hover>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
              <CalendarClock size={18} className="text-bbgreen" /> Fokus {CURRENT_YEAR}
            </h2>
            <Badge className="bg-bbgreen-light text-bbgreen-dark">{fokus.length} domain naik</Badge>
          </div>
          <p className="mb-3 text-xs text-bbmuted">Domain kematangan yang ditargetkan naik pada tahun berjalan.</p>
          <div className="space-y-2.5">
            {fokus.map((d) => (
              <div key={d.nama} className="flex items-center gap-3">
                <div className="w-44 truncate text-sm text-bbink md:w-52" title={d.nama}>{d.nama}</div>
                <div className="flex-1">
                  <ProgressBar value={(d.baseline / 4) * 100} accent="var(--bb-green)" />
                </div>
                <div className="w-24 text-right text-xs tabular-nums text-bbmuted">
                  {d.baseline.toFixed(2)} →{' '}
                  <span className="font-display font-semibold text-bbink">{d.target.toFixed(2)}</span>
                </div>
                <Badge className="bg-bbgreen-light text-bbgreen-dark tabular-nums">+{d.step.toFixed(2)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card hover className="border-amber-200 bg-amber-50/40">
          <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
            <AlertTriangle size={18} className="text-bbamber" /> Risiko Konsentrasi Eksekusi
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-bbink">
            <strong>{sdm?.unit ?? '—'}</strong> menjadi Penanggung Jawab <strong>Utama</strong> pada{' '}
            <span className="font-display text-lg font-bold tabular-nums text-bbamber">{sdm?.utama ?? 0}</span> dari {stats.total}{' '}
            program <span className="tabular-nums">({sdmPct}%)</span>, berpotensi menjadi bottleneck pelaksanaan.
          </p>
          <div className="mt-4">
            <ProgressBar value={sdmPct} accent="var(--bb-amber)" />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-bbmuted">Unit pendukung terbanyak</p>
            <div className="space-y-1.5">
              {pendukungTop.map((p) => (
                <div key={p.unit} className="flex items-center justify-between text-sm">
                  <span className="truncate text-bbink" title={p.unit}>{p.unit}</span>
                  <span className="ml-2 shrink-0 text-xs tabular-nums text-bbmuted">{p.pendukung} program</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Distribusi & progress program per perspektif BSC.
          Daftar lengkap kematangan 13 domain dipindahkan ke halaman /maturity agar dashboard tetap ringkas. */}
      <Card hover>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display font-semibold text-bbink">Program per Perspektif BSC</h2>
          <Link href="/strategy-map" className="flex items-center gap-1 text-xs font-medium text-bbgreen hover:underline">
            Strategy Map <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid items-center gap-5 lg:grid-cols-2">
          <PerspektifBars data={perspData} />
          <div className="space-y-2.5">
            {stats.byPerspektif.map((p) => {
              const prog = perspProgress.get(p.kode) ?? 0
              return (
                <div key={p.kode} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-bbmuted">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.warna ?? '#00814f' }} />
                      {p.nama}
                    </span>
                    <span className="text-xs text-bbmuted">
                      <span className="font-display font-semibold text-bbink">{p.count}</span> program · <span className="font-semibold tabular-nums text-bbink">{prog}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, background: p.warna ?? '#00814f' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Riwayat update terbaru oleh PMO */}
      <Card hover className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-semibold text-bbink">
            <Activity size={18} className="text-bbgreen" /> Riwayat Update Terbaru
          </h2>
          <Badge className="bg-bbgreen-light text-bbgreen-dark">{recentUpdates.length}</Badge>
        </div>
        {recentUpdates.length === 0 ? (
          <p className="text-sm text-bbmuted">
            Belum ada aktivitas update. Perubahan status, realisasi, dan kegiatan oleh PMO akan tercatat di sini.
          </p>
        ) : (
          <UpdateTimeline updates={recentUpdates} showRef />
        )}
      </Card>
    </div>
  )
}

function AttentionRow({ a }: { a: AttentionItem }) {
  return (
    <Link
      href={`/portfolio/${encodeURIComponent(a.kode)}`}
      className="bb-press flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
    >
      <HealthDot health={a.health} />
      <span className="font-mono text-[11px] font-bold text-bbgreen-dark">{a.kode}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-bbink" title={a.nama}>{a.nama}</span>
      <span className="hidden text-xs tabular-nums text-bbmuted sm:inline">{a.progress}%</span>
      <Badge className={statusBadge[a.status] ?? 'bg-gray-100 text-gray-600'}>{a.status}</Badge>
    </Link>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getSasaranByKode,
  getPIC,
  getIKForSasaran,
  getUpdatesForRef,
} from '@/lib/queries'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getKegiatanForSasaran } from '@/lib/kegiatan'
import { Card, Badge, HealthDot } from '@/components/ui'
import { IKTrajectory } from '@/components/charts'
import UpdateTimeline from '@/components/UpdateTimeline'
import ProgramBlueprint from '@/components/ProgramBlueprint'
import SasaranUtamaEditor from '@/components/SasaranUtamaEditor'
import { getProgramDetail } from '@/lib/program-detail'
import { fmtTarget, statusBadge, frekuensiLabel, frekuensiBadge, YEARS } from '@/lib/format'
import { Calendar, Crown, Users2, Target, LineChart, HelpCircle, PencilLine } from 'lucide-react'

// Aturan ambang status & health yang diturunkan dari Overall Progress Key Program.
const PROGRESS_RULE_HELP = [
  'Status & health diturunkan dari Overall Progress Key Program:',
  '• 100%  — Completed (hijau)',
  '• 75–99% — On Track (hijau)',
  '• 40–74% — At Risk (kuning)',
  '• 1–39%  — Delayed (merah)',
  '• 0%      — Not Started (abu-abu)',
].join('\n')

// Isi detail program. Dipakai oleh halaman penuh (/portfolio/[kode]) DAN modal
// intercepting route, agar konten selalu identik (satu sumber kebenaran).
export default async function ProgramDetailView({ kode }: { kode: string }) {
  const sasaran = await getSasaranByKode(decodeURIComponent(kode))
  if (!sasaran) notFound()

  const [pic, iks, updates, user, dbKeg] = await Promise.all([
    getPIC(sasaran.id),
    getIKForSasaran(sasaran.id),
    getUpdatesForRef(sasaran.kode),
    getSession(),
    getKegiatanForSasaran(sasaran.kode),
  ])
  const isAdmin = user?.role === 'admin'
  const canEdit = isEditor(user?.role)
  const utama = pic.filter((p) => p.peran === 'Utama')
  const pendukung = pic.filter((p) => p.peran === 'Pendukung')
  const keyPrograms = (await getProgramDetail(sasaran.kode))?.kegiatan.map((k) => k.program) ?? []
  // Progress terverifikasi per key program (per urutan, selaras index daftar).
  const progressByUrutan = new Map<number, number>(dbKeg.map((k) => [k.urutan, k.progress]))
  // Overall progress sasaran = rata-rata progress terverifikasi seluruh key program.
  const overallProgress = dbKeg.length ? Math.round(dbKeg.reduce((a, k) => a + k.progress, 0) / dbKeg.length) : 0

  return (
    <>
      <div className="bb-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: sasaran.perspektif_warna ?? '#00814f' }} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-bold text-sm px-2 py-0.5 rounded" style={{ background: `${sasaran.perspektif_warna ?? '#00814f'}1a`, color: sasaran.perspektif_warna ?? '#00814f' }}>{sasaran.kode}</span>
              <Badge className="bg-bbgreen-light text-bbgreen-dark">{sasaran.perspektif_nama}</Badge>
              <Badge className={statusBadge[sasaran.status] ?? 'bg-gray-100 text-gray-600'}>{sasaran.status}</Badge>
              <span className="inline-flex items-center gap-1.5 text-xs text-bbmuted"><HealthDot health={sasaran.health} /> {sasaran.health}</span>
              <span className="inline-flex cursor-help text-bbfaint hover:text-bbmuted" tabIndex={0} role="img" aria-label={PROGRESS_RULE_HELP} title={PROGRESS_RULE_HELP}>
                <HelpCircle size={14} />
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-bbink max-w-3xl leading-tight tracking-tight">{sasaran.nama}</h1>
          </div>
          {canEdit && (
            <Link
              href={`/portfolio/${encodeURIComponent(sasaran.kode)}/update`}
              className="bb-press inline-flex shrink-0 items-center gap-2 rounded-lg bg-bbgreen px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bbgreen-dark"
            >
              <PencilLine size={16} /> Update Realisasi IK
            </Link>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-5 text-sm">
          <div className="flex items-start gap-2">
            <Calendar size={16} className="text-bbmuted mt-0.5" />
            <div><div className="text-xs text-bbmuted">Waktu Pelaksanaan</div><div className="text-bbink">{sasaran.cadence ?? '2026-2030'}</div></div>
          </div>
          <div className="flex items-start gap-2">
            <Target size={16} className="text-bbmuted mt-0.5" />
            <div><div className="text-xs text-bbmuted">Jenis Indikator</div><div className="text-bbink capitalize">{sasaran.jenis ?? '-'}</div></div>
          </div>
          <div className="flex items-start gap-2">
            <Crown size={16} className="text-bbmuted mt-0.5" />
            <div><div className="text-xs text-bbmuted">Sponsor</div><div className="text-bbink">{sasaran.sponsor ?? 'Direksi'}</div></div>
          </div>
        </div>

        {dbKeg.length > 0 && (
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-bbmuted">
                Overall Progress Key Program <span className="text-bbfaint">({dbKeg.length} key program, terverifikasi)</span>
                <span className="inline-flex cursor-help text-bbfaint hover:text-bbmuted" tabIndex={0} role="img" aria-label={PROGRESS_RULE_HELP} title={PROGRESS_RULE_HELP}>
                  <HelpCircle size={13} />
                </span>
              </span>
              <span className="font-display text-sm font-bold tabular-nums text-bbink">{overallProgress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-bbgreen-light/50">
              <div className="h-full rounded-full bg-bbgreen transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <ProgramBlueprint
        kode={sasaran.kode}
        keyProgramSlot={
          keyPrograms.length > 0 ? (
            <Card>
              <h2 className="font-display font-semibold text-bbink mb-1">Key Program</h2>
              <p className="mb-3 text-xs text-bbmuted">{keyPrograms.length} key program — rincian kegiatan utama tiap key program ada di bagian bawah.</p>
              <ol className="space-y-2 text-sm leading-relaxed text-bbmuted">
                {keyPrograms.map((kp, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bbgreen-light text-[11px] font-semibold tabular-nums text-bbgreen-dark">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      {kp}
                      <span className="ml-1.5 whitespace-nowrap rounded bg-bbgreen-light/60 px-1.5 py-px text-[10px] font-semibold tabular-nums text-bbgreen-dark" title="Progress terverifikasi key program">
                        {progressByUrutan.get(i) ?? 0}% terverifikasi
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : sasaran.key_program ? (
            <Card>
              <h2 className="font-display font-semibold text-bbink mb-2">Key Program</h2>
              <p className="text-sm text-bbmuted leading-relaxed">{sasaran.key_program}</p>
            </Card>
          ) : null
        }
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <Card>
            <h2 className="font-display font-semibold text-bbink mb-3 flex items-center gap-2"><Users2 size={18} /> Penanggung Jawab</h2>
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wide text-bbmuted mb-1.5">Utama</div>
              {utama.length ? utama.map((p) => (
                <div key={p.unit} className="flex items-center gap-2 text-sm text-bbink py-1">
                  <Crown size={14} className="text-bbgold" /> {p.unit}
                </div>
              )) : <div className="text-sm text-bbmuted">Belum ditetapkan</div>}
              {isAdmin && <SasaranUtamaEditor kode={sasaran.kode} value={utama.map((p) => p.unit)} />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-bbmuted mb-1.5">Pendukung</div>
              {pendukung.length ? pendukung.map((p) => (
                <div key={p.unit} className="text-sm text-bbmuted py-1 pl-5">• {p.unit}</div>
              )) : <div className="text-sm text-bbmuted pl-5">-</div>}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <LineChart size={18} className="text-bbgreen" />
            <h2 className="font-display font-semibold text-bbink">Indikator Kinerja</h2>
            {iks.length > 0 && <span className="rounded-md bg-bbgreen-light px-2 py-0.5 text-xs font-semibold text-bbgreen-dark">{iks.length}</span>}
          </div>
          {iks.length === 0 && <Card><p className="text-sm text-bbmuted">Tidak ada indikator kinerja terdaftar.</p></Card>}
          {iks.map((ik) => {
            const chartData = YEARS.map((y) => {
              const t = ik.targets.find((x) => x.tahun === y)
              return {
                tahun: String(y),
                target: t?.target !== null && t?.target !== undefined ? Number(t.target) : null,
                realisasi: t?.realisasi !== null && t?.realisasi !== undefined ? Number(t.realisasi) : null,
              }
            })
            const hasTarget = chartData.some((d) => d.target !== null)
            return (
              <Card key={ik.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-medium text-bbink text-sm leading-snug">{ik.nama}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {ik.frekuensi && <Badge className={frekuensiBadge[ik.frekuensi]}>{frekuensiLabel[ik.frekuensi]}</Badge>}
                    {ik.satuan && <Badge className="bg-gray-100 text-gray-600">{ik.satuan}</Badge>}
                  </div>
                </div>
                <div className="overflow-x-auto mb-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-bbmuted border-b border-bbborder">
                        <th className="text-left py-1.5 font-medium">Tahun</th>
                        {YEARS.map((y) => <th key={y} className="py-1.5 font-medium text-right tabular-nums">{y}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-bbborder/50">
                        <td className="py-1.5 text-bbmuted">Target</td>
                        {YEARS.map((y) => {
                          const t = ik.targets.find((x) => x.tahun === y)
                          return <td key={y} className="py-1.5 text-right tabular-nums font-semibold text-bbgreen-dark">{t ? fmtTarget(Number(t.target), ik.satuan) : '-'}</td>
                        })}
                      </tr>
                      <tr>
                        <td className="py-1.5 text-bbmuted">Realisasi</td>
                        {YEARS.map((y) => {
                          const t = ik.targets.find((x) => x.tahun === y)
                          return <td key={y} className="py-1.5 text-right tabular-nums text-bbamber">{t && t.realisasi !== null ? fmtTarget(Number(t.realisasi), ik.satuan) : '-'}</td>
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {hasTarget && <IKTrajectory data={chartData} satuan={ik.satuan} />}
                {ik.frekuensi !== 'tahunan' && ik.periode.length > 0 && (() => {
                  const tahunTerbaru = Math.max(...ik.periode.map((p) => p.tahun))
                  const periodeTahun = ik.periode.filter((p) => p.tahun === tahunTerbaru && p.nilai !== null)
                  if (!periodeTahun.length) return null
                  return (
                    <div className="mt-3 border-t border-bbborder pt-3">
                      <div className="mb-1.5 text-xs text-bbmuted">Realisasi {frekuensiLabel[ik.frekuensi]} {tahunTerbaru}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {periodeTahun.map((p) => (
                          <span key={p.periode} className="rounded-md bg-bbgreen-light px-2 py-0.5 text-xs tabular-nums text-bbgreen-dark">
                            {p.periode}: {fmtTarget(Number(p.nilai), ik.satuan)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </Card>
            )
          })}
        </div>
      </div>

      {updates.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display font-semibold text-bbink">Riwayat Update</h2>
          <UpdateTimeline updates={updates} />
        </Card>
      )}
    </>
  )
}

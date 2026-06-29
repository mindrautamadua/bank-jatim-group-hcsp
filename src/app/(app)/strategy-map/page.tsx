import Link from 'next/link'
import { getPerspektif, getAllSasaran, getAllPIC, getIKCountByKode, getProgressByKode } from '@/lib/queries'
import { getProgramDetailMap } from '@/lib/program-detail'
import { PageHeader } from '@/components/ui'
import { ListChecks, Crown, Users2, Gauge } from 'lucide-react'

export const dynamic = 'force-dynamic'

const perspektifMeta: Record<string, { label: string; sub: string; bar: string }> = {
  F: { label: 'Perspektif Finansial', sub: 'Business Strategic Impact (lag)', bar: '#ffcb00' },
  KS: { label: 'Perspektif Key Stakeholder', sub: 'Hasil bagi pegawai & organisasi (lag)', bar: '#00814f' },
  PBI: { label: 'Perspektif Proses Bisnis Internal', sub: 'Efektivitas & kematangan HCM', bar: '#0B7A8C' },
  PP: { label: 'Perspektif Pembelajaran & Pertumbuhan', sub: 'Intrinsic Capability of HCM (lead)', bar: '#7A4FA0' },
}

export default async function StrategyMap() {
  const [persp, sasaran, allPic, ikCount, progressByKode, pdMap] = await Promise.all([
    getPerspektif(), getAllSasaran(), getAllPIC(), getIKCountByKode(), getProgressByKode(), getProgramDetailMap(),
  ])

  // Overall progress seluruh Strategy Map = rata-rata overall progress semua sasaran.
  const mapProgress = sasaran.length
    ? Math.round(sasaran.reduce((a, s) => a + (progressByKode.get(s.kode) ?? 0), 0) / sasaran.length)
    : 0

  // PIC dikelompokkan per sasaran (kode → Utama/Pendukung).
  const picByKode = new Map<string, { utama: string[]; pendukung: string[] }>()
  for (const p of allPic) {
    const e = picByKode.get(p.sasaran_kode) ?? { utama: [], pendukung: [] }
    if (p.peran === 'Utama') e.utama.push(p.unit)
    else if (p.peran === 'Pendukung') e.pendukung.push(p.unit)
    picByKode.set(p.sasaran_kode, e)
  }

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="HCM Strategy Map"
        subtitle='Peta strategi Balanced Scorecard - "To Creating Business Strategic Impact & Enhancing Intrinsic Capability of HCM". Klik setiap sasaran strategis untuk detail program, IK, target & penanggung jawab.'
      />

      <div className="bb-card mb-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-bbink">Overall Progress Strategy Map</h2>
            <p className="text-xs text-bbmuted">Rata-rata progress terverifikasi seluruh {sasaran.length} sasaran strategis lintas perspektif.</p>
          </div>
          <span className="font-display text-2xl font-bold tabular-nums text-bbgreen-dark">{mapProgress}%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-bbgreen-light/50">
          <div className="h-full rounded-full bg-bbgreen transition-all" style={{ width: `${mapProgress}%` }} />
        </div>
      </div>

      <div className="space-y-5">
        {persp.map((p) => {
          const meta = perspektifMeta[p.kode] ?? { label: p.nama, sub: '', bar: '#00814f' }
          const items = sasaran.filter((s) => s.perspektif_kode === p.kode)
          // Overall progress perspektif = rata-rata overall progress sasaran di dalamnya.
          const perspProgress = items.length
            ? Math.round(items.reduce((a, s) => a + (progressByKode.get(s.kode) ?? 0), 0) / items.length)
            : 0
          return (
            <section key={p.id} className="bb-card overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-2" style={{ background: meta.bar }} />
                <div className="flex-1 p-5">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-bbink">{meta.label}</h2>
                      <p className="text-xs text-bbmuted">{meta.sub} · {items.length} sasaran strategis</p>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-1 rounded" style={{ background: `${meta.bar}22`, color: meta.bar }}>{p.kode}</span>
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-bbmuted">Overall Progress</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                      <div className="h-full rounded-full transition-all" style={{ width: `${perspProgress}%`, background: meta.bar }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-bbink">{perspProgress}%</span>
                  </div>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map((s) => {
                      const keyProgramCount = pdMap[s.kode]?.kegiatan.length ?? 0
                      const ikJumlah = ikCount.get(s.kode) ?? 0
                      const pic = picByKode.get(s.kode) ?? { utama: [], pendukung: [] }
                      const overallProgress = progressByKode.get(s.kode) ?? 0
                      return (
                      <Link
                        key={s.id}
                        href={`/portfolio/${encodeURIComponent(s.kode)}`}
                        className="bb-press group flex flex-col rounded-xl border border-bbborder bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-bbgreen-dark hover:shadow-[var(--bb-shadow-md)]"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${meta.bar}1a`, color: meta.bar }}>{s.kode}</span>
                          {s.jenis === 'lag' && <span className="text-[10px] uppercase tracking-wide text-bbmuted">outcome</span>}
                          {s.jenis === 'lead' && <span className="text-[10px] uppercase tracking-wide text-bbmuted">capability</span>}
                          {s.jenis === 'maturity' && <span className="text-[10px] uppercase tracking-wide text-bbmuted">maturity</span>}
                          <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-bbgold/15 px-2 py-0.5 text-[10.5px] font-semibold text-bbamber"
                              title={`${ikJumlah} Indikator Kinerja`}
                            >
                              <Gauge size={11} /> {ikJumlah} IK
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-bbgreen-light/60 px-2 py-0.5 text-[10.5px] font-semibold text-bbgreen-dark"
                              title={`${keyProgramCount} Key Program`}
                            >
                              <ListChecks size={11} /> {keyProgramCount} Key Program
                            </span>
                          </span>
                        </div>
                        <div className="text-sm font-medium text-bbink leading-snug line-clamp-3 group-hover:text-bbgreen-dark">{s.nama}</div>
                        <div className="mt-2.5">
                          <div className="mb-1 flex items-center justify-between text-[10.5px]">
                            <span className="font-medium text-bbmuted">Overall Progress</span>
                            <span className="font-semibold tabular-nums text-bbink">{overallProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bbgreen-light/50">
                            <div className="h-full rounded-full bg-bbgreen transition-all" style={{ width: `${overallProgress}%` }} />
                          </div>
                        </div>
                        <div className="mt-2.5 space-y-1 border-t border-bbborder/60 pt-2.5 text-[11px] leading-snug text-bbmuted">
                          <div className="flex items-start gap-1.5">
                            <Crown size={12} className="mt-px shrink-0 text-bbgold" />
                            <span><span className="font-semibold text-bbink">Utama:</span> {pic.utama.length ? pic.utama.join(', ') : '-'}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Users2 size={12} className="mt-px shrink-0 text-bbmuted" />
                            <span><span className="font-semibold text-bbink">Pendukung:</span> {pic.pendukung.length ? pic.pendukung.join(', ') : '-'}</span>
                          </div>
                        </div>
                      </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { GANTT_YEARS, barPos, nowPos, type Span } from '@/lib/gantt-constants'
import type { GanttProgram } from '@/lib/gantt'
import { healthColor } from '@/lib/format'
import { kegiatanStatusDot } from '@/lib/kegiatan-constants'
import { ChevronRight, ExternalLink, Search, X, Building2, Crown } from 'lucide-react'
import HasilEvidencePanel from './HasilEvidencePanel'
import RincianProgressControl from './RincianProgressControl'
import KegiatanPendukungSelect from './KegiatanPendukungSelect'

const LABEL_W = 'w-56 sm:w-72'
const perspNama: Record<string, string> = { F: 'Finansial', KS: 'Key Stakeholder', PBI: 'Proses Bisnis Internal', PP: 'Pembelajaran & Pertumbuhan' }

// Garis "kini" hanya dihitung di client agar SSR & hidrasi awal cocok (hindari
// mismatch Date.now()). useSyncExternalStore menyajikan null saat SSR, lalu
// posisi nyata di client; snapshot di-cache agar stabil antar-render.
let nowSnap: number | null = null
let nowComputed = false
const subscribeNoop = () => () => {}
const clientNowPos = () => { if (!nowComputed) { nowSnap = nowPos(new Date()); nowComputed = true } return nowSnap }
const serverNowPos = () => null

export default function GanttChart({ programs, currentUserId, isAdmin }: { programs: GanttProgram[]; currentUserId: number | null; isAdmin: boolean }) {
  const np = useSyncExternalStore(subscribeNoop, clientNowPos, serverNowPos)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (k: string) => setOpen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n })
  // Expand level Key Program → Kegiatan Utama (rincian), keyed by id kegiatan.
  const [openKeg, setOpenKeg] = useState<Set<number>>(new Set())
  const toggleKeg = (id: number) => setOpenKeg((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  // Expand level Kegiatan Utama (rincian) → form update progress, keyed `kegId:rincianIndex`.
  const [openRin, setOpenRin] = useState<Set<string>>(new Set())
  const toggleRin = (key: string) => setOpenRin((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })
  // Pencarian: cocokkan program (kode/nama) & aktivitas (Key Program, Kegiatan
  // Utama, teks Hasil Pelaksanaan). kegMatch = id Key Program yang cocok.
  const [q, setQ] = useState('')
  // Filter berdasarkan Penanggung Jawab (unit) Utama sasaran & Pendukung Key Program.
  const [fUtama, setFUtama] = useState('')
  const [fPendukung, setFPendukung] = useState('')
  const term = q.trim().toLowerCase()
  const searching = term.length > 0
  const filtering = searching || fUtama !== '' || fPendukung !== ''

  // Opsi dropdown diturunkan dari data (hanya unit yang benar-benar dipakai).
  const { utamaOpts, pendukungOpts } = useMemo(() => {
    const u = new Set<string>(), pd = new Set<string>()
    for (const p of programs) {
      p.utamaUnits.forEach((x) => u.add(x))
      p.kegiatan.forEach((k) => k.pendukungUnits.forEach((x) => pd.add(x)))
    }
    return { utamaOpts: [...u].sort(), pendukungOpts: [...pd].sort() }
  }, [programs])

  const filtered = useMemo(() => {
    if (!filtering) return programs.map((p) => ({ p, kegMatch: null as Set<number> | null }))
    const has = (s: string) => s.toLowerCase().includes(term)
    const out: { p: GanttProgram; kegMatch: Set<number> }[] = []
    for (const p of programs) {
      if (fUtama && !p.utamaUnits.includes(fUtama)) continue
      if (fPendukung && !p.kegiatan.some((k) => k.pendukungUnits.includes(fPendukung))) continue
      const progMatch = !searching || has(p.kode) || has(p.nama)
      const kegMatch = new Set<number>()
      for (const k of p.kegiatan) {
        const mSearch = searching && (has(k.program) || k.rincian.some((r) => has(r.teks)) || k.hasil.some((h) => has(h.teks)))
        const mPend = fPendukung !== '' && k.pendukungUnits.includes(fPendukung)
        if (mSearch || mPend) kegMatch.add(k.id)
      }
      if (searching && !progMatch && kegMatch.size === 0) continue
      out.push({ p, kegMatch })
    }
    return out
  }, [programs, term, searching, filtering, fUtama, fPendukung])

  // Header seksi perspektif berdasarkan daftar (ter)filter.
  const firstOfPersp = new Set<string>()
  const seenPersp = new Set<string>()
  for (const { p } of filtered) {
    if (!seenPersp.has(p.perspektif_kode)) { seenPersp.add(p.perspektif_kode); firstOfPersp.add(p.kode) }
  }

  // Overall progress rata-rata per perspektif (dari seluruh program, bukan hasil filter).
  const perspProgress = useMemo(() => {
    const acc = new Map<string, { t: number; n: number }>()
    for (const p of programs) {
      const e = acc.get(p.perspektif_kode) ?? { t: 0, n: 0 }
      e.t += p.overallProgress; e.n += 1
      acc.set(p.perspektif_kode, e)
    }
    const m = new Map<string, number>()
    for (const [k, { t, n }] of acc) m.set(k, n ? Math.round(t / n) : 0)
    return m
  }, [programs])

  return (
    <div className="bb-card overflow-hidden p-0">
      {/* Pencarian & filter program */}
      <div className="flex flex-wrap items-center gap-2 border-b border-bbborder px-3 py-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-bbfaint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari program, key program, kegiatan utama, atau hasil pelaksanaan…"
            aria-label="Cari program atau aktivitas"
            className="w-full rounded-lg border border-bbborder bg-white py-2 pl-8 pr-8 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 text-bbfaint hover:text-bbink">
              <X size={15} />
            </button>
          )}
        </div>
        <select
          value={fUtama}
          onChange={(e) => setFUtama(e.target.value)}
          aria-label="Filter Penanggung Jawab Utama"
          className="max-w-[14rem] rounded-lg border border-bbborder bg-white py-2 pl-2.5 pr-2 text-sm text-bbink outline-none transition-colors focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
        >
          <option value="">Semua PJ Utama</option>
          {utamaOpts.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={fPendukung}
          onChange={(e) => setFPendukung(e.target.value)}
          aria-label="Filter Penanggung Jawab Pendukung"
          className="max-w-[14rem] rounded-lg border border-bbborder bg-white py-2 pl-2.5 pr-2 text-sm text-bbink outline-none transition-colors focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
        >
          <option value="">Semua PJ Pendukung</option>
          {pendukungOpts.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {(fUtama || fPendukung) && (
          <button
            onClick={() => { setFUtama(''); setFPendukung('') }}
            className="bb-press inline-flex items-center gap-1 rounded-lg border border-bbborder px-2.5 py-2 text-xs font-medium text-bbmuted hover:text-bbink"
          >
            <X size={13} /> Reset filter
          </button>
        )}
        {filtering && (
          <span className="shrink-0 text-xs tabular-nums text-bbmuted">{filtered.length} program cocok</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Header tahun */}
          <div className="flex items-stretch border-b border-bbborder bg-bbgreen-light/40">
            <div className={`${LABEL_W} shrink-0 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-bbmuted`}>Sasaran / Key Program / Kegiatan</div>
            <div className="relative flex-1">
              <div className="grid h-full grid-cols-5">
                {GANTT_YEARS.map((y) => (
                  <div key={y} className="border-l border-bbborder/60 py-2.5 text-center text-xs font-semibold tabular-nums text-bbmuted">{y}</div>
                ))}
              </div>
              {np !== null && (
                <div className="pointer-events-none absolute -top-0 bottom-0 z-10" style={{ left: `${np}%` }}>
                  <span className="absolute -translate-x-1/2 rounded-b bg-bbred px-1 py-0.5 text-[9px] font-bold leading-none text-white">kini</span>
                </div>
              )}
            </div>
          </div>

          {/* Baris program */}
          {filtering && filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-bbmuted">Tidak ada program yang cocok dengan pencarian/filter.</div>
          )}
          {filtered.map(({ p, kegMatch }) => {
            const header = firstOfPersp.has(p.kode)
            // Saat mencari/memfilter, program yang lolos otomatis terbuka agar hasil terlihat.
            const isOpen = filtering ? true : open.has(p.kode)
            const color = healthColor[p.health as keyof typeof healthColor] ?? 'var(--bb-green)'
            return (
              <div key={p.kode}>
                {header && (
                  <div className="flex items-center gap-2 border-b border-bbborder bg-bbbg px-4 py-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.perspektif_warna }} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-bbink">{perspNama[p.perspektif_kode] ?? p.perspektif_nama}</span>
                    <span className="ml-auto flex items-center gap-2 text-[11px] text-bbmuted" title="Rata-rata overall progress perspektif">
                      <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-black/5 sm:block">
                        <span className="block h-full rounded-full" style={{ width: `${perspProgress.get(p.perspektif_kode) ?? 0}%`, background: p.perspektif_warna }} />
                      </span>
                      <span className="font-semibold tabular-nums text-bbink">{perspProgress.get(p.perspektif_kode) ?? 0}%</span>
                    </span>
                  </div>
                )}
                <div className="flex items-stretch border-b border-bbborder/60 hover:bg-bbgreen-light/15">
                  <button
                    onClick={() => toggle(p.kode)}
                    className={`${LABEL_W} flex shrink-0 items-start gap-1.5 px-3 py-2.5 text-left`}
                    aria-expanded={isOpen}
                  >
                    <ChevronRight size={15} className={`mt-0.5 shrink-0 text-bbmuted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold" style={{ color: p.perspektif_warna }}>{p.kode}</span>
                        <span className="text-xs font-semibold tabular-nums text-bbink" title="Rata-rata progress terverifikasi key program">{p.overallProgress}%</span>
                      </span>
                      <span className="line-clamp-2 text-xs leading-snug text-bbmuted">{p.nama}</span>
                      {p.utamaUnits.length > 0 && (
                        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-bbamber" title={`Penanggung Jawab Utama: ${p.utamaUnits.join(', ')}`}>
                          <Crown size={10} className="shrink-0 text-bbgold" />
                          {p.utamaUnits.map((u) => (
                            <span key={u} className="rounded bg-bbgold/15 px-1 py-px leading-tight">{u}</span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                  <Track np={np}>
                    <BarItem span={{ start: p.start, end: p.end }} color={color} progress={p.overallProgress}
                      label={p.kegiatanTotal > 0
                        ? `${p.kode} · ${p.start}–${p.end} · progress ${p.overallProgress}% · ${p.kegiatanVerified}/${p.kegiatanTotal} key program diverifikasi · health ${p.health}`
                        : `${p.kode} · ${p.start}–${p.end} · realisasi PMO ${p.overallProgress}% · health ${p.health}`} solid />
                  </Track>
                </div>

                {/* Key Program (level 2) — chevron sejajar di bawah teks Sasaran */}
                {isOpen && p.kegiatan.map((k, ki) => {
                  const kc = kegiatanStatusDot[k.status] ?? '#9aa8a3'
                  const matched = kegMatch?.has(k.id) ?? false
                  // Saat mencari/memfilter, Key Program yang cocok ter-expand; pengguna tetap bisa membuka lainnya.
                  const kOpen = filtering ? (matched || openKeg.has(k.id)) : openKeg.has(k.id)
                  const hasDetail = k.rincian.length > 0 || k.hasil.length > 0
                  const no = ki + 1
                  return (
                    <div key={k.id}>
                      <div className={`flex items-stretch border-b border-bbborder/40 hover:bg-bbgreen-light/15 ${matched ? 'bg-bbgreen-light/30' : 'bg-bbbg/30'}`}>
                        <div className={`${LABEL_W} flex shrink-0 items-start gap-1.5 py-2 pl-9 pr-3`}>
                          {hasDetail ? (
                            <button onClick={() => toggleKeg(k.id)} aria-expanded={kOpen} className="mt-0.5 shrink-0" aria-label="Buka kegiatan utama & hasil">
                              <ChevronRight size={14} className={`text-bbmuted transition-transform ${kOpen ? 'rotate-90' : ''}`} />
                            </button>
                          ) : (
                            <span className="mt-0.5 w-3.5 shrink-0" aria-hidden />
                          )}
                          <KegLabel no={no} k={k} kc={kc} />
                        </div>
                        <Track np={np}>
                          <BarItem span={{ start: k.start, end: k.end }} color={kc} progress={k.progress}
                            label={`${no}. ${k.program} — ${k.start}–${k.end} · ${k.status} · ${k.progress}%`} />
                        </Track>
                      </div>

                      {/* Admin: tetapkan divisi/bagian Pendukung Key Program ini */}
                      {kOpen && isAdmin && (
                        <KegiatanPendukungSelect kegiatanId={k.id} value={k.pendukungUnit} />
                      )}

                      {/* Kegiatan Utama (level 3) — update progress (tanpa evidence); evidence di level Key Program */}
                      {kOpen && k.rincian.map((r) => {
                        const huruf = String.fromCharCode(97 + r.index)
                        const rk = `${k.id}:${r.index}`
                        const rOpen = openRin.has(rk)
                        const rc = r.status ? (kegiatanStatusDot[r.status] ?? '#9aa8a3') : '#9aa8a3'
                        return (
                          <div key={r.index}>
                            <div className="flex items-stretch border-b border-bbborder/30 bg-bbbg/15 hover:bg-bbgreen-light/15">
                              <button onClick={() => toggleRin(rk)} aria-expanded={rOpen}
                                className={`${LABEL_W} flex shrink-0 items-start gap-1 py-1.5 pl-[3.25rem] pr-3 text-left`}>
                                <ChevronRight size={12} className={`mt-0.5 shrink-0 text-bbfaint transition-transform ${rOpen ? 'rotate-90' : ''}`} />
                                <span className="mt-px shrink-0 font-mono text-[10px] font-bold text-bbfaint">{huruf}.</span>
                                <span className="min-w-0">
                                  <span className="line-clamp-2 text-[11px] leading-snug text-bbmuted" title={r.teks}>{r.teks}</span>
                                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] tabular-nums text-bbfaint">
                                    {r.progress}%
                                    {r.status && <span className="h-1.5 w-1.5 rounded-full" style={{ background: rc }} title={r.status} />}
                                  </span>
                                </span>
                              </button>
                              <Track np={np}>
                                <BarItem span={{ start: k.start, end: k.end }} color={rc} progress={r.progress}
                                  label={`${no}.${huruf} ${r.teks} — ${k.start}–${k.end} · ${r.status ?? 'Belum diajukan'} · ${r.progress}%`} />
                              </Track>
                            </div>
                            {rOpen && (
                              <RincianProgressControl
                                kode={p.kode} kegiatanId={k.id} label={`${no}.${huruf}`} rincian={r}
                                canSubmit={k.canSubmit} canVerify={p.canVerify} isAdmin={isAdmin}
                              />
                            )}
                          </div>
                        )
                      })}

                      {/* Hasil Pelaksanaan + evidence (unggah Pendukung, verifikasi Utama) */}
                      {kOpen && (
                        <HasilEvidencePanel
                          kode={p.kode} kegiatanId={k.id} no={no} hasil={k.hasil}
                          canSubmit={k.canSubmit} canVerify={p.canVerify}
                          currentUserId={currentUserId} isAdmin={isAdmin}
                        />
                      )}
                    </div>
                  )
                })}
                {isOpen && (
                  <div className="flex items-center border-b border-bbborder/40 bg-bbbg/30 py-1.5 pl-9">
                    <Link href={`/portfolio/${encodeURIComponent(p.kode)}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-bbgreen hover:underline">
                      Buka detail program <ExternalLink size={11} />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KegLabel({ no, k, kc }: { no: number; k: { program: string; status: string; progress: number; pendukungUnits: string[] }; kc: string }) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: kc }} />
        <span className="font-mono text-[10px] font-bold text-bbmuted">{no}.</span>
        <span className="text-[11px] font-medium tabular-nums text-bbmuted">{k.progress}%</span>
        <span className="truncate text-[11px] text-bbfaint" title={k.status}>{k.status}</span>
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-bbmuted" title={k.program}>{k.program}</span>
      {k.pendukungUnits.length > 0 && (
        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-bbgreen-dark" title={`Penanggung Jawab Pendukung: ${k.pendukungUnits.join(', ')}`}>
          <Building2 size={10} className="shrink-0" />
          {k.pendukungUnits.map((u) => (
            <span key={u} className="rounded bg-bbgreen-light/60 px-1 py-px leading-tight">{u}</span>
          ))}
        </span>
      )}
    </span>
  )
}

function Track({ children, np }: { children: React.ReactNode; np: number | null }) {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-0 grid grid-cols-5">
        {GANTT_YEARS.map((y) => <div key={y} className="border-l border-bbborder/40" />)}
      </div>
      {np !== null && <div className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-bbred/50" style={{ left: `${np}%` }} />}
      <div className="relative h-full min-h-[40px]">{children}</div>
    </div>
  )
}

function BarItem({ span, color, progress, label, solid, outline }: { span: Span; color: string; progress: number; label: string; solid?: boolean; outline?: boolean }) {
  const { left, width } = barPos(span)
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 rounded-md ring-1 ring-inset ring-black/5 ${outline ? 'h-2.5' : 'h-4'}`}
      style={{ left: `${left}%`, width: `${width}%`, background: outline ? `${color}1f` : `${color}2e` }}
      title={label}
    >
      {!outline && (
        <div className="h-full rounded-md transition-all" style={{ width: `${Math.max(progress, 2)}%`, background: color, opacity: solid ? 1 : 0.85 }} />
      )}
    </div>
  )
}

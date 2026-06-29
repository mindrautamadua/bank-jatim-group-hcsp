'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { updatePmoAction, type PmoUpdateState } from '@/app/(app)/portfolio/[kode]/update/actions'
import { Card } from '@/components/ui'
import { fmtTarget, healthColor } from '@/lib/format'
import { FREKUENSI_OPSI, periodeUntuk } from '@/lib/periode'
import { deriveHealth, hitungKinerja, realisasiTahunanDari } from '@/lib/kinerja'
import type { Frekuensi, IK, Sasaran } from '@/lib/types'
import { AlertCircle, CheckCircle2, Info, Loader2, Save } from 'lucide-react'

const TAHUN = [2026, 2027, 2028, 2029, 2030]

const inputCls =
  'w-full rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

function isInvalidNum(v: string) {
  return v.trim() !== '' && !Number.isFinite(Number(v.trim().replace(',', '.')))
}

// Warna capaian mengikuti ambang health (hijau/kuning/merah).
const capaianColor = (pct: number) => healthColor[deriveHealth(pct)]

function IKBlock({
  ik,
  year,
  frek,
  onFrek,
  rawVal,
  onVal,
  capaian,
}: {
  ik: IK
  year: number
  frek: Frekuensi
  onFrek: (f: Frekuensi) => void
  rawVal: (key: string) => string
  onVal: (key: string, v: string) => void
  capaian: number | null
}) {
  const periodeList = periodeUntuk(frek)
  const targetTahun = ik.targets.find((t) => t.tahun === year)?.target ?? null

  return (
    <div className="rounded-xl border border-bbborder/70 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug text-bbink">{ik.nama}</h3>
        <div className="flex items-center gap-2">
          {ik.satuan && (
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{ik.satuan}</span>
          )}
          <select
            name={`frek_${ik.id}`}
            value={frek}
            onChange={(e) => onFrek(e.target.value as Frekuensi)}
            aria-label={`Frekuensi pelaporan ${ik.nama}`}
            className="rounded-md border border-bbborder bg-white px-2 py-1 text-xs font-medium text-bbink outline-none focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
          >
            {FREKUENSI_OPSI.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bbmuted">
        <span>
          Target {year}: <span className="font-medium text-bbgreen-dark tabular-nums">{targetTahun !== null ? fmtTarget(Number(targetTahun), ik.satuan) : '-'}</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          Capaian:{' '}
          {capaian !== null ? (
            <span className="font-semibold tabular-nums" style={{ color: capaianColor(capaian) }}>{Math.round(capaian)}%</span>
          ) : (
            <span className="text-bbfaint">-</span>
          )}
        </span>
        {frek !== 'tahunan' && <span className="basis-full text-bbfaint">realisasi tahunan = nilai periode terakhir yang terisi</span>}
      </div>

      <div className={`grid gap-3 ${frek === 'bulanan' ? 'grid-cols-3 sm:grid-cols-6' : frek === 'triwulanan' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
        {periodeList.map((p) => {
          const v = rawVal(p.key)
          const bad = isInvalidNum(v)
          return (
            <div key={p.key} className="flex flex-col gap-1">
              <label htmlFor={`real_${ik.id}_${p.key}`} className="text-xs font-medium text-bbmuted">{p.label}</label>
              <input
                id={`real_${ik.id}_${p.key}`}
                name={`real_${ik.id}_${p.key}`}
                type="text"
                inputMode="decimal"
                value={v}
                onChange={(e) => onVal(p.key, e.target.value)}
                aria-invalid={bad || undefined}
                placeholder="-"
                className={`${inputCls} text-right tabular-nums ${bad ? 'border-bbred focus:border-bbred focus:ring-bbred/20' : ''}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PmoUpdateForm({
  sasaran,
  iks,
}: {
  sasaran: Sasaran
  iks: IK[]
}) {
  const action = updatePmoAction.bind(null, sasaran.kode)
  const [state, formAction, pending] = useActionState<PmoUpdateState, FormData>(action, {})
  const [year, setYear] = useState(2026)

  // State realisasi & frekuensi diangkat ke sini agar capaian per IK bisa dihitung
  // langsung (lihat lib/kinerja). Tidak menulis status/health/progress sasaran —
  // itu bersumber dari progress Key Program.
  const [freks, setFreks] = useState<Record<number, Frekuensi>>(() =>
    Object.fromEntries(iks.map((ik) => [ik.id, ik.frekuensi]))
  )
  // Nilai realisasi per "ikId:tahun:periode" — tidak hilang saat berpindah tahun/frekuensi.
  const [vals, setVals] = useState<Record<string, string>>({})

  const dirtyRef = useRef(false)
  const markDirty = () => { dirtyRef.current = true }

  const dbNilai = (ikId: number, yr: number, key: string) => {
    const ik = iks.find((x) => x.id === ikId)
    const p = ik?.periode.find((x) => x.tahun === yr && x.periode === key)
    return p?.nilai !== null && p?.nilai !== undefined ? String(p.nilai) : ''
  }
  const rawVal = (ikId: number, yr: number, key: string) => vals[`${ikId}:${yr}:${key}`] ?? dbNilai(ikId, yr, key)
  const parsedVal = (ikId: number, yr: number, key: string): number | null => {
    const s = rawVal(ikId, yr, key).trim().replace(',', '.')
    if (s === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  const setFrek = (ikId: number, f: Frekuensi) => { setFreks((m) => ({ ...m, [ikId]: f })); markDirty() }
  const setVal = (ikId: number, key: string, v: string) => {
    setVals((m) => ({ ...m, [`${ikId}:${year}:${key}`]: v }))
    markDirty()
  }

  // Capaian tahun terpilih per IK: realisasi tahunan (YTD) vs target. Hanya informatif.
  const kinerja = useMemo(() => {
    const items = iks.map((ik) => {
      const frek = freks[ik.id] ?? ik.frekuensi
      const realisasi = realisasiTahunanDari(frek, (key) => parsedVal(ik.id, year, key))
      const target = ik.targets.find((t) => t.tahun === year)?.target ?? null
      return { realisasi, target, arah: ik.arah }
    })
    return hitungKinerja(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iks, freks, vals, year])

  // Cegah kehilangan data: peringatkan saat menutup/refresh halaman bila ada perubahan belum tersimpan.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])
  useEffect(() => { if (state.ok) dirtyRef.current = false }, [state.ok])

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bbred/30 bg-red-50 px-3.5 py-3 text-sm text-bbred">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-bbgreen/30 bg-bbgreen-light px-3.5 py-3 text-sm text-bbgreen-dark">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>Realisasi indikator kinerja berhasil disimpan.</span>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-lg bg-bbgreen-light/40 px-3.5 py-3 text-xs text-bbmuted">
        <Info size={14} className="mt-0.5 shrink-0 text-bbgreen-dark" />
        <span>
          Halaman ini mengelola <span className="font-medium text-bbink">realisasi Indikator Kinerja</span> (outcome).
          Status, health &amp; progress sasaran dihitung otomatis dari progress terverifikasi <span className="font-medium text-bbink">Key Program</span> (perbarui di halaman Gantt), bukan di sini.
        </span>
      </p>

      {/* Realisasi IK - periodik sesuai frekuensi */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-bbink">Realisasi Indikator Kinerja</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-bbmuted">Tahun pelaporan</span>
            <div className="flex gap-1 rounded-lg bg-bbgreen-light/60 p-1">
              {TAHUN.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`bb-press rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors ${
                    year === y ? 'bg-bbgreen text-white shadow-sm' : 'text-bbgreen-dark hover:bg-white'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Tahun terpilih dikirim ke server */}
        <input type="hidden" name="tahun" value={year} />
        <p className="mb-4 text-xs text-bbmuted">
          Atur frekuensi tiap indikator (bulanan/triwulanan/semesteran/tahunan), lalu isi realisasi untuk tahun {year}. Kosongkan bila belum tersedia. Gunakan koma atau titik untuk desimal — nilai yang Anda ketik tetap tersimpan saat berpindah tahun.
        </p>

        {iks.length === 0 && <p className="text-sm text-bbmuted">Tidak ada indikator kinerja terdaftar.</p>}

        <div className="space-y-5">
          {iks.map((ik, i) => (
            <IKBlock
              key={ik.id}
              ik={ik}
              year={year}
              frek={freks[ik.id] ?? ik.frekuensi}
              onFrek={(f) => setFrek(ik.id, f)}
              rawVal={(key) => rawVal(ik.id, year, key)}
              onVal={(key, v) => setVal(ik.id, key, v)}
              capaian={kinerja.capaian[i]}
            />
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bb-press flex items-center justify-center gap-2 rounded-lg bg-bbgreen px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <><Loader2 size={17} className="animate-spin" /> Menyimpan</>
          ) : (
            <><Save size={17} /> Simpan Realisasi</>
          )}
        </button>
        <span className="text-xs text-bbmuted">Realisasi disimpan untuk tahun {year}</span>
      </div>
    </form>
  )
}

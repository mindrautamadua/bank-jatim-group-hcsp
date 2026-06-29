'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addBenefitAction, setBenefitActualAction, deleteBenefitAction } from '@/app/(app)/benefits/actions'
import { JENIS_BENEFIT, ARAH_BENEFIT, jenisBadge, realizationPct, benefitStatus, benefitToneBadge, fmtVal } from '@/lib/benefit-constants'
import type { Benefit } from '@/lib/benefit'
import { Plus, Trash2, Trophy, ArrowUp, ArrowDown } from 'lucide-react'

const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

export default function BenefitManager({ kode, benefits, canEdit }: { kode: string; benefits: Benefit[]; canEdit: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const namaRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (adding) namaRef.current?.focus() }, [adding])
  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => { setErr(null); const r = (await fn()) as { error?: string } | void; if (r && 'error' in r && r.error) setErr(r.error); else { router.refresh(); after?.() } })

  return (
    <div className="bb-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-bbink"><Trophy size={17} className="text-bbgreen" /> Benefit Register <span className="text-sm font-normal text-bbmuted">({benefits.length})</span></h2>
        {canEdit && !adding && <button onClick={() => setAdding(true)} className="bb-press inline-flex items-center gap-1.5 rounded-lg bg-bbgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-bbgreen-dark"><Plus size={15} /> Tambah</button>}
      </div>

      {canEdit && adding && (
        <form
          onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => addBenefitAction(kode, {}, fd), () => setAdding(false)) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setErr(null) } }}
          className="mb-4 space-y-2 rounded-xl border border-bbborder bg-bbbg/50 p-3"
        >
          <input ref={namaRef} name="nama" required aria-label="Manfaat / dampak" placeholder="Manfaat / dampak (mis. Waktu pengisian jabatan turun)" className={`${inp} w-full`} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select name="jenis" defaultValue="Outcome" aria-label="Jenis benefit" className={inp}>{JENIS_BENEFIT.map((j) => <option key={j} value={j}>{j}</option>)}</select>
            <input name="satuan" aria-label="Satuan" placeholder="satuan (%, hari, Rp)" className={inp} />
            <select name="arah" defaultValue="naik" aria-label="Arah perbaikan" className={inp}>{ARAH_BENEFIT.map((a) => <option key={a} value={a}>{a === 'naik' ? 'Makin tinggi baik' : 'Makin rendah baik'}</option>)}</select>
            <input name="target_tahun" type="number" min={2026} max={2030} aria-label="Tahun target" placeholder="tahun target" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Baseline</span><input name="baseline" inputMode="decimal" className={inp} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Target</span><input name="target" inputMode="decimal" className={inp} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Actual (opsional)</span><input name="actual" inputMode="decimal" className={inp} /></label>
          </div>
          <input name="catatan" aria-label="Catatan" placeholder="Catatan (opsional)" className={`${inp} w-full`} />
          {err && <p role="alert" className="text-sm text-bbred">{err}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">Simpan</button>
            <button type="button" onClick={() => { setAdding(false); setErr(null) }} className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Batal</button>
          </div>
        </form>
      )}

      {benefits.length === 0 && !adding && <p className="text-sm text-bbfaint">Belum ada benefit terdaftar untuk program ini.</p>}

      <div className="space-y-3">
        {benefits.map((b) => {
          const pct = realizationPct(b)
          const st = benefitStatus(b)
          return (
            <div key={b.id} className="rounded-xl border border-bbborder p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${jenisBadge[b.jenis] ?? 'bg-gray-100 text-gray-600'}`}>{b.jenis}</span>
                    <span className="text-sm font-medium text-bbink">{b.nama}</span>
                    {b.arah === 'turun' ? <ArrowDown size={13} className="text-bbmuted" /> : <ArrowUp size={13} className="text-bbmuted" />}
                  </div>
                  {b.catatan && <p className="mt-0.5 text-xs text-bbmuted">{b.catatan}</p>}
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${benefitToneBadge[st.tone]}`}>{st.label}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm tabular-nums">
                <span className="text-bbmuted">Baseline <b className="text-bbink">{fmtVal(b.baseline, b.satuan)}</b></span>
                <span className="text-bbmuted">Target <b className="text-bbgreen-dark">{fmtVal(b.target, b.satuan)}</b>{b.target_tahun ? ` (${b.target_tahun})` : ''}</span>
                {canEdit ? (
                  <span className="flex items-center gap-1.5 text-bbmuted">Actual
                    <input inputMode="decimal" aria-label={`Actual untuk ${b.nama}`} defaultValue={b.actual ?? ''} onBlur={(e) => { const s = e.target.value.trim().replace(',', '.'); const v = s === '' ? null : Number(s); if ((v ?? null) !== (b.actual ?? null) && (v === null || Number.isFinite(v))) run(() => setBenefitActualAction(b.id, kode, v)) }} className="w-20 rounded-md border border-bbborder px-2 py-1 text-sm tabular-nums text-bbink" />
                  </span>
                ) : (
                  <span className="text-bbmuted">Actual <b className="text-bbink">{fmtVal(b.actual, b.satuan)}</b></span>
                )}
                {pct !== null && <span className="text-bbmuted">Realisasi <b className="text-bbink">{pct}%</b></span>}
                {canEdit && <button onClick={() => { if (confirm(`Hapus benefit "${b.nama}"?`)) run(() => deleteBenefitAction(b.id, kode)) }} className="bb-press ml-auto grid h-9 w-9 place-items-center rounded-md text-bbfaint hover:bg-red-50 hover:text-bbred" aria-label="Hapus benefit"><Trash2 size={14} /></button>}
              </div>

              {pct !== null && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bbgreen-light">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: st.tone === 'red' ? 'var(--bb-red)' : st.tone === 'amber' ? 'var(--bb-amber)' : 'var(--bb-green)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {err && !adding && <p role="alert" className="mt-2 text-sm text-bbred">{err}</p>}
    </div>
  )
}

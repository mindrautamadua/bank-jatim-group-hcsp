'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  submitRincianProgressAction, verifyRincianProgressAction, resetRincianProgressAction, type RincianState,
} from '@/app/(app)/gantt/rincian-actions'
import { kegiatanStatusBadge } from '@/lib/kegiatan-constants'
import ConfirmTypingDialog from '@/components/ConfirmTypingDialog'
import type { GanttRincian } from '@/lib/gantt'
import {
  Send, CheckCircle2, Undo2, Loader2, Clock, ChevronDown, TrendingUp, RotateCcw,
} from 'lucide-react'

const inp = 'w-full rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'
const fmtTs = (s: string | null) => (s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '')

export default function RincianProgressControl({
  kode, kegiatanId, label, rincian, canSubmit, canVerify, isAdmin = false,
}: {
  kode: string
  kegiatanId: number
  label: string
  rincian: GanttRincian
  canSubmit: boolean
  canVerify: boolean
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const run = (fn: () => Promise<RincianState>, after?: () => void) =>
    start(async () => {
      setErr(null)
      const r = await fn()
      if (r?.error) setErr(r.error)
      else { router.refresh(); after?.() }
    })

  const latest = rincian.history[0]
  const awaiting = latest?.status === 'Diajukan'

  return (
    <div className="border-b border-bbborder/30 bg-bbbg/15 py-2.5 pl-[3.75rem] pr-4">
      <div className="flex items-start gap-1.5">
        <span className="mt-px shrink-0 font-mono text-[11px] font-bold text-bbgreen-dark">{label}</span>
        <p className="text-xs leading-snug text-bbink">{rincian.teks}</p>
      </div>

      {/* Ringkasan progress terkini */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bbmuted">
        <TrendingUp size={11} className="text-bbgreen" />
        <span className="font-semibold tabular-nums text-bbink">Progress terverifikasi {rincian.progress}%</span>
        {latest && <span className={`rounded px-1.5 py-0.5 font-semibold ${kegiatanStatusBadge[latest.status]}`}>{latest.status}{awaiting ? ` ${latest.progress}%` : ''}</span>}
        {latest?.diajukan_nama && <span>· diajukan {latest.diajukan_nama}{latest.diajukan_unit ? ` (${latest.diajukan_unit})` : ''} · {fmtTs(latest.diajukan_at)}</span>}
        {latest?.verifikasi_at && <span>· {latest.status === 'Dikembalikan' ? 'dikembalikan' : 'diverifikasi'} {latest.verifikasi_nama ?? '—'} · {fmtTs(latest.verifikasi_at)}</span>}
      </div>
      {latest?.verifikasi_catatan && (
        <p className="mt-1 rounded bg-white px-2 py-1 text-[11px] text-bbmuted"><span className="font-semibold text-bbink">Catatan verifikasi:</span> {latest.verifikasi_catatan}{latest.verifikasi_nama ? ` — ${latest.verifikasi_nama}` : ''}</p>
      )}

      {/* Reset (Admin) — koreksi progress yang sudah diajukan/diverifikasi */}
      {isAdmin && rincian.history.length > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmReset(true)}
          className="bb-press mt-1.5 inline-flex items-center gap-1 rounded-md border border-bbred/40 px-2.5 py-1.5 text-xs font-medium text-bbred hover:bg-red-50 disabled:opacity-60"
          title="Reset progress (Admin)"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset progress
        </button>
      )}

      <ConfirmTypingDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => run(
          () => resetRincianProgressAction(kode, kegiatanId, rincian.index),
          () => setConfirmReset(false),
        )}
        pending={pending}
        title="Reset progress Kegiatan Utama"
        message="Seluruh pengajuan & verifikasi item ini akan dihapus permanen dan progress kembali 0% (Belum Dikerjakan). Evidence terkait dihapus terpisah. Tindakan ini tidak dapat dibatalkan."
        confirmWord="RESET"
        confirmLabel="Reset progress"
      />

      {/* Verifikasi (Utama) atas pengajuan terbaru */}
      {canVerify && awaiting && latest && (
        <form className="mt-1.5 space-y-1.5" onSubmit={(e) => e.preventDefault()}>
          <input name="catatan" placeholder="Catatan (wajib bila dikembalikan)" className={`${inp} py-1.5 text-xs`} aria-label="Catatan verifikasi" />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" disabled={pending}
              onClick={(e) => { const f = e.currentTarget.closest('form') as HTMLFormElement; run(() => verifyRincianProgressAction(kode, latest.id, 'Diverifikasi', {}, new FormData(f))) }}
              className="bb-press inline-flex items-center gap-1 rounded-md bg-bbgreen px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">
              {pending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Verifikasi {latest.progress}%
            </button>
            <button type="button" disabled={pending}
              onClick={(e) => { const f = e.currentTarget.closest('form') as HTMLFormElement; run(() => verifyRincianProgressAction(kode, latest.id, 'Dikembalikan', {}, new FormData(f))) }}
              className="bb-press inline-flex items-center gap-1 rounded-md border border-bbborder px-2.5 py-1.5 text-xs font-medium text-bbred hover:bg-red-50 disabled:opacity-60">
              <Undo2 size={12} /> Kembalikan
            </button>
          </div>
        </form>
      )}

      {/* Pengajuan progress (Pendukung) */}
      {canSubmit && (
        <div className="mt-1.5">
          {!openForm ? (
            <button onClick={() => { setOpenForm(true); setErr(null) }} className="bb-press inline-flex items-center gap-1.5 rounded-md border border-bbgreen/40 bg-bbgreen-light/40 px-2.5 py-1.5 text-xs font-semibold text-bbgreen-dark hover:bg-bbgreen-light">
              <Send size={12} /> {latest ? 'Ajukan progress baru' : 'Ajukan progress'}
            </button>
          ) : (
            <form ref={formRef}
              onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => submitRincianProgressAction(kode, kegiatanId, rincian.index, {}, fd), () => { setOpenForm(false); formRef.current?.reset() }) }}
              className="space-y-2 rounded-md border border-bbborder bg-bbbg/50 p-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-bbmuted">Progress (%)</span>
                <input name="progress" type="number" min={0} max={100} required defaultValue={rincian.progress} className={`${inp} py-1.5 text-xs`} />
              </label>
              <input name="catatan" placeholder="Catatan (opsional)" className={`${inp} py-1.5 text-xs`} />
              {err && <p role="alert" className="text-xs text-bbred">{err}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="bb-press inline-flex items-center gap-1.5 rounded-md bg-bbgreen px-3 py-1.5 text-xs font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">
                  {pending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Ajukan
                </button>
                <button type="button" onClick={() => { setOpenForm(false); setErr(null) }} className="bb-press rounded-md border border-bbborder px-3 py-1.5 text-xs font-medium text-bbmuted">Batal</button>
              </div>
            </form>
          )}
        </div>
      )}

      {err && !openForm && <p role="alert" className="mt-1.5 text-xs text-bbred">{err}</p>}

      {/* Riwayat pengajuan */}
      {rincian.history.length > 1 && (
        <div className="mt-1.5">
          <button onClick={() => setShowHistory((s) => !s)} className="inline-flex items-center gap-1 text-[11px] font-medium text-bbmuted hover:text-bbink">
            <ChevronDown size={12} className={showHistory ? 'rotate-180 transition-transform' : 'transition-transform'} /> Riwayat ({rincian.history.length - 1})
          </button>
          {showHistory && (
            <ul className="mt-1 space-y-1">
              {rincian.history.slice(1).map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-2 text-[11px] text-bbmuted">
                  <Clock size={10} />
                  <span>{fmtTs(h.diajukan_at)}</span>
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${kegiatanStatusBadge[h.status]}`}>{h.status}</span>
                  <span className="tabular-nums">{h.progress}%</span>
                  {h.diajukan_nama && <span>· diajukan {h.diajukan_nama}</span>}
                  {h.verifikasi_at && <span>· {h.status === 'Dikembalikan' ? 'dikembalikan' : 'diverifikasi'} {h.verifikasi_nama ?? '—'} · {fmtTs(h.verifikasi_at)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

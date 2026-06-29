'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  uploadHasilEvidenceAction, verifyHasilEvidenceAction, deleteHasilEvidenceAction,
  type HasilState,
} from '@/app/(app)/gantt/hasil-actions'
import { kegiatanStatusBadge, EVIDENCE_ACCEPT, EVIDENCE_MAX_BYTES, fmtBytes } from '@/lib/kegiatan-constants'
import ConfirmTypingDialog from '@/components/ConfirmTypingDialog'
import type { GanttHasil } from '@/lib/gantt'
import {
  ClipboardCheck, Paperclip, Upload, CheckCircle2, Undo2, Loader2, Trash2, Clock, FileText,
} from 'lucide-react'

const inp = 'w-full rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'
const fmtTs = (s: string | null) => (s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '')

export default function HasilEvidencePanel({
  kode, kegiatanId, no, hasil, canSubmit, canVerify, currentUserId, isAdmin,
}: {
  kode: string
  kegiatanId: number
  no: number
  hasil: GanttHasil[]
  canSubmit: boolean
  canVerify: boolean
  currentUserId: number | null
  isAdmin: boolean
}) {
  if (hasil.length === 0) return null
  return (
    <div className="border-b border-bbborder/40 bg-bbgreen-light/10 py-3 pl-[3.75rem] pr-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-bbfaint">
        <ClipboardCheck size={12} /> Hasil Pelaksanaan &amp; Evidence
      </p>
      <p className="mb-2 mt-0.5 flex items-start gap-1.5 text-[11px] text-bbmuted">
        <FileText size={11} className="mt-0.5 shrink-0 text-bbfaint" />
        <span>Format: PDF, Word, Excel, PowerPoint, gambar (PNG/JPG), atau ZIP · maks {fmtBytes(EVIDENCE_MAX_BYTES)} per berkas.</span>
      </p>
      <ol className="space-y-2">
        {hasil.map((h) => (
          <HasilItemRow
            key={h.index} kode={kode} kegiatanId={kegiatanId} label={`${no}.${String.fromCharCode(97 + h.index)}`}
            hasil={h} canSubmit={canSubmit} canVerify={canVerify} currentUserId={currentUserId} isAdmin={isAdmin}
          />
        ))}
      </ol>
    </div>
  )
}

function HasilItemRow({
  kode, kegiatanId, label, hasil, canSubmit, canVerify, currentUserId, isAdmin,
}: {
  kode: string
  kegiatanId: number
  label: string
  hasil: GanttHasil
  canSubmit: boolean
  canVerify: boolean
  currentUserId: number | null
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const run = (fn: () => Promise<HasilState>, after?: () => void) =>
    start(async () => {
      setErr(null)
      const r = await fn()
      if (r?.error) setErr(r.error)
      else { router.refresh(); after?.() }
    })

  const ev = hasil.evidence
  return (
    <li className="rounded-lg border border-bbborder bg-white/70 p-2.5">
      <div className="flex items-start gap-1.5">
        <span className="mt-px shrink-0 font-mono text-[11px] font-bold text-bbgreen-dark">{label}</span>
        <p className="text-xs leading-snug text-bbink">{hasil.teks}</p>
      </div>

      {/* Daftar evidence (terbaru dulu) */}
      {ev.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {ev.map((e) => {
            const canDelete = isAdmin || (currentUserId !== null && e.diupload_user_id === currentUserId)
            const awaiting = e.status === 'Diajukan'
            return (
              <li key={e.id} className="rounded-md bg-bbbg/60 p-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${kegiatanStatusBadge[e.status]}`}>{e.status}</span>
                  <a href={`/api/evidence/hasil/${e.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-bbgreen hover:underline">
                    <Paperclip size={11} /> {e.evidence_nama} <span className="text-bbfaint">({fmtBytes(e.evidence_size)})</span>
                  </a>
                  {canDelete && (
                    <button type="button" disabled={pending} onClick={() => setConfirmDelete(e.id)}
                      className="text-bbred hover:text-red-700 disabled:opacity-50" aria-label="Hapus evidence" title="Hapus evidence">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-bbmuted">
                  <Clock size={10} />
                  <span>{fmtTs(e.diupload_at)}</span>
                  {e.diupload_nama && <span>· {e.diupload_nama}{e.diupload_unit ? ` (${e.diupload_unit})` : ''}</span>}
                </div>
                {e.catatan && <p className="mt-1 whitespace-pre-wrap text-bbink">{e.catatan}</p>}
                {e.verifikasi_catatan && (
                  <p className="mt-1 rounded bg-white px-2 py-1 text-[11px] text-bbmuted"><span className="font-semibold text-bbink">Catatan verifikasi:</span> {e.verifikasi_catatan}{e.verifikasi_nama ? ` — ${e.verifikasi_nama}` : ''}</p>
                )}
                {/* Verifikasi (Utama) untuk evidence yang masih Diajukan */}
                {canVerify && awaiting && (
                  <form className="mt-1.5 space-y-1.5" onSubmit={(ed) => ed.preventDefault()}>
                    <input name="catatan" placeholder="Catatan (wajib bila dikembalikan)" className={`${inp} py-1.5 text-xs`} aria-label="Catatan verifikasi" />
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" disabled={pending}
                        onClick={(ce) => { const f = ce.currentTarget.closest('form') as HTMLFormElement; run(() => verifyHasilEvidenceAction(kode, e.id, 'Diverifikasi', {}, new FormData(f))) }}
                        className="bb-press inline-flex items-center gap-1 rounded-md bg-bbgreen px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">
                        {pending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Verifikasi
                      </button>
                      <button type="button" disabled={pending}
                        onClick={(ce) => { const f = ce.currentTarget.closest('form') as HTMLFormElement; run(() => verifyHasilEvidenceAction(kode, e.id, 'Dikembalikan', {}, new FormData(f))) }}
                        className="bb-press inline-flex items-center gap-1 rounded-md border border-bbborder px-2.5 py-1.5 text-xs font-medium text-bbred hover:bg-red-50 disabled:opacity-60">
                        <Undo2 size={12} /> Kembalikan
                      </button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-1.5 pl-5 text-[11px] text-bbfaint">Belum ada evidence.</p>
      )}

      {/* Unggah (Pendukung) */}
      {canSubmit && (
        <div className="mt-2">
          {!openForm ? (
            <button onClick={() => { setOpenForm(true); setErr(null) }} className="bb-press inline-flex items-center gap-1.5 rounded-md border border-bbgreen/40 bg-bbgreen-light/40 px-2.5 py-1.5 text-xs font-semibold text-bbgreen-dark hover:bg-bbgreen-light">
              <Upload size={12} /> Unggah evidence
            </button>
          ) : (
            <form ref={formRef}
              onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => uploadHasilEvidenceAction(kode, kegiatanId, hasil.index, {}, fd), () => { setOpenForm(false); formRef.current?.reset() }) }}
              className="space-y-2 rounded-md border border-bbborder bg-bbbg/50 p-2.5">
              <input name="catatan" placeholder="Catatan (opsional)" className={`${inp} py-1.5 text-xs`} />
              <input name="evidence" type="file" required accept={EVIDENCE_ACCEPT} className="block w-full text-xs text-bbmuted file:mr-3 file:rounded-md file:border-0 file:bg-bbgreen-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-bbgreen-dark" />
              <p className="flex items-center gap-1 text-[11px] text-bbfaint"><FileText size={11} /> PDF, Word, Excel, PowerPoint, gambar (PNG/JPG), atau ZIP — maks {fmtBytes(EVIDENCE_MAX_BYTES)}.</p>
              {err && <p role="alert" className="text-xs text-bbred">{err}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="bb-press inline-flex items-center gap-1.5 rounded-md bg-bbgreen px-3 py-1.5 text-xs font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">
                  {pending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Unggah
                </button>
                <button type="button" onClick={() => { setOpenForm(false); setErr(null) }} className="bb-press rounded-md border border-bbborder px-3 py-1.5 text-xs font-medium text-bbmuted">Batal</button>
              </div>
            </form>
          )}
        </div>
      )}

      {err && !openForm && <p role="alert" className="mt-1.5 text-xs text-bbred">{err}</p>}

      <ConfirmTypingDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          const id = confirmDelete
          if (id === null) return
          run(() => deleteHasilEvidenceAction(kode, id), () => setConfirmDelete(null))
        }}
        pending={pending}
        title="Hapus evidence"
        message={`Evidence "${ev.find((x) => x.id === confirmDelete)?.evidence_nama ?? ''}" akan dihapus permanen beserta berkasnya. Tindakan ini tidak dapat dibatalkan.`}
        confirmWord="DELETE"
        confirmLabel="Hapus evidence"
      />
    </li>
  )
}

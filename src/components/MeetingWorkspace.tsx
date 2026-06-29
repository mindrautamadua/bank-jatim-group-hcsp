'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  updateMeetingAction, addDecisionAction, deleteDecisionAction,
  addActionItemAction, setActionStatusAction, deleteActionItemAction,
} from '@/app/(app)/governance/actions'
import type { GovMeeting, GovDecision, GovAction } from '@/lib/governance'
import { Pencil, Trash2, Plus, Check, FileText, Gavel, ListTodo, X } from 'lucide-react'

const JENIS = ['Steering Committee', 'Rapat PMO', 'Rapat Direksi']
const STATUS = ['Scheduled', 'Held', 'Cancelled']
const statusBadge: Record<string, string> = {
  Scheduled: 'bg-amber-50 text-amber-700', Held: 'bg-bbgreen-light text-bbgreen-dark', Cancelled: 'bg-gray-100 text-gray-500',
}
const actionBadge = (a: GovAction) =>
  a.overdue ? 'bg-red-50 text-red-700' : a.status === 'Done' ? 'bg-bbgreen-light text-bbgreen-dark' : a.status === 'In Progress' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
const actionLabel = (a: GovAction) => (a.overdue ? 'Terlambat' : a.status)

interface Opt { kode: string; nama: string }

export default function MeetingWorkspace({
  meeting, decisions, actions, sasaranOptions, canEdit,
}: {
  meeting: GovMeeting
  decisions: GovDecision[]
  actions: GovAction[]
  sasaranOptions: Opt[]
  canEdit: boolean
}) {
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  // Error per-bagian agar pesan tidak salah tempat antar form.
  const [errEdit, setErrEdit] = useState<string | null>(null)
  const [errDec, setErrDec] = useState<string | null>(null)
  const [errAct, setErrAct] = useState<string | null>(null)
  const decForm = useRef<HTMLFormElement>(null)
  const actForm = useRef<HTMLFormElement>(null)
  const editJudul = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) editJudul.current?.focus() }, [editing])

  const run = (fn: () => Promise<unknown>, setE: (s: string | null) => void, after?: () => void) =>
    start(async () => { setE(null); const r = (await fn()) as { error?: string } | void; if (r && 'error' in r && r.error) setE(r.error); else after?.() })

  const namaOf = (k: string | null) => (k ? sasaranOptions.find((o) => o.kode === k)?.nama ?? k : null)

  return (
    <div className="space-y-6">
      {/* Header / edit */}
      <div className="bb-card p-6">
        {!editing ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-bbgreen-light px-2 py-0.5 text-xs font-semibold text-bbgreen-dark">{meeting.jenis}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadge[meeting.status] ?? ''}`}>{meeting.status}</span>
                  {meeting.tanggal && <span className="text-xs text-bbmuted">{meeting.tanggal}</span>}
                </div>
                <h1 className="font-display text-xl font-bold text-bbink">{meeting.judul}</h1>
                {meeting.lokasi && <p className="mt-1 text-sm text-bbmuted">Lokasi: {meeting.lokasi}</p>}
              </div>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="bb-press inline-flex items-center gap-1.5 rounded-lg border border-bbborder bg-white px-3 py-1.5 text-sm font-medium text-bbmuted hover:border-bbgreen hover:text-bbgreen-dark">
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            {meeting.peserta && <div className="mt-4"><div className="text-xs font-semibold uppercase tracking-wide text-bbmuted">Peserta</div><p className="mt-1 text-sm text-bbink">{meeting.peserta}</p></div>}
            {meeting.agenda && <div className="mt-4"><div className="text-xs font-semibold uppercase tracking-wide text-bbmuted">Agenda</div><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-bbink">{meeting.agenda}</p></div>}
          </>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => updateMeetingAction(meeting.id, {}, fd), setErrEdit, () => setEditing(false)) }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setErrEdit(null) } }}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Judul rapat"><input ref={editJudul} name="judul" defaultValue={meeting.judul} required className={inp} /></Field>
              <Field label="Jenis"><select name="jenis" defaultValue={meeting.jenis} className={inp}>{JENIS.map((j) => <option key={j}>{j}</option>)}</select></Field>
              <Field label="Tanggal"><input type="date" name="tanggal" defaultValue={meeting.tanggal ?? ''} className={inp} /></Field>
              <Field label="Status"><select name="status" defaultValue={meeting.status} className={inp}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Lokasi"><input name="lokasi" defaultValue={meeting.lokasi ?? ''} className={inp} /></Field>
              <Field label="Peserta"><input name="peserta" defaultValue={meeting.peserta ?? ''} placeholder="mis. Direksi, Kadiv SDM, PMO" className={inp} /></Field>
            </div>
            <Field label="Agenda"><textarea name="agenda" defaultValue={meeting.agenda ?? ''} rows={3} className={inp} /></Field>
            <Field label="Minutes of Meeting (MoM)"><textarea name="mom" defaultValue={meeting.mom ?? ''} rows={5} placeholder="Catatan jalannya rapat, pembahasan, kesimpulan..." className={inp} /></Field>
            {errEdit && <p role="alert" className="text-sm text-bbred">{errEdit}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">Simpan</button>
              <button type="button" onClick={() => { setEditing(false); setErrEdit(null) }} className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Batal</button>
            </div>
          </form>
        )}
      </div>

      {/* MoM */}
      {!editing && (
        <div className="bb-card p-6">
          <h2 className="mb-2 flex items-center gap-2 font-display font-semibold text-bbink"><FileText size={17} className="text-bbgreen" /> Minutes of Meeting</h2>
          {meeting.mom ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-bbink">{meeting.mom}</p>
            : <p className="text-sm text-bbfaint">Belum ada notulen. {canEdit && 'Klik Edit untuk menambahkan.'}</p>}
        </div>
      )}

      {/* Decisions */}
      <div className="bb-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-bbink"><Gavel size={17} className="text-bbgreen" /> Decision Log <span className="text-sm font-normal text-bbmuted">({decisions.length})</span></h2>
        <div className="divide-y divide-bbborder">
          {decisions.length === 0 && <p className="py-2 text-sm text-bbfaint">Belum ada keputusan.</p>}
          {decisions.map((d) => (
            <div key={d.id} className="flex items-start gap-3 py-2.5">
              <Check size={16} className="mt-0.5 shrink-0 text-bbgreen" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-bbink">{d.ringkasan}</p>
                {d.sasaran_kode && <Link href={`/portfolio/${encodeURIComponent(d.sasaran_kode)}`} className="text-xs font-medium text-bbgreen hover:underline">{d.sasaran_kode} · {namaOf(d.sasaran_kode)}</Link>}
              </div>
              {canEdit && <button onClick={() => { if (confirm('Hapus keputusan ini?')) run(() => deleteDecisionAction(d.id, meeting.id), setErrDec) }} className="bb-press grid h-9 w-9 shrink-0 place-items-center rounded-md text-bbfaint hover:bg-red-50 hover:text-bbred" aria-label="Hapus keputusan"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
        {canEdit && (
          <form ref={decForm} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => addDecisionAction(meeting.id, fd), setErrDec, () => decForm.current?.reset()) }} className="mt-3 flex flex-col gap-2 border-t border-bbborder pt-3 sm:flex-row">
            <input name="ringkasan" required aria-label="Keputusan rapat" placeholder="Keputusan rapat..." className={`${inp} flex-1`} />
            <select name="sasaran_kode" aria-label="Kaitkan ke program" className={`${inp} sm:w-44`}><option value="">(tanpa kaitan)</option>{sasaranOptions.map((o) => <option key={o.kode} value={o.kode}>{o.kode}</option>)}</select>
            <button type="submit" disabled={pending} className="bb-press inline-flex items-center justify-center gap-1.5 rounded-lg bg-bbgreen px-3 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60"><Plus size={15} /> Tambah</button>
          </form>
        )}
        {errDec && <p role="alert" className="mt-2 text-sm text-bbred">{errDec}</p>}
      </div>

      {/* Action items */}
      <div className="bb-card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-bbink"><ListTodo size={17} className="text-bbgreen" /> Action Items <span className="text-sm font-normal text-bbmuted">({actions.length})</span></h2>
        <div className="space-y-2">
          {actions.length === 0 && <p className="text-sm text-bbfaint">Belum ada tindak lanjut.</p>}
          {actions.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-bbborder px-3 py-2">
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${actionBadge(a)}`}>{actionLabel(a)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-bbink">{a.judul}</p>
                <p className="text-xs text-bbmuted">
                  {a.pic && <span>PIC: {a.pic}</span>}{a.pic && a.due_date && ' · '}{a.due_date && <span>jatuh tempo {a.due_date}</span>}
                  {a.sasaran_kode && <> · <Link href={`/portfolio/${encodeURIComponent(a.sasaran_kode)}`} className="font-medium text-bbgreen hover:underline">{a.sasaran_kode}</Link></>}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <select value={a.status} onChange={(e) => run(() => setActionStatusAction(a.id, meeting.id, e.target.value), setErrAct)} aria-label={`Status tindak lanjut: ${a.judul}`} className="rounded-md border border-bbborder bg-white px-2 py-1.5 text-xs text-bbink">
                    <option>Open</option><option>In Progress</option><option>Done</option>
                  </select>
                  <button onClick={() => { if (confirm('Hapus action item ini?')) run(() => deleteActionItemAction(a.id, meeting.id), setErrAct) }} className="bb-press grid h-9 w-9 place-items-center rounded-md text-bbfaint hover:bg-red-50 hover:text-bbred" aria-label="Hapus action item"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <form ref={actForm} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => addActionItemAction(meeting.id, fd), setErrAct, () => actForm.current?.reset()) }} className="mt-3 grid gap-2 border-t border-bbborder pt-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input name="judul" required aria-label="Tindak lanjut" placeholder="Tindak lanjut..." className={inp} />
            <input name="pic" aria-label="PIC tindak lanjut" placeholder="PIC" className={`${inp} sm:w-32`} />
            <input type="date" name="due_date" aria-label="Tanggal jatuh tempo" className={`${inp} sm:w-36`} />
            <button type="submit" disabled={pending} className="bb-press inline-flex items-center justify-center gap-1.5 rounded-lg bg-bbgreen px-3 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60"><Plus size={15} /> Tambah</button>
          </form>
        )}
        {errAct && <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-bbred"><X size={14} /> {errAct}</p>}
      </div>
    </div>
  )
}

const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">{label}</span>{children}</label>
}

'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createMeetingAction, type FormState } from '@/app/(app)/governance/actions'
import { Plus, X } from 'lucide-react'

const JENIS = ['Steering Committee', 'Rapat PMO', 'Rapat Direksi']
const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

export default function GovCreateForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<FormState, FormData>(createMeetingAction, {})
  const judulRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) judulRef.current?.focus() }, [open])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bb-press inline-flex shrink-0 items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark">
        <Plus size={16} /> Rapat baru
      </button>
    )
  }
  return (
    <div className="bb-card mb-6 p-5" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display font-semibold text-bbink">Rapat baru</h2>
        <button onClick={() => setOpen(false)} className="bb-press text-bbmuted hover:text-bbink" aria-label="Tutup"><X size={18} /></button>
      </div>
      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium text-bbmuted">Judul rapat</span><input ref={judulRef} name="judul" required placeholder="mis. Steering Committee HCM Triwulan II 2026" className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Jenis</span><select name="jenis" className={inp}>{JENIS.map((j) => <option key={j} value={j}>{j}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Tanggal</span><input type="date" name="tanggal" className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Lokasi</span><input name="lokasi" placeholder="mis. Ruang Rapat Direksi" className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Peserta</span><input name="peserta" placeholder="mis. Direksi, Kadiv SDM, PMO" className={inp} /></label>
        </div>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Agenda</span><textarea name="agenda" rows={3} placeholder="Poin-poin agenda rapat..." className={inp} /></label>
        {state.error && <p role="alert" className="text-sm text-bbred">{state.error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">{pending ? 'Menyimpan...' : 'Buat rapat'}</button>
          <button type="button" onClick={() => setOpen(false)} className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Batal</button>
        </div>
      </form>
    </div>
  )
}

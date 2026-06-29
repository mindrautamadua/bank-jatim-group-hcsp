'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { takeSnapshotAction, type SnapState } from '@/app/(app)/trends/actions'
import { Camera, X } from 'lucide-react'

const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

export default function SnapshotButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<SnapState, FormData>(takeSnapshotAction, {})
  useEffect(() => { if (state.ok) { setOpen(false); router.refresh() } }, [state.ok, router])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bb-press inline-flex shrink-0 items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] hover:bg-bbgreen-dark">
        <Camera size={16} /> Ambil snapshot
      </button>
    )
  }
  return (
    <form action={action} className="bb-card flex flex-wrap items-end gap-2 p-3">
      <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Periode (opsional, mis. 2026-Q2)</span><input name="periode" placeholder="otomatis dari tanggal" className={`${inp} w-48`} /></label>
      <button type="submit" disabled={pending} className="bb-press inline-flex items-center gap-1.5 rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60"><Camera size={15} /> {pending ? 'Menyimpan...' : 'Simpan snapshot'}</button>
      <button type="button" onClick={() => setOpen(false)} className="bb-press grid h-9 w-9 place-items-center rounded-lg border border-bbborder text-bbmuted" aria-label="Tutup"><X size={16} /></button>
      {state.error && <p className="w-full text-sm text-bbred">{state.error}</p>}
    </form>
  )
}

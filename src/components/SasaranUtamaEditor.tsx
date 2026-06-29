'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setSasaranUtamaAction } from '@/app/(app)/portfolio/[kode]/pic-actions'
import { UNITS } from '@/lib/kegiatan-constants'
import { Crown, Loader2, Pencil, X } from 'lucide-react'

// Admin: tetapkan Penanggung Jawab Utama (satu/lebih divisi/bagian) sebuah sasaran.
export default function SasaranUtamaEditor({
  kode, value,
}: {
  kode: string
  value: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const save = (units: string[]) =>
    start(async () => {
      setErr(null)
      const r = await setSasaranUtamaAction(kode, units)
      if (r?.error) setErr(r.error)
      else router.refresh()
    })

  const toggle = (unit: string) => {
    const next = value.includes(unit) ? value.filter((u) => u !== unit) : [...value, unit]
    save(next)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setErr(null) }}
        className="bb-press mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-bbgreen hover:underline"
      >
        <Pencil size={11} /> Atur Penanggung Jawab Utama
      </button>
    )
  }

  return (
    <div className="mt-1.5 rounded-lg border border-bbborder bg-bbbg/40 p-2.5">
      <div className="mb-1.5 flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 font-semibold text-bbink"><Crown size={12} className="text-bbgold" /> Pilih divisi/bagian Utama</span>
        {pending && <Loader2 size={12} className="animate-spin text-bbmuted" />}
        <button onClick={() => { setOpen(false); setErr(null) }} aria-label="Tutup" className="ml-auto text-bbmuted hover:text-bbink"><X size={13} /></button>
      </div>
      {err && <p role="alert" className="mb-1.5 text-[11px] text-bbred">{err}</p>}
      <div className="flex flex-wrap gap-1.5">
        {UNITS.map((u) => {
          const active = value.includes(u)
          return (
            <button
              key={u}
              type="button"
              disabled={pending}
              aria-pressed={active}
              onClick={() => toggle(u)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
                active
                  ? 'border-bbgreen bg-bbgreen text-white'
                  : 'border-bbborder bg-white text-bbmuted hover:border-bbgreen hover:text-bbgreen-dark'
              }`}
            >
              {u}
            </button>
          )
        })}
      </div>
    </div>
  )
}

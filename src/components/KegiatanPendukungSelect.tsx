'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setKegiatanPendukungAction } from '@/app/(app)/gantt/kegiatan-pic-actions'
import { UNITS } from '@/lib/kegiatan-constants'
import { Building2, Loader2 } from 'lucide-react'

// Admin: tetapkan divisi/bagian Pendukung yang boleh meng-update Key Program ini.
export default function KegiatanPendukungSelect({
  kegiatanId, value,
}: {
  kegiatanId: number
  value: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const onChange = (unit: string) =>
    start(async () => {
      setErr(null)
      const r = await setKegiatanPendukungAction(kegiatanId, unit)
      if (r?.error) setErr(r.error)
      else router.refresh()
    })

  return (
    <div className="border-b border-bbborder/30 bg-bbgold/5 py-2 pl-9 pr-4">
      <label className="flex flex-wrap items-center gap-2 text-[11px] text-bbmuted">
        <span className="inline-flex items-center gap-1 font-semibold text-bbink"><Building2 size={12} /> Divisi/Bagian Pendukung Key Program:</span>
        <select
          value={value ?? ''}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-full rounded-md border border-bbborder bg-white px-2 py-1 text-[11px] text-bbink outline-none focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20 disabled:opacity-60"
        >
          <option value="">— Ikut Pendukung Sasaran —</option>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {pending && <Loader2 size={12} className="animate-spin text-bbmuted" />}
        {err && <span role="alert" className="text-bbred">{err}</span>}
      </label>
    </div>
  )
}

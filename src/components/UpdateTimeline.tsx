import type { UpdateLog } from '@/lib/types'
import { History } from 'lucide-react'

const entitasLabel: Record<string, string> = {
  sasaran: 'Sasaran',
  ik: 'Indikator',
  maturity: 'Maturity',
  kegiatan: 'Kegiatan',
}

function fmtDateTime(s: string) {
  try {
    return new Date(s).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function UpdateTimeline({ updates, showRef = false }: { updates: UpdateLog[]; showRef?: boolean }) {
  if (updates.length === 0) {
    return <p className="text-sm text-bbmuted">Belum ada riwayat update.</p>
  }
  return (
    <ul className="space-y-3">
      {updates.map((u) => (
        <li key={u.id} className="flex gap-3">
          <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bbgreen-light text-bbgreen-dark">
            <History size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-600">
                {entitasLabel[u.entitas] ?? u.entitas}
              </span>
              {showRef && u.ref_kode && (
                <span className="font-mono text-[11px] font-bold text-bbgreen-dark">{u.ref_kode}</span>
              )}
              <span className="text-xs text-bbfaint">{fmtDateTime(u.created_at)}</span>
            </div>
            <p className="mt-0.5 text-sm text-bbink">{u.ringkasan}</p>
            {u.user_nama && <p className="text-xs text-bbmuted">oleh {u.user_nama}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

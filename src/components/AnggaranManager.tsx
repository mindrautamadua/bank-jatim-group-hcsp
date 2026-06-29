'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertAnggaranAction } from '@/app/(app)/budget/actions'
import { ROADMAP_YEARS } from '@/lib/milestone-constants'
import { serapan, fmtRp, serapanTone } from '@/lib/anggaran-helpers'
import type { AnggaranRow } from '@/lib/anggaran'

const toneText: Record<string, string> = { green: 'text-bbgreen-dark', amber: 'text-bbamber', red: 'text-bbred', neutral: 'text-bbmuted' }
const inp = 'w-28 rounded-md border border-bbborder px-2 py-1.5 text-right text-sm tabular-nums text-bbink outline-none focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

export default function AnggaranManager({ kode, rows, canEdit }: { kode: string; rows: AnggaranRow[]; canEdit: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const byTahun = new Map(rows.map((r) => [r.tahun, r]))

  const save = (tahun: number, field: 'rencana' | 'realisasi', raw: string, current: number | null) => {
    const s = raw.trim().replace(/[.,]/g, (m) => (m === ',' ? '.' : ''))
    const v = s === '' ? null : Number(s)
    if (v !== null && !Number.isFinite(v)) return
    if ((v ?? null) === (current ?? null)) return
    start(async () => { await upsertAnggaranAction(kode, tahun, field, v); router.refresh() })
  }

  const totalR = rows.reduce((a, r) => a + (r.rencana ?? 0), 0)
  const totalA = rows.reduce((a, r) => a + (r.realisasi ?? 0), 0)
  const totS = serapan(totalR, totalA)

  return (
    <div className="bb-card overflow-hidden p-0">
      <div className="border-b border-bbborder px-5 py-3">
        <h2 className="font-display font-semibold text-bbink">Anggaran per Tahun <span className="text-sm font-normal text-bbmuted">(Rp Juta)</span></h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-bbborder bg-bbgreen-light/40 text-left text-xs uppercase tracking-wide text-bbmuted">
              <th className="px-5 py-3 font-semibold">Tahun</th>
              <th className="px-5 py-3 text-right font-semibold">Rencana</th>
              <th className="px-5 py-3 text-right font-semibold">Realisasi</th>
              <th className="px-5 py-3 text-right font-semibold">Serapan</th>
            </tr>
          </thead>
          <tbody>
            {ROADMAP_YEARS.map((y) => {
              const r = byTahun.get(y)
              const rencana = r?.rencana ?? null
              const realisasi = r?.realisasi ?? null
              const s = serapan(rencana, realisasi)
              return (
                <tr key={y} className="border-b border-bbborder/60 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-bbink tabular-nums">{y}</td>
                  <td className="px-5 py-2.5 text-right">
                    {canEdit ? <input defaultValue={rencana ?? ''} onBlur={(e) => save(y, 'rencana', e.target.value, rencana)} placeholder="0" inputMode="decimal" className={inp} /> : <span className="tabular-nums">{fmtRp(rencana)}</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {canEdit ? <input defaultValue={realisasi ?? ''} onBlur={(e) => save(y, 'realisasi', e.target.value, realisasi)} placeholder="0" inputMode="decimal" className={inp} /> : <span className="tabular-nums">{fmtRp(realisasi)}</span>}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-semibold tabular-nums ${toneText[serapanTone(s)]}`}>{s === null ? '-' : `${s}%`}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-bbborder bg-bbbg font-semibold">
              <td className="px-5 py-2.5 text-bbink">Total</td>
              <td className="px-5 py-2.5 text-right tabular-nums text-bbink">{fmtRp(totalR)}</td>
              <td className="px-5 py-2.5 text-right tabular-nums text-bbink">{fmtRp(totalA)}</td>
              <td className={`px-5 py-2.5 text-right tabular-nums ${toneText[serapanTone(totS)]}`}>{totS === null ? '-' : `${totS}%`}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {canEdit && <p className="border-t border-bbborder px-5 py-2 text-[11px] text-bbmuted">{pending ? 'Menyimpan...' : 'Nilai dalam Rp Juta. Perubahan tersimpan saat keluar dari kolom.'}</p>}
    </div>
  )
}

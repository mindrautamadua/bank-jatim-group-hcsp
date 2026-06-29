'use client'

import { useActionState, useState } from 'react'
import { updateMaturityAction, type MaturityUpdateState } from '@/app/(app)/maturity/update/actions'
import { Card, Badge } from '@/components/ui'
import { clusterLabel, YEARS } from '@/lib/format'
import type { MaturityDomain } from '@/lib/types'
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react'

const inputCls =
  'w-full rounded-lg border border-bbborder bg-white px-2.5 py-2 text-right text-sm tabular-nums text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

const CLUSTERS = ['Strategic', 'Services', 'HCIS']

// Realisasi maturity harus pada skala 1-4.
function outOfRange(v: string) {
  const s = v.trim().replace(',', '.')
  if (s === '') return false
  const n = Number(s)
  return !Number.isFinite(n) || n < 1 || n > 4
}

export default function MaturityUpdateForm({ domains }: { domains: MaturityDomain[] }) {
  const [state, formAction, pending] = useActionState<MaturityUpdateState, FormData>(updateMaturityAction, {})
  const [bad, setBad] = useState<Record<string, boolean>>({})

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bbred/30 bg-red-50 px-3.5 py-3 text-sm text-bbred">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-bbgreen/30 bg-bbgreen-light px-3.5 py-3 text-sm text-bbgreen-dark">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          <span>Realisasi kematangan berhasil disimpan.</span>
        </div>
      )}

      {CLUSTERS.map((cl) => {
        const rows = domains.filter((d) => d.cluster === cl)
        if (!rows.length) return null
        return (
          <Card key={cl}>
            <h2 className="font-display font-semibold text-bbink mb-3 flex items-center gap-2">
              {clusterLabel[cl] ?? cl}
              <Badge className="bg-bbgreen-light text-bbgreen-dark">{rows.length} domain</Badge>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-bbmuted border-b border-bbborder">
                    <th className="text-left py-2 font-semibold pr-3 sticky left-0 z-10 bg-bbcard border-r border-bbborder">Domain</th>
                    <th className="py-2 font-semibold text-right w-16">2025</th>
                    {YEARS.map((y) => <th key={y} className="py-2 font-semibold text-right w-24">{y}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className="border-b border-bbborder/50 last:border-0 align-top">
                      <td className="py-2.5 pr-3 text-bbink sticky left-0 z-10 bg-bbcard border-r border-bbborder max-w-[44vw] truncate sm:max-w-none" title={d.nama}>{d.nama}</td>
                      <td className="py-2.5 text-right tabular-nums text-bbamber font-medium">
                        {d.baseline2025 !== null ? Number(d.baseline2025).toFixed(2) : '-'}
                      </td>
                      {YEARS.map((y) => {
                        const t = d.targets.find((x) => x.tahun === y)
                        const realDefault = t?.realisasi !== null && t?.realisasi !== undefined ? String(t.realisasi) : ''
                        const key = `${d.id}_${y}`
                        const isBad = bad[key]
                        return (
                          <td key={y} className="py-2.5 px-1">
                            <input
                              id={`real_${d.id}_${y}`}
                              name={`real_${d.id}_${y}`}
                              type="text"
                              inputMode="decimal"
                              defaultValue={realDefault}
                              placeholder="-"
                              aria-label={`Realisasi ${d.nama} tahun ${y} (skala 1-4)`}
                              aria-invalid={isBad || undefined}
                              onChange={(e) => setBad((m) => ({ ...m, [key]: outOfRange(e.target.value) }))}
                              className={`${inputCls} ${isBad ? 'border-bbred focus:border-bbred focus:ring-bbred/20' : ''}`}
                            />
                            <span className="mt-0.5 block text-right text-[11px] text-bbfaint tabular-nums">
                              target {t?.target_itk !== null && t?.target_itk !== undefined ? Number(t.target_itk).toFixed(2) : '-'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bb-press flex items-center justify-center gap-2 rounded-lg bg-bbgreen px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <><Loader2 size={17} className="animate-spin" /> Menyimpan</>
          ) : (
            <><Save size={17} /> Simpan Realisasi</>
          )}
        </button>
        <span className="text-xs text-bbmuted">Skala 1-4 (gunakan koma atau titik). Baseline asesmen 2025 & target tidak dapat diubah dari sini.</span>
      </div>
    </form>
  )
}

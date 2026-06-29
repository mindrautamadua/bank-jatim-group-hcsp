'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addMilestoneAction, setMilestoneStatusAction, setMilestoneProgressAction, deleteMilestoneAction,
} from '@/app/(app)/roadmap/actions'
import { ROADMAP_YEARS, MILESTONE_STATUS, msStatusDot, triwulanLabel, vsJadwal, vsJadwalBadge } from '@/lib/milestone-constants'
import type { Milestone } from '@/lib/milestone'
import { Plus, Trash2, Flag, AlertTriangle, Rocket } from 'lucide-react'

const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

export default function MilestoneManager({ kode, milestones, canEdit, now = new Date() }: { kode: string; milestones: Milestone[]; canEdit: boolean; now?: Date }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const judulRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (adding) judulRef.current?.focus() }, [adding])

  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => { setErr(null); const r = (await fn()) as { error?: string } | void; if (r && 'error' in r && r.error) setErr(r.error); else { router.refresh(); after?.() } })

  return (
    <div className="space-y-4">
      {/* Mini timeline */}
      <div className="bb-card p-5">
        <h2 className="mb-3 font-display font-semibold text-bbink">Timeline milestone</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-5 gap-2 border-b border-bbborder pb-1 text-center text-xs font-semibold text-bbmuted">
              {ROADMAP_YEARS.map((y) => <div key={y}>{y}</div>)}
            </div>
            <div className="grid grid-cols-5 gap-2 pt-2">
              {ROADMAP_YEARS.map((y) => (
                <div key={y} className="min-h-[40px] space-y-1 rounded-lg bg-bbbg p-1.5">
                  {milestones.filter((m) => m.tahun === y).map((m) => (
                    <div key={m.id} className="flex items-center gap-1 rounded bg-white px-1.5 py-1 text-[10.5px] leading-tight" title={m.judul}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.behind ? 'var(--bb-red)' : msStatusDot[m.status] }} />
                      <span className="truncate text-bbink">{triwulanLabel(m.triwulan) && `${triwulanLabel(m.triwulan)} `}{m.judul}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* List + manage */}
      <div className="bb-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-semibold text-bbink"><Flag size={17} className="text-bbgreen" /> Milestone <span className="text-sm font-normal text-bbmuted">({milestones.length})</span></h2>
          {canEdit && !adding && <button onClick={() => setAdding(true)} className="bb-press inline-flex items-center gap-1.5 rounded-lg bg-bbgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-bbgreen-dark"><Plus size={15} /> Tambah</button>}
        </div>

        {canEdit && adding && (
          <form
            onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => addMilestoneAction(kode, {}, fd), () => { setAdding(false); e.currentTarget?.reset?.() }) }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setErr(null) } }}
            className="mb-4 space-y-2 rounded-xl border border-bbborder bg-bbbg/50 p-3"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-bbmuted">Judul milestone / deliverable</span>
              <input ref={judulRef} name="judul" required aria-label="Judul milestone" placeholder="Judul milestone / deliverable" className={`${inp} w-full`} />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-bbmuted">Tahun</span>
                <select name="tahun" defaultValue="2026" aria-label="Tahun" className={`${inp} w-full`}>{ROADMAP_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-bbmuted">Triwulan</span>
                <select name="triwulan" defaultValue="" aria-label="Triwulan" className={`${inp} w-full`}><option value="">Tanpa Q</option>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}</select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-bbmuted">Status</span>
                <select name="status" defaultValue="Planned" aria-label="Status milestone" className={`${inp} w-full`}>{MILESTONE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-bbmuted">Progress (%)</span>
                <input name="progress" type="number" min={0} max={100} defaultValue={0} aria-label="Progress persen" placeholder="%" className={`${inp} w-full`} />
              </label>
            </div>
            {err && <p role="alert" className="text-sm text-bbred">{err}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">Simpan</button>
              <button type="button" onClick={() => { setAdding(false); setErr(null) }} className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Batal</button>
            </div>
          </form>
        )}

        {milestones.length === 0 && !adding && <p className="text-sm text-bbfaint">Belum ada milestone untuk program ini.</p>}

        <div className="space-y-2">
          {milestones.map((m) => {
            const vj = vsJadwal(m, now)
            return (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-bbborder px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.behind ? 'var(--bb-red)' : msStatusDot[m.status] }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-bbink">{m.judul}</span>
                  {(vj.state === 'behind' || vj.state === 'ahead') && (
                    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${vsJadwalBadge[vj.tone]}`}>
                      {vj.state === 'behind' ? <AlertTriangle size={11} /> : <Rocket size={11} />} {vj.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-bbmuted">
                  {m.tahun}{m.triwulan ? ` · ${triwulanLabel(m.triwulan)}` : ''} · progress {m.progress}%
                  {vj.state === 'behind' && vj.expected > m.progress && <span className="text-bbred"> · harusnya {vj.expected}%</span>}
                </div>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <input type="number" min={0} max={100} defaultValue={m.progress} aria-label={`Progress untuk ${m.judul}`} onBlur={(e) => { const v = Number(e.target.value); if (v !== m.progress) run(() => setMilestoneProgressAction(m.id, kode, v)) }} className="w-16 rounded-md border border-bbborder px-2 py-1.5 text-xs tabular-nums text-bbink" title="Progress %" />
                  <select value={m.status} onChange={(e) => run(() => setMilestoneStatusAction(m.id, kode, e.target.value))} aria-label={`Status untuk ${m.judul}`} className="rounded-md border border-bbborder bg-white px-2 py-1.5 text-xs text-bbink">
                    {MILESTONE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => { if (confirm(`Hapus milestone "${m.judul}"?`)) run(() => deleteMilestoneAction(m.id, kode)) }} className="bb-press grid h-9 w-9 place-items-center rounded-md text-bbfaint hover:bg-red-50 hover:text-bbred" aria-label="Hapus milestone"><Trash2 size={14} /></button>
                </div>
              ) : (
                <span className="shrink-0 rounded-md bg-bbgreen-light px-2 py-0.5 text-[11px] font-semibold text-bbgreen-dark">{m.status}</span>
              )}
            </div>
          )})}
        </div>
        {err && !adding && <p role="alert" className="mt-2 text-sm text-bbred">{err}</p>}
      </div>
    </div>
  )
}

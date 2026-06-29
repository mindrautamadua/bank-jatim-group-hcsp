'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { GanttProgram } from '@/lib/gantt'
import { verifyRincianProgressAction } from '@/app/(app)/gantt/rincian-actions'
import { verifyHasilEvidenceAction } from '@/app/(app)/gantt/hasil-actions'
import { StatCard } from '@/components/ui'
import { Clock, CheckCircle2, Undo2, Loader2, X, Paperclip, TrendingUp } from 'lucide-react'

interface PendingItem {
  key: string
  kind: 'progress' | 'evidence'
  kode: string
  programNama: string
  keyProgram: string
  label: string
  teks: string
  detail: string
  by: string
  at: string
  id: number
  canVerify: boolean
}

const fmtTs = (s: string | null) => (s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '')

export default function PendingVerificationCard({ programs }: { programs: GanttProgram[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const items = useMemo<PendingItem[]>(() => {
    const out: PendingItem[] = []
    for (const p of programs) {
      p.kegiatan.forEach((k, ki) => {
        const no = ki + 1
        for (const r of k.rincian) {
          const latest = r.history[0]
          if (latest?.status === 'Diajukan') {
            out.push({
              key: `r-${latest.id}`, kind: 'progress', kode: p.kode, programNama: p.nama,
              keyProgram: `${no}. ${k.program}`, label: `${no}.${String.fromCharCode(97 + r.index)}`,
              teks: r.teks, detail: `Progress diajukan ${latest.progress}%`,
              by: latest.diajukan_nama ?? '—', at: latest.diajukan_at, id: latest.id, canVerify: p.canVerify,
            })
          }
        }
        for (const h of k.hasil) {
          for (const e of h.evidence) {
            if (e.status === 'Diajukan') {
              out.push({
                key: `e-${e.id}`, kind: 'evidence', kode: p.kode, programNama: p.nama,
                keyProgram: `${no}. ${k.program}`, label: `${no}.${String.fromCharCode(97 + h.index)}`,
                teks: h.teks, detail: e.evidence_nama,
                by: e.diupload_nama ?? '—', at: e.diupload_at, id: e.id, canVerify: p.canVerify,
              })
            }
          }
        }
      })
    }
    return out
  }, [programs])

  const verify = (item: PendingItem, keputusan: 'Diverifikasi' | 'Dikembalikan', form: HTMLFormElement) =>
    start(async () => {
      setErr(null)
      const fd = new FormData(form)
      const r = item.kind === 'progress'
        ? await verifyRincianProgressAction(item.kode, item.id, keputusan, {}, fd)
        : await verifyHasilEvidenceAction(item.kode, item.id, keputusan, {}, fd)
      if (r?.error) setErr(r.error)
      else router.refresh()
    })

  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full text-left" aria-haspopup="dialog" title="Klik untuk melihat & memverifikasi">
        <StatCard label="Menunggu Verifikasi" value={items.length} sub="item diajukan · klik untuk verifikasi" accent="var(--bb-amber)" icon={<Clock size={20} />} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Menunggu verifikasi">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-bbborder px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-display font-semibold text-bbink"><Clock size={18} className="text-bbamber" /> Menunggu Verifikasi ({items.length})</h2>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="bb-press text-bbmuted hover:text-bbink"><X size={18} /></button>
            </div>

            {err && <p role="alert" className="border-b border-bbborder bg-red-50 px-5 py-2 text-sm text-bbred">{err}</p>}

            <div className="overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-bbmuted">Tidak ada item yang menunggu verifikasi.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.key} className="rounded-xl border border-bbborder bg-bbbg/40 p-3.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-bbmuted">
                        <span className="font-mono font-bold text-bbgreen-dark">{item.kode}</span>
                        <span className="font-mono font-semibold text-bbink">{item.label}</span>
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${item.kind === 'progress' ? 'bg-bbgreen-light/60 text-bbgreen-dark' : 'bg-bbgold/15 text-bbamber'}`}>
                          {item.kind === 'progress' ? <TrendingUp size={11} /> : <Paperclip size={11} />}
                          {item.kind === 'progress' ? 'Progress' : 'Evidence'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-bbmuted">{item.keyProgram}</p>
                      <p className="mt-0.5 text-sm leading-snug text-bbink">{item.teks}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        {item.kind === 'evidence' ? (
                          <a href={`/api/evidence/hasil/${item.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-bbgreen hover:underline">
                            <Paperclip size={12} /> {item.detail}
                          </a>
                        ) : (
                          <span className="font-semibold text-bbink">{item.detail}</span>
                        )}
                        <span className="text-bbmuted">· {item.by} · {fmtTs(item.at)}</span>
                      </div>

                      {item.canVerify ? (
                        <form className="mt-2.5 space-y-2" onSubmit={(e) => e.preventDefault()}>
                          <input name="catatan" placeholder="Catatan (wajib bila dikembalikan)" aria-label="Catatan verifikasi"
                            className="w-full rounded-lg border border-bbborder bg-white px-3 py-1.5 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20" />
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={pending}
                              onClick={(e) => verify(item, 'Diverifikasi', e.currentTarget.closest('form') as HTMLFormElement)}
                              className="bb-press inline-flex items-center gap-1.5 rounded-lg bg-bbgreen px-3 py-1.5 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">
                              {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Verifikasi
                            </button>
                            <button type="button" disabled={pending}
                              onClick={(e) => verify(item, 'Dikembalikan', e.currentTarget.closest('form') as HTMLFormElement)}
                              className="bb-press inline-flex items-center gap-1.5 rounded-lg border border-bbborder px-3 py-1.5 text-sm font-medium text-bbred hover:bg-red-50 disabled:opacity-60">
                              <Undo2 size={14} /> Kembalikan
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs italic text-bbfaint">Menunggu verifikasi oleh Penanggung Jawab Utama.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

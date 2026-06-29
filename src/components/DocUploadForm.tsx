'use client'

import { useActionState, useRef, useEffect, useState } from 'react'
import { uploadDocumentAction, type DocState } from '@/app/(app)/documents/actions'
import { JENIS_DOKUMEN, MAX_DOC_BYTES, fmtBytes } from '@/lib/doc-constants'
import { Upload, X, FileUp, CheckCircle2 } from 'lucide-react'

const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv'

export default function DocUploadForm({ sasaranOptions, defaultKode }: { sasaranOptions: { kode: string; nama: string }[]; defaultKode?: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<DocState, FormData>(uploadDocumentAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  const namaRef = useRef<HTMLInputElement>(null)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [fileErr, setFileErr] = useState<string | null>(null)

  useEffect(() => { if (open) namaRef.current?.focus() }, [open])
  useEffect(() => { if (state.ok) { formRef.current?.reset(); const t = setTimeout(() => { setOpen(false); setFileInfo(null); setFileErr(null) }, 900); return () => clearTimeout(t) } }, [state.ok])

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) { setFileInfo(null); setFileErr(null); return }
    if (f.size > MAX_DOC_BYTES) {
      setFileErr(`Berkas ${fmtBytes(f.size)} melebihi batas ${fmtBytes(MAX_DOC_BYTES)}. Pilih berkas lain.`)
      setFileInfo(null)
      e.target.value = ''
      return
    }
    setFileErr(null)
    setFileInfo({ name: f.name, size: f.size })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bb-press inline-flex shrink-0 items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark">
        <Upload size={16} /> Unggah dokumen
      </button>
    )
  }
  return (
    <div className="bb-card mb-6 p-5" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-bbink"><FileUp size={17} className="text-bbgreen" /> Unggah dokumen</h2>
        <button onClick={() => setOpen(false)} className="bb-press text-bbmuted hover:text-bbink" aria-label="Tutup"><X size={18} /></button>
      </div>
      <form ref={formRef} action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium text-bbmuted">Nama dokumen</span><input ref={namaRef} name="nama" placeholder="mis. TOR Pengembangan HCIS 2026" className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Jenis</span><select name="jenis" defaultValue="TOR" className={inp}>{JENIS_DOKUMEN.map((j) => <option key={j}>{j}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Kaitkan ke program</span>
            <select name="sasaran_kode" defaultValue={defaultKode ?? ''} className={inp}>
              <option value="">(dokumen umum)</option>
              {sasaranOptions.map((o) => <option key={o.kode} value={o.kode}>{o.kode} - {o.nama.slice(0, 40)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium text-bbmuted">Berkas <span className="text-bbred">*</span> (maks {fmtBytes(MAX_DOC_BYTES)})</span>
            <input type="file" name="file" required accept={ACCEPT} onChange={onPickFile} aria-describedby="file-hint" className="text-sm text-bbink file:mr-3 file:rounded-lg file:border-0 file:bg-bbgreen-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-bbgreen-dark hover:file:bg-bbgreen-light/70" />
            {fileInfo && <span id="file-hint" className="text-[11px] text-bbmuted">{fileInfo.name} · {fmtBytes(fileInfo.size)}</span>}
            {fileErr && <span role="alert" className="text-[11px] text-bbred">{fileErr}</span>}
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium text-bbmuted">Catatan (opsional)</span><input name="catatan" placeholder="Keterangan singkat / nomor dokumen" className={inp} /></label>
        </div>
        {state.error && <p role="alert" className="text-sm text-bbred">{state.error}</p>}
        {state.ok && <p role="status" className="flex items-center gap-1.5 text-sm text-bbgreen-dark"><CheckCircle2 size={15} /> Dokumen tersimpan.</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending || !!fileErr} className="bb-press inline-flex items-center gap-1.5 rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">
            <Upload size={15} /> {pending ? 'Mengunggah...' : 'Unggah'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Batal</button>
        </div>
      </form>
    </div>
  )
}

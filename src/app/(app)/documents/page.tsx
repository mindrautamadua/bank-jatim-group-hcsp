import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getAllSasaran } from '@/lib/queries'
import { listDocuments, getDocStats, JENIS_DOKUMEN, fmtBytes } from '@/lib/documents'
import { SAFE_INLINE_MIME } from '@/lib/doc-constants'
import { PageHeader, StatCard, Card, Badge } from '@/components/ui'
import DocUploadForm from '@/components/DocUploadForm'
import DocDeleteButton from '@/components/DocDeleteButton'
import { FolderArchive, HardDrive, Download, Eye, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const jenisBadge: Record<string, string> = {
  TOR: 'bg-violet-50 text-violet-700',
  'Perdir/SK': 'bg-blue-50 text-blue-700',
  SOP: 'bg-cyan-50 text-cyan-700',
  'Business Case': 'bg-amber-50 text-amber-700',
  MoM: 'bg-bbgreen-light text-bbgreen-dark',
  Laporan: 'bg-sky-50 text-sky-700',
  'Bukti Realisasi': 'bg-emerald-50 text-emerald-700',
  Lainnya: 'bg-gray-100 text-gray-600',
}
const previewable = (m: string | null) => !!m && SAFE_INLINE_MIME.has(m)

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ jenis?: string; kode?: string }> }) {
  const { jenis, kode } = await searchParams
  const [docs, stats, sasaran, user] = await Promise.all([
    listDocuments({ jenis, kode }), getDocStats(), getAllSasaran(), getSession(),
  ])
  const canEdit = user?.role === 'pmo' || user?.role === 'admin'
  const sasaranOptions = sasaran.map((s) => ({ kode: s.kode, nama: s.nama }))

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Document Repository"
        subtitle="Pusat dokumen eksekusi HCM: TOR, Perdir/SK, SOP, business case, MoM, laporan, dan bukti realisasi. Tersimpan terkontrol di database dan dapat ditautkan ke program."
        right={canEdit ? <DocUploadForm sasaranOptions={sasaranOptions} defaultKode={kode} /> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Dokumen" value={stats.total} sub={`${stats.byJenis.length} jenis`} accent="var(--bb-green)" icon={<FolderArchive size={20} />} />
        <StatCard label="Total Ukuran" value={fmtBytes(stats.totalBytes)} sub="tersimpan di database" accent="#7A4FA0" icon={<HardDrive size={20} />} />
        <StatCard label="Bukti Realisasi" value={stats.byJenis.find((j) => j.jenis === 'Bukti Realisasi')?.n ?? 0} sub="evidence terlampir" accent="var(--bb-amber)" icon={<FileText size={20} />} />
        <StatCard label="MoM & Laporan" value={(stats.byJenis.find((j) => j.jenis === 'MoM')?.n ?? 0) + (stats.byJenis.find((j) => j.jenis === 'Laporan')?.n ?? 0)} sub="notulen & laporan" accent="var(--bb-green)" icon={<FileText size={20} />} />
      </div>

      {/* Filter */}
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-bbmuted">Jenis</span>
          <select name="jenis" defaultValue={jenis ?? ''} className="rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink">
            <option value="">Semua jenis</option>
            {JENIS_DOKUMEN.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-bbmuted">Program</span>
          <select name="kode" defaultValue={kode ?? ''} className="rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink">
            <option value="">Semua program</option>
            {sasaranOptions.map((o) => <option key={o.kode} value={o.kode}>{o.kode}</option>)}
          </select>
        </label>
        <button type="submit" className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark">Terapkan</button>
        {(jenis || kode) && <Link href="/documents" className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Reset</Link>}
      </form>

      <Card className="overflow-hidden p-0">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <FolderArchive size={28} className="mb-2 text-bbfaint" />
            <p className="text-sm font-medium text-bbink">Belum ada dokumen{(jenis || kode) ? ' untuk filter ini' : ''}</p>
            <p className="mt-1 text-xs text-bbmuted">{canEdit ? 'Klik "Unggah dokumen" untuk menambahkan.' : 'Dokumen akan muncul setelah diunggah PMO.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-bbborder bg-bbgreen-light/40 text-left text-xs uppercase tracking-wide text-bbmuted">
                <th className="px-4 py-3 font-semibold">Dokumen</th>
                <th className="px-4 py-3 font-semibold">Jenis</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Program</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Ukuran</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">Diunggah</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-bbborder/60 last:border-0 hover:bg-bbgreen-light/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-bbink break-words">{d.nama}</div>
                    <div className="text-xs text-bbmuted break-words">{d.filename}{d.catatan ? ` · ${d.catatan}` : ''}</div>
                  </td>
                  <td className="px-4 py-3"><Badge className={jenisBadge[d.jenis] ?? jenisBadge.Lainnya}>{d.jenis}</Badge></td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {d.sasaran_kode ? <Link href={`/portfolio/${encodeURIComponent(d.sasaran_kode)}`} className="font-mono text-xs font-semibold text-bbgreen hover:underline">{d.sasaran_kode}</Link> : <span className="text-xs text-bbfaint">umum</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-bbmuted tabular-nums sm:table-cell">{fmtBytes(d.size_bytes)}</td>
                  <td className="hidden px-4 py-3 text-xs text-bbmuted lg:table-cell">{d.uploaded_at}<div className="text-bbfaint">{d.uploaded_by}</div></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {previewable(d.mime_type) && <a href={`/api/documents/${d.id}?view=1`} target="_blank" rel="noopener noreferrer" className="bb-press text-bbmuted hover:text-bbgreen" title="Lihat"><Eye size={15} /></a>}
                      <a href={`/api/documents/${d.id}`} className="bb-press text-bbgreen hover:text-bbgreen-dark" title="Unduh"><Download size={15} /></a>
                      {canEdit && <DocDeleteButton id={d.id} nama={d.nama} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  )
}

'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { JENIS_DOKUMEN, MAX_DOC_BYTES, fmtBytes, ALLOWED_DOC_MIME, ALLOWED_DOC_EXT } from '@/lib/doc-constants'

export interface DocState { error?: string; ok?: boolean }

async function requireEditor() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' as const }
  if (user.role !== 'pmo' && user.role !== 'admin') return { error: 'Anda tidak memiliki akses untuk mengelola dokumen.' as const }
  return { user }
}

const clean = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s }

export async function uploadDocumentAction(_prev: DocState, fd: FormData): Promise<DocState> {
  const g = await requireEditor(); if ('error' in g) return g

  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Pilih berkas yang akan diunggah.' }
  if (file.size > MAX_DOC_BYTES) return { error: `Ukuran berkas maksimal ${fmtBytes(MAX_DOC_BYTES)}.` }

  // Whitelist tipe berkas di server (file.type dari client bisa dipalsukan).
  // Tolak SVG/HTML/eksekutabel -> cegah stored-XSS lewat pratinjau inline.
  if (!ALLOWED_DOC_EXT.test(file.name)) {
    return { error: 'Tipe berkas tidak diizinkan. Gunakan PDF, gambar (PNG/JPG/GIF/WebP), Office, TXT, atau CSV.' }
  }
  const mimeType = file.type && ALLOWED_DOC_MIME.has(file.type) ? file.type : 'application/octet-stream'

  const nama = clean(fd.get('nama')) ?? file.name
  const jenisRaw = clean(fd.get('jenis')) ?? 'Lainnya'
  const jenis = (JENIS_DOKUMEN as readonly string[]).includes(jenisRaw) ? jenisRaw : 'Lainnya'
  const sasaran = clean(fd.get('sasaran_kode'))
  const catatan = clean(fd.get('catatan'))

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    await query(
      `INSERT INTO dokumen (nama, jenis, sasaran_kode, filename, mime_type, size_bytes, catatan, content, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [nama, jenis, sasaran, file.name, mimeType, file.size, catatan, buf, g.user.nama]
    )
    try {
      await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)',
        ['dokumen', sasaran, `Unggah dokumen: ${nama} (${jenis})`, g.user.id, g.user.nama])
    } catch { /* update_log opsional */ }
  } catch (e) {
    console.error('[dokumen] upload gagal:', e)
    return { error: 'Gagal menyimpan dokumen ke database.' }
  }

  revalidatePath('/documents')
  return { ok: true }
}

export async function deleteDocumentAction(id: number): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM dokumen WHERE id = $1', [id])
  revalidatePath('/documents')
}

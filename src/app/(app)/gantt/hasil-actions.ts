'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getKegiatanById, getPicForKode } from '@/lib/kegiatan'
import {
  insertHasilEvidence, verifyHasilEvidence, deleteHasilEvidence,
  getHasilEvidenceOwner,
} from '@/lib/kegiatan-hasil'
import { peranOf, canSubmitKegiatan, canVerify, EVIDENCE_MAX_BYTES, fmtBytes } from '@/lib/kegiatan-constants'
import { getProgramDetail } from '@/lib/program-detail'
import { putEvidenceObject, deleteEvidenceObject } from '@/lib/storage'

export interface HasilState { error?: string; ok?: boolean }

const ALLOWED_EXT = /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|zip)$/i

// Pendukung mengunggah evidence untuk satu item Hasil Pelaksanaan.
export async function uploadHasilEvidenceAction(
  kode: string,
  kegiatanId: number,
  hasilIndex: number,
  _prev: HasilState,
  fd: FormData
): Promise<HasilState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }

  const keg = await getKegiatanById(kegiatanId)
  if (!keg || keg.sasaran_kode !== kode) return { error: 'Kegiatan tidak ditemukan.' }

  const pic = await getPicForKode(kode)
  const peran = peranOf(user.unit, pic)
  if (!canSubmitKegiatan(user.unit, keg.pendukung_unit, peran, user.role === 'admin', user.is_pimpinan)) {
    return { error: 'Hanya pimpinan divisi/bagian Pendukung Key Program ini yang dapat mengunggah evidence.' }
  }

  const hasilTeks = (await getProgramDetail(kode))?.kegiatan[keg.urutan]?.hasil[hasilIndex]
  if (hasilTeks === undefined) return { error: 'Item hasil pelaksanaan tidak ditemukan.' }

  const catatan = String(fd.get('catatan') ?? '').trim() || null
  const file = fd.get('evidence')
  if (!(file instanceof File) || file.size === 0) return { error: 'Evidence wajib dilampirkan.' }
  if (file.size > EVIDENCE_MAX_BYTES) return { error: `Ukuran evidence maksimal ${fmtBytes(EVIDENCE_MAX_BYTES)}.` }
  if (!ALLOWED_EXT.test(file.name)) return { error: 'Tipe evidence tidak diizinkan (PDF, Office, gambar, atau ZIP).' }

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const safeName = file.name.replace(/[^\w.\-]+/g, '_')
    const key = `hasil/${kode}/${kegiatanId}/${hasilIndex}/${Date.now()}-${safeName}`
    const mime = file.type || 'application/octet-stream'
    await putEvidenceObject(key, buf, mime)
    await insertHasilEvidence({
      kegiatanId, kode, hasilIndex, hasilTeks, catatan,
      evidence: { key, nama: file.name, mime, size: file.size },
      user: { id: user.id, nama: user.nama, unit: user.unit },
    })
  } catch (e) {
    console.error('[hasil] gagal mengunggah evidence:', e)
    return { error: 'Gagal menyimpan / mengunggah evidence. Coba lagi.' }
  }

  revalidatePath('/gantt')
  return { ok: true }
}

// Utama memverifikasi / mengembalikan sebuah evidence hasil pelaksanaan.
export async function verifyHasilEvidenceAction(
  kode: string,
  evidenceId: number,
  keputusan: 'Diverifikasi' | 'Dikembalikan',
  _prev: HasilState,
  fd: FormData
): Promise<HasilState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (keputusan !== 'Diverifikasi' && keputusan !== 'Dikembalikan') return { error: 'Keputusan tidak valid.' }

  const owner = await getHasilEvidenceOwner(evidenceId)
  if (!owner || owner.kode !== kode) return { error: 'Evidence tidak ditemukan.' }

  const pic = await getPicForKode(kode)
  const peran = peranOf(user.unit, pic)
  if (!canVerify(peran, user.role === 'admin', user.is_pimpinan)) {
    return { error: 'Hanya pimpinan Penanggung Jawab Utama program ini yang dapat memverifikasi.' }
  }

  const catatan = String(fd.get('catatan') ?? '').trim() || null
  if (keputusan === 'Dikembalikan' && !catatan) {
    return { error: 'Catatan/alasan wajib diisi saat mengembalikan evidence.' }
  }

  try {
    await verifyHasilEvidence({ id: evidenceId, kode, keputusan, catatan, user: { id: user.id, nama: user.nama } })
  } catch (e) {
    console.error('[hasil] gagal verifikasi:', e)
    return { error: 'Gagal menyimpan hasil verifikasi. Coba lagi.' }
  }

  revalidatePath('/gantt')
  return { ok: true }
}

// Hapus evidence — oleh pengunggah sendiri atau admin.
export async function deleteHasilEvidenceAction(
  kode: string,
  evidenceId: number
): Promise<HasilState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }

  const owner = await getHasilEvidenceOwner(evidenceId)
  if (!owner || owner.kode !== kode) return { error: 'Evidence tidak ditemukan.' }

  const isAdmin = user.role === 'admin'
  if (!isAdmin && owner.diupload_user_id !== user.id) {
    return { error: 'Hanya pengunggah atau admin yang dapat menghapus evidence ini.' }
  }

  try {
    await deleteHasilEvidence(evidenceId)
    try { await deleteEvidenceObject(owner.evidence_key) } catch (e) { console.error('[hasil] gagal hapus objek S3:', e) }
  } catch (e) {
    console.error('[hasil] gagal hapus evidence:', e)
    return { error: 'Gagal menghapus evidence. Coba lagi.' }
  }

  revalidatePath('/gantt')
  return { ok: true }
}

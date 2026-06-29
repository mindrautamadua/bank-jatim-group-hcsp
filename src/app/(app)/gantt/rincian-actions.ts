'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getKegiatanById, getPicForKode } from '@/lib/kegiatan'
import { recomputeSasaranStatus, logUpdate } from '@/lib/queries'
import {
  submitRincianProgress, verifyRincianProgress, getRincianProgressOwner,
  resetRincianProgressItem, recomputeKegiatanProgress,
} from '@/lib/kegiatan-rincian'
import { peranOf, canSubmitKegiatan, canVerify } from '@/lib/kegiatan-constants'
import { getProgramDetail } from '@/lib/program-detail'

export interface RincianState { error?: string; ok?: boolean }

function clampProgress(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

// Daftar rincian (Kegiatan Utama) sebuah Key Program dari blueprint.
async function rincianListFor(kode: string, urutan: number): Promise<string[]> {
  return (await getProgramDetail(kode))?.kegiatan[urutan]?.rincian ?? []
}

// Pendukung mengajukan progress untuk satu Kegiatan Utama (rincian). Tanpa evidence.
export async function submitRincianProgressAction(
  kode: string,
  kegiatanId: number,
  rincianIndex: number,
  _prev: RincianState,
  fd: FormData
): Promise<RincianState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }

  const keg = await getKegiatanById(kegiatanId)
  if (!keg || keg.sasaran_kode !== kode) return { error: 'Kegiatan tidak ditemukan.' }

  const pic = await getPicForKode(kode)
  const peran = peranOf(user.unit, pic)
  if (!canSubmitKegiatan(user.unit, keg.pendukung_unit, peran, user.role === 'admin', user.is_pimpinan)) {
    return { error: 'Hanya pimpinan divisi/bagian Pendukung Key Program ini yang dapat mengajukan progress.' }
  }

  const rincian = await rincianListFor(kode, keg.urutan)
  const rincianTeks = rincian[rincianIndex]
  if (rincianTeks === undefined) return { error: 'Item kegiatan utama tidak ditemukan.' }

  const progress = clampProgress(fd.get('progress'))
  const catatan = String(fd.get('catatan') ?? '').trim() || null

  try {
    await submitRincianProgress({
      kegiatanId, kode, rincianIndex, rincianTeks, progress, catatan,
      user: { id: user.id, nama: user.nama, unit: user.unit },
    }, rincian.length)
    await recomputeSasaranStatus(kode)
  } catch (e) {
    console.error('[rincian] gagal mengajukan progress:', e)
    return { error: 'Gagal menyimpan progress. Coba lagi.' }
  }

  revalidatePath('/gantt')
  revalidatePath(`/portfolio/${encodeURIComponent(kode)}`)
  return { ok: true }
}

// Utama memverifikasi / mengembalikan pengajuan progress sebuah Kegiatan Utama.
export async function verifyRincianProgressAction(
  kode: string,
  progressId: number,
  keputusan: 'Diverifikasi' | 'Dikembalikan',
  _prev: RincianState,
  fd: FormData
): Promise<RincianState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (keputusan !== 'Diverifikasi' && keputusan !== 'Dikembalikan') return { error: 'Keputusan tidak valid.' }

  const owner = await getRincianProgressOwner(progressId)
  if (!owner || owner.kode !== kode) return { error: 'Pengajuan progress tidak ditemukan.' }

  const pic = await getPicForKode(kode)
  const peran = peranOf(user.unit, pic)
  if (!canVerify(peran, user.role === 'admin', user.is_pimpinan)) {
    return { error: 'Hanya pimpinan Penanggung Jawab Utama program ini yang dapat memverifikasi.' }
  }

  const catatan = String(fd.get('catatan') ?? '').trim() || null
  if (keputusan === 'Dikembalikan' && !catatan) {
    return { error: 'Catatan/alasan wajib diisi saat mengembalikan pengajuan.' }
  }

  const keg = await getKegiatanById(owner.kegiatan_id)
  const rincianCount = keg ? (await rincianListFor(kode, keg.urutan)).length : 0

  try {
    await verifyRincianProgress({
      id: progressId, kegiatanId: owner.kegiatan_id, kode, keputusan, catatan,
      user: { id: user.id, nama: user.nama },
    }, rincianCount)
    await recomputeSasaranStatus(kode)
  } catch (e) {
    console.error('[rincian] gagal verifikasi:', e)
    return { error: 'Gagal menyimpan hasil verifikasi. Coba lagi.' }
  }

  revalidatePath('/gantt')
  revalidatePath(`/portfolio/${encodeURIComponent(kode)}`)
  return { ok: true }
}

// Reset progress sebuah Kegiatan Utama (rincian) — HANYA Admin. Menghapus seluruh
// pengajuan & verifikasinya, lalu progress/status dihitung ulang (kembali 0% /
// Belum Dikerjakan). Dipakai untuk mengoreksi progress yang sudah terverifikasi.
export async function resetRincianProgressAction(
  kode: string,
  kegiatanId: number,
  rincianIndex: number
): Promise<RincianState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (user.role !== 'admin') return { error: 'Hanya Administrator yang dapat mereset progress.' }

  const keg = await getKegiatanById(kegiatanId)
  if (!keg || keg.sasaran_kode !== kode) return { error: 'Kegiatan tidak ditemukan.' }

  const rincian = await rincianListFor(kode, keg.urutan)
  const rincianTeks = rincian[rincianIndex]
  if (rincianTeks === undefined) return { error: 'Item kegiatan utama tidak ditemukan.' }

  try {
    const n = await resetRincianProgressItem(kegiatanId, rincianIndex)
    await recomputeKegiatanProgress(kegiatanId, rincian.length)
    await recomputeSasaranStatus(kode)
    await logUpdate({
      entitas: 'kegiatan', ref_kode: kode,
      ringkasan: `Progress kegiatan utama direset oleh ${user.nama} (${n} pengajuan dihapus) — ${rincianTeks.slice(0, 60)}`,
      user_id: user.id, user_nama: user.nama,
    })
  } catch (e) {
    console.error('[rincian] gagal reset progress:', e)
    return { error: 'Gagal mereset progress. Coba lagi.' }
  }

  revalidatePath('/gantt')
  revalidatePath(`/portfolio/${encodeURIComponent(kode)}`)
  return { ok: true }
}

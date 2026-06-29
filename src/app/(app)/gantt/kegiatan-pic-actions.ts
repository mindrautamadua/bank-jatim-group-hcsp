'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getKegiatanById, setKegiatanPendukung } from '@/lib/kegiatan'
import { UNITS } from '@/lib/kegiatan-constants'

export interface KegiatanPicState { error?: string; ok?: boolean }

// Admin menetapkan divisi/bagian Pendukung untuk sebuah Key Program. Kirim unit
// kosong untuk mengosongkan (kembali mengikuti Pendukung level Sasaran).
export async function setKegiatanPendukungAction(
  kegiatanId: number,
  unit: string
): Promise<KegiatanPicState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (user.role !== 'admin') return { error: 'Hanya Administrator yang dapat menetapkan unit Pendukung Key Program.' }

  const trimmed = unit.trim()
  const value = trimmed === '' ? null : trimmed
  if (value !== null && !(UNITS as readonly string[]).includes(value)) {
    return { error: 'Unit tidak dikenal.' }
  }

  const keg = await getKegiatanById(kegiatanId)
  if (!keg) return { error: 'Key Program tidak ditemukan.' }

  try {
    await setKegiatanPendukung(kegiatanId, value)
  } catch (e) {
    console.error('[kegiatan-pic] gagal menetapkan pendukung:', e)
    return { error: 'Gagal menyimpan unit Pendukung. Coba lagi.' }
  }

  revalidatePath('/gantt')
  revalidatePath(`/portfolio/${encodeURIComponent(keg.sasaran_kode)}`)
  return { ok: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getSasaranByKode, setSasaranUtama } from '@/lib/queries'
import { UNITS } from '@/lib/kegiatan-constants'

export interface SasaranPicState { error?: string; ok?: boolean }

// Admin menetapkan Penanggung Jawab Utama sebuah Sasaran Strategis (satu/lebih unit).
// Array kosong = mengosongkan Utama.
export async function setSasaranUtamaAction(
  kode: string,
  units: string[]
): Promise<SasaranPicState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (user.role !== 'admin') return { error: 'Hanya Administrator yang dapat menetapkan Penanggung Jawab Utama.' }

  const cleaned = Array.from(new Set((units ?? []).map((u) => u.trim()).filter(Boolean)))
  if (cleaned.some((u) => !(UNITS as readonly string[]).includes(u))) {
    return { error: 'Ada unit yang tidak dikenal.' }
  }

  const sasaran = await getSasaranByKode(kode)
  if (!sasaran) return { error: 'Sasaran strategis tidak ditemukan.' }

  try {
    await setSasaranUtama(sasaran.id, cleaned)
  } catch (e) {
    console.error('[sasaran-pic] gagal menetapkan Utama:', e)
    return { error: 'Gagal menyimpan Penanggung Jawab Utama. Coba lagi.' }
  }

  revalidatePath(`/portfolio/${encodeURIComponent(kode)}`)
  revalidatePath('/strategy-map')
  revalidatePath('/gantt')
  return { ok: true }
}

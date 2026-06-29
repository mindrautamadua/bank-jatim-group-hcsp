'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

async function requireEditor() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir.' as const }
  if (user.role !== 'pmo' && user.role !== 'admin') return { error: 'Tidak memiliki akses.' as const }
  return { user }
}
const numOrNull = (n: number | null) => (n === null || !Number.isFinite(n) ? null : n)

export async function upsertAnggaranAction(
  kode: string, tahun: number, field: 'rencana' | 'realisasi', value: number | null
): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  if (tahun < 2026 || tahun > 2030) return
  const v = numOrNull(value)
  // upsert hanya kolom yang diubah
  if (field === 'rencana') {
    await query(
      `INSERT INTO anggaran (sasaran_kode, tahun, rencana) VALUES ($1,$2,$3)
       ON CONFLICT (sasaran_kode, tahun) DO UPDATE SET rencana = EXCLUDED.rencana, updated_at = now()`,
      [kode, tahun, v]
    )
  } else {
    await query(
      `INSERT INTO anggaran (sasaran_kode, tahun, realisasi) VALUES ($1,$2,$3)
       ON CONFLICT (sasaran_kode, tahun) DO UPDATE SET realisasi = EXCLUDED.realisasi, updated_at = now()`,
      [kode, tahun, v]
    )
  }
  try { await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)', ['anggaran', kode, `Anggaran ${kode} ${tahun}: ${field} = ${v ?? '-'}`, g.user.id, g.user.nama]) } catch { }
  revalidatePath(`/budget/${kode}`); revalidatePath('/budget')
}

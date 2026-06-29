'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { JENIS_BENEFIT, ARAH_BENEFIT } from '@/lib/benefit-constants'

export interface BenState { error?: string; ok?: boolean }

async function requireEditor() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' as const }
  if (user.role !== 'pmo' && user.role !== 'admin') return { error: 'Anda tidak memiliki akses untuk mengubah benefit.' as const }
  return { user }
}
const clean = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s }
const numOrNull = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim().replace(',', '.'); if (s === '') return null; const n = Number(s); return Number.isFinite(n) ? n : null }

async function log(ref: string | null, ringkasan: string, uid: number, nama: string) {
  try { await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)', ['benefit', ref, ringkasan, uid, nama]) } catch { }
}

export async function addBenefitAction(kode: string, _prev: BenState, fd: FormData): Promise<BenState> {
  const g = await requireEditor(); if ('error' in g) return g
  const nama = clean(fd.get('nama'))
  if (!nama) return { error: 'Nama benefit wajib diisi.' }
  const jenis = (JENIS_BENEFIT as readonly string[]).includes(String(fd.get('jenis'))) ? String(fd.get('jenis')) : 'Outcome'
  const arah = (ARAH_BENEFIT as readonly string[]).includes(String(fd.get('arah'))) ? String(fd.get('arah')) : 'naik'
  const tahun = numOrNull(fd.get('target_tahun'))
  await query(
    `INSERT INTO benefit (sasaran_kode, nama, jenis, satuan, baseline, target, actual, arah, target_tahun, catatan)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [kode, nama, jenis, clean(fd.get('satuan')), numOrNull(fd.get('baseline')), numOrNull(fd.get('target')),
     numOrNull(fd.get('actual')), arah, tahun ? Math.round(tahun) : null, clean(fd.get('catatan'))]
  )
  await log(kode, `Benefit baru: ${nama}`, g.user.id, g.user.nama)
  revalidatePath(`/benefits/${kode}`); revalidatePath('/benefits')
  return { ok: true }
}

export async function setBenefitActualAction(id: number, kode: string, actual: number | null): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('UPDATE benefit SET actual=$1, updated_at=now() WHERE id=$2', [actual, id])
  revalidatePath(`/benefits/${kode}`); revalidatePath('/benefits')
}

export async function deleteBenefitAction(id: number, kode: string): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM benefit WHERE id=$1', [id])
  revalidatePath(`/benefits/${kode}`); revalidatePath('/benefits')
}

'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { MILESTONE_STATUS } from '@/lib/milestone-constants'

export interface MsState { error?: string; ok?: boolean }

async function requireEditor() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' as const }
  if (user.role !== 'pmo' && user.role !== 'admin') return { error: 'Anda tidak memiliki akses untuk mengubah milestone.' as const }
  return { user }
}
const clean = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s }
const num = (v: FormDataEntryValue | null) => { const n = Number(v); return Number.isFinite(n) ? n : null }

async function log(ref: string | null, ringkasan: string, uid: number, nama: string) {
  try { await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)', ['milestone', ref, ringkasan, uid, nama]) } catch { }
}

export async function addMilestoneAction(kode: string, _prev: MsState, fd: FormData): Promise<MsState> {
  const g = await requireEditor(); if ('error' in g) return g
  const judul = clean(fd.get('judul'))
  if (!judul) return { error: 'Judul milestone wajib diisi.' }
  const tahun = num(fd.get('tahun'))
  if (!tahun || tahun < 2026 || tahun > 2030) return { error: 'Tahun harus 2026-2030.' }
  const triwulan = num(fd.get('triwulan'))
  const status = (MILESTONE_STATUS as readonly string[]).includes(String(fd.get('status'))) ? String(fd.get('status')) : 'Planned'
  let progress = num(fd.get('progress')) ?? 0
  progress = Math.min(100, Math.max(0, Math.round(progress)))
  await query(
    `INSERT INTO milestone (sasaran_kode, judul, deskripsi, tahun, triwulan, status, progress)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [kode, judul, clean(fd.get('deskripsi')), tahun, triwulan && triwulan >= 1 && triwulan <= 4 ? triwulan : null, status, progress]
  )
  await log(kode, `Milestone baru: ${judul} (${tahun})`, g.user.id, g.user.nama)
  revalidatePath(`/roadmap/${kode}`); revalidatePath('/roadmap')
  return { ok: true }
}

export async function setMilestoneStatusAction(id: number, kode: string, status: string): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  if (!(MILESTONE_STATUS as readonly string[]).includes(status)) return
  const done = status === 'Done'
  await query(
    `UPDATE milestone SET status=$1, progress = CASE WHEN $2 THEN 100 ELSE progress END,
       completed_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$3`,
    [status, done, id]
  )
  revalidatePath(`/roadmap/${kode}`); revalidatePath('/roadmap')
}

export async function setMilestoneProgressAction(id: number, kode: string, progress: number): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  const p = Math.min(100, Math.max(0, Math.round(progress)))
  await query(`UPDATE milestone SET progress=$1, status = CASE WHEN $1>=100 THEN 'Done' ELSE status END WHERE id=$2`, [p, id])
  revalidatePath(`/roadmap/${kode}`); revalidatePath('/roadmap')
}

export async function deleteMilestoneAction(id: number, kode: string): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM milestone WHERE id=$1', [id])
  revalidatePath(`/roadmap/${kode}`); revalidatePath('/roadmap')
}

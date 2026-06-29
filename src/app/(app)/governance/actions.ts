'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

async function requireEditor() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' as const }
  if (user.role !== 'pmo' && user.role !== 'admin') return { error: 'Anda tidak memiliki akses untuk mengubah data governance.' as const }
  return { user }
}

async function logUpdate(entitas: string, ref: string | null, ringkasan: string, userId: number, userNama: string) {
  try {
    await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)',
      [entitas, ref, ringkasan, userId, userNama])
  } catch { /* tabel update_log opsional */ }
}

const clean = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s }

export interface FormState { error?: string; ok?: boolean }

// ---- Meeting ----
export async function createMeetingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await requireEditor(); if ('error' in g) return g
  const judul = clean(fd.get('judul'))
  if (!judul) return { error: 'Judul rapat wajib diisi.' }
  const jenis = clean(fd.get('jenis')) ?? 'Steering Committee'
  const tanggal = clean(fd.get('tanggal'))
  const rows = await query<{ id: number }>(
    `INSERT INTO gov_meeting (judul, jenis, tanggal, lokasi, peserta, agenda, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'Scheduled',$7) RETURNING id`,
    [judul, jenis, tanggal, clean(fd.get('lokasi')), clean(fd.get('peserta')), clean(fd.get('agenda')), g.user.nama]
  )
  await logUpdate('governance', null, `Membuat rapat: ${judul}`, g.user.id, g.user.nama)
  revalidatePath('/governance')
  redirect(`/governance/${rows[0].id}`)
}

export async function updateMeetingAction(id: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const g = await requireEditor(); if ('error' in g) return g
  const judul = clean(fd.get('judul'))
  if (!judul) return { error: 'Judul rapat wajib diisi.' }
  const status = clean(fd.get('status')) ?? 'Scheduled'
  await query(
    `UPDATE gov_meeting SET judul=$1, jenis=$2, tanggal=$3, lokasi=$4, peserta=$5, agenda=$6, mom=$7, status=$8 WHERE id=$9`,
    [judul, clean(fd.get('jenis')) ?? 'Steering Committee', clean(fd.get('tanggal')), clean(fd.get('lokasi')),
     clean(fd.get('peserta')), clean(fd.get('agenda')), clean(fd.get('mom')), status, id]
  )
  await logUpdate('governance', String(id), `Memperbarui rapat: ${judul}`, g.user.id, g.user.nama)
  revalidatePath(`/governance/${id}`); revalidatePath('/governance')
  return { ok: true }
}

export async function deleteMeetingAction(id: number): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM gov_meeting WHERE id=$1', [id])
  await logUpdate('governance', String(id), `Menghapus rapat #${id}`, g.user.id, g.user.nama)
  revalidatePath('/governance')
  redirect('/governance')
}

// ---- Decision ----
export async function addDecisionAction(meetingId: number, fd: FormData): Promise<FormState> {
  const g = await requireEditor(); if ('error' in g) return g
  const ringkasan = clean(fd.get('ringkasan'))
  if (!ringkasan) return { error: 'Isi keputusan wajib diisi.' }
  await query('INSERT INTO gov_decision (meeting_id, ringkasan, sasaran_kode) VALUES ($1,$2,$3)',
    [meetingId, ringkasan, clean(fd.get('sasaran_kode'))])
  await logUpdate('governance', String(meetingId), `Keputusan: ${ringkasan.slice(0, 80)}`, g.user.id, g.user.nama)
  revalidatePath(`/governance/${meetingId}`)
  return { ok: true }
}

export async function deleteDecisionAction(id: number, meetingId: number): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM gov_decision WHERE id=$1', [id])
  revalidatePath(`/governance/${meetingId}`)
}

// ---- Action items ----
export async function addActionItemAction(meetingId: number, fd: FormData): Promise<FormState> {
  const g = await requireEditor(); if ('error' in g) return g
  const judul = clean(fd.get('judul'))
  if (!judul) return { error: 'Judul tindak lanjut wajib diisi.' }
  await query('INSERT INTO gov_action (meeting_id, judul, pic, sasaran_kode, due_date) VALUES ($1,$2,$3,$4,$5)',
    [meetingId, judul, clean(fd.get('pic')), clean(fd.get('sasaran_kode')), clean(fd.get('due_date'))])
  await logUpdate('governance', String(meetingId), `Tindak lanjut: ${judul.slice(0, 80)}`, g.user.id, g.user.nama)
  revalidatePath(`/governance/${meetingId}`); revalidatePath('/governance')
  return { ok: true }
}

export async function setActionStatusAction(id: number, meetingId: number, status: string): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  const done = status === 'Done'
  await query('UPDATE gov_action SET status=$1, completed_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$3',
    [status, done, id])
  revalidatePath(`/governance/${meetingId}`); revalidatePath('/governance')
}

export async function deleteActionItemAction(id: number, meetingId: number): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM gov_action WHERE id=$1', [id])
  revalidatePath(`/governance/${meetingId}`); revalidatePath('/governance')
}

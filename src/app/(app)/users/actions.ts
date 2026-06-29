'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { query, publicQuery, publicTransaction } from '@/lib/db'
import { ROLES } from '@/lib/users-constants'
import { UNITS } from '@/lib/kegiatan-constants'
import { countActiveAdmins } from '@/lib/users'

export interface UserState { error?: string; ok?: boolean }

async function requireAdmin() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' as const }
  if (user.role !== 'admin') return { error: 'Hanya Administrator yang dapat mengelola pengguna.' as const }
  return { user }
}
const clean = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s === '' ? null : s }
const validRole = (r: string): boolean => (ROLES as readonly string[]).includes(r)
// Unit boleh kosong (null) atau salah satu unit yang dikenal.
const cleanUnit = (v: FormDataEntryValue | null): string | null => {
  const s = clean(v); if (!s) return null
  return (UNITS as readonly string[]).includes(s) ? s : null
}

async function log(ringkasan: string, uid: number, nama: string) {
  try { await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)', ['user', null, ringkasan, uid, nama]) } catch { }
}

export async function createUserAction(_prev: UserState, fd: FormData): Promise<UserState> {
  const g = await requireAdmin(); if ('error' in g) return g
  const email = clean(fd.get('email'))?.toLowerCase()
  const nama = clean(fd.get('nama'))
  const password = String(fd.get('password') ?? '')
  const role = String(fd.get('role') ?? 'viewer')
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Email tidak valid.' }
  if (!nama) return { error: 'Nama wajib diisi.' }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }
  if (!validRole(role)) return { error: 'Peran tidak valid.' }
  const unit = cleanUnit(fd.get('unit'))
  const isPimpinan = fd.get('is_pimpinan') != null && !!unit // pimpinan hanya bermakna bila punya unit
  try {
    const hash = await bcrypt.hash(password, 10)
    await publicTransaction(async (q) => {
      // Satu pimpinan per unit: lepas penanda dari user lain di unit yang sama.
      if (isPimpinan && unit) await q('UPDATE app_user SET is_pimpinan=false WHERE unit=$1 AND is_pimpinan', [unit])
      await q('INSERT INTO app_user (email, nama, jabatan, unit, role, password_hash, is_pimpinan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [email, nama, clean(fd.get('jabatan')), unit, role, hash, isPimpinan])
    })
    await log(`Membuat pengguna: ${email} (${role})`, g.user.id, g.user.nama)
  } catch (e) {
    const msg = String((e as Error).message || '')
    if (msg.includes('duplicate') || msg.includes('unique')) return { error: 'Email sudah terdaftar.' }
    console.error('[user] create gagal:', e)
    return { error: 'Gagal membuat pengguna.' }
  }
  revalidatePath('/users')
  return { ok: true }
}

export async function updateUserAction(id: number, _prev: UserState, fd: FormData): Promise<UserState> {
  const g = await requireAdmin(); if ('error' in g) return g
  const nama = clean(fd.get('nama'))
  const role = String(fd.get('role') ?? '')
  if (!nama) return { error: 'Nama wajib diisi.' }
  if (!validRole(role)) return { error: 'Peran tidak valid.' }
  // Jangan biarkan admin terakhir menurunkan perannya sendiri.
  if (id === g.user.id && role !== 'admin' && (await countActiveAdmins()) <= 1) {
    return { error: 'Tidak dapat menurunkan peran: Anda administrator aktif terakhir.' }
  }
  const unit = cleanUnit(fd.get('unit'))
  const isPimpinan = fd.get('is_pimpinan') != null && !!unit // pimpinan hanya bermakna bila punya unit
  await publicTransaction(async (q) => {
    // Satu pimpinan per unit: lepas penanda dari user lain di unit yang sama.
    if (isPimpinan && unit) await q('UPDATE app_user SET is_pimpinan=false WHERE unit=$1 AND is_pimpinan AND id<>$2', [unit, id])
    await q('UPDATE app_user SET nama=$1, jabatan=$2, unit=$3, role=$4, is_pimpinan=$5 WHERE id=$6',
      [nama, clean(fd.get('jabatan')), unit, role, isPimpinan, id])
  })
  await log(`Memperbarui pengguna #${id} (${role})`, g.user.id, g.user.nama)
  revalidatePath('/users')
  return { ok: true }
}

export async function resetPasswordAction(id: number, _prev: UserState, fd: FormData): Promise<UserState> {
  const g = await requireAdmin(); if ('error' in g) return g
  const password = String(fd.get('password') ?? '')
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }
  const hash = await bcrypt.hash(password, 10)
  await publicQuery('UPDATE app_user SET password_hash=$1 WHERE id=$2', [hash, id])
  await log(`Reset kata sandi pengguna #${id}`, g.user.id, g.user.nama)
  revalidatePath('/users')
  return { ok: true }
}

export async function toggleActiveAction(id: number): Promise<void> {
  const g = await requireAdmin(); if ('error' in g) return
  if (id === g.user.id) return // tidak boleh menonaktifkan diri sendiri
  await publicQuery('UPDATE app_user SET is_active = NOT is_active WHERE id=$1', [id])
  await log(`Mengubah status aktif pengguna #${id}`, g.user.id, g.user.nama)
  revalidatePath('/users')
}

export async function deleteUserAction(id: number): Promise<void> {
  const g = await requireAdmin(); if ('error' in g) return
  if (id === g.user.id) return // tidak boleh menghapus diri sendiri
  await publicQuery('DELETE FROM app_user WHERE id=$1', [id])
  await log(`Menghapus pengguna #${id}`, g.user.id, g.user.nama)
  revalidatePath('/users')
}

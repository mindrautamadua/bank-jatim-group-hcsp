'use server'

import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { query, publicQuery } from '@/lib/db'

export interface ChangePasswordState { error?: string; ok?: boolean }

// Ganti kata sandi milik pengguna yang sedang login (verifikasi sandi lama dulu).
export async function changePasswordAction(_prev: ChangePasswordState, fd: FormData): Promise<ChangePasswordState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }

  const current = String(fd.get('current_password') ?? '')
  const next = String(fd.get('new_password') ?? '')
  const confirm = String(fd.get('confirm_password') ?? '')

  if (!current || !next || !confirm) return { error: 'Semua kolom wajib diisi.' }
  if (next.length < 8) return { error: 'Kata sandi baru minimal 8 karakter.' }
  if (next !== confirm) return { error: 'Konfirmasi kata sandi tidak cocok.' }
  if (next === current) return { error: 'Kata sandi baru harus berbeda dari yang lama.' }

  let row: { password_hash: string } | undefined
  try {
    const rows = await publicQuery<{ password_hash: string }>(
      'SELECT password_hash FROM app_user WHERE id = $1 LIMIT 1',
      [user.id]
    )
    row = rows[0]
  } catch (e) {
    console.error('[account] ambil hash gagal:', e)
    return { error: 'Tidak dapat terhubung ke server. Silakan coba lagi.' }
  }
  if (!row) return { error: 'Pengguna tidak ditemukan.' }

  const ok = await bcrypt.compare(current, row.password_hash)
  if (!ok) return { error: 'Kata sandi saat ini salah.' }

  try {
    const hash = await bcrypt.hash(next, 10)
    await publicQuery('UPDATE app_user SET password_hash = $1 WHERE id = $2', [hash, user.id])
  } catch (e) {
    console.error('[account] ubah kata sandi gagal:', e)
    return { error: 'Gagal menyimpan kata sandi baru.' }
  }

  try {
    await query(
      'INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)',
      ['user', null, 'Mengganti kata sandi sendiri', user.id, user.nama]
    )
  } catch { /* log opsional */ }

  return { ok: true }
}

'use server'

import { redirect } from 'next/navigation'
import { createSession, destroySession, verifyCredentials } from '@/lib/auth'
import { loginLockMinutes, recordLoginFail, clearLoginFails } from '@/lib/ratelimit'

export interface LoginState {
  error?: string
}

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === 'string' ? next : ''
  // hanya izinkan path internal
  return n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard'
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' }
  }

  // Rate-limit: kunci sementara setelah beberapa kali gagal (anti brute-force).
  const lockMin = loginLockMinutes(email)
  if (lockMin > 0) {
    return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${lockMin} menit.` }
  }

  let user
  try {
    user = await verifyCredentials(email, password)
  } catch (e) {
    console.error('[login] verifyCredentials gagal:', e)
    return { error: 'Tidak dapat terhubung ke server. Silakan coba lagi.' }
  }
  if (!user) {
    recordLoginFail(email)
    return { error: 'Email atau kata sandi salah.' }
  }
  clearLoginFails(email)

  try {
    await createSession(user)
  } catch (e) {
    console.error('[login] createSession gagal:', e)
    return { error: 'Gagal membuat sesi. Pastikan AUTH_SECRET terpasang lalu coba lagi.' }
  }

  // redirect() melempar NEXT_REDIRECT dan HARUS di luar try/catch di atas.
  redirect(next)
}

export async function logoutAction() {
  await destroySession()
  redirect('/login')
}

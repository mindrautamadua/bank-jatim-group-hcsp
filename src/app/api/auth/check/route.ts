import { getSession } from '@/lib/auth'

// Dipanggil oleh proxy (edge) untuk memvalidasi sesi ke DB (is_active + peran terbaru)
// sebelum halaman dirender. getSession() melakukan verifikasi JWT + cek DB.
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSession()
  return new Response(null, { status: user ? 204 : 401 })
}

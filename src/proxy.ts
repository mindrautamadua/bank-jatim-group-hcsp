import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const SESSION_COOKIE = 'hcsp_session'
const CHECK_COOKIE = 'hcsp_chk'
// Jendela cache validasi-DB. Dalam rentang ini, navigasi terproteksi TIDAK menyentuh DB.
// Konsekuensi: pencabutan sesi (deaktivasi) berlaku maksimum setelah CHECK_TTL detik.
const CHECK_TTL = 60

// Halaman aplikasi yang wajib login.
const PROTECTED = ['/dashboard', '/strategy-map', '/portfolio', '/maturity', '/graph', '/assistant', '/glossary', '/governance', '/documents', '/roadmap', '/benefits', '/report', '/users', '/notifications', '/trends', '/budget', '/panduan']

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET)
}

function redirectLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  const res = NextResponse.redirect(url)
  res.cookies.delete(CHECK_COOKIE)
  return res
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!needsAuth) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return redirectLogin(req, pathname)

  // Verifikasi JWT sesi (edge, tanpa DB).
  let uid: number | undefined
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    uid = (payload as { user?: { id?: number } }).user?.id
  } catch {
    return redirectLogin(req, pathname)
  }
  if (!uid) return redirectLogin(req, pathname)

  // Jalur cepat: cookie cek masih berlaku & cocok user -> lewati DB sepenuhnya.
  const chk = req.cookies.get(CHECK_COOKIE)?.value
  if (chk) {
    try {
      const { payload } = await jwtVerify(chk, secretKey(), { algorithms: ['HS256'] })
      if ((payload as { uid?: number }).uid === uid) return NextResponse.next()
    } catch {
      // cookie cek kedaluwarsa -> validasi ulang ke DB di bawah.
    }
  }

  // Validasi status aktif/peran ke DB lewat route Node (edge tak bisa pg). Maks 1x per CHECK_TTL.
  // Redirect di sini terjadi SEBELUM halaman dirender -> tak ada kebocoran body RSC.
  try {
    const check = await fetch(new URL('/api/auth/check', req.nextUrl.origin), {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      cache: 'no-store',
    })
    if (check.status === 401) return redirectLogin(req, pathname) // sesi dicabut

    // Aktif -> terbitkan cookie cek ber-TTL pendek agar navigasi berikutnya tak menyentuh DB.
    const chkToken = await new SignJWT({ uid })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${CHECK_TTL}s`)
      .sign(secretKey())
    const res = NextResponse.next()
    res.cookies.set(CHECK_COOKIE, chkToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CHECK_TTL,
    })
    return res
  } catch {
    return NextResponse.next() // cek gagal (mis. DB down) -> fail-open, hindari lockout massal
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/strategy-map/:path*', '/portfolio/:path*', '/maturity/:path*', '/graph/:path*', '/assistant/:path*', '/glossary/:path*', '/governance/:path*', '/documents/:path*', '/roadmap/:path*', '/benefits/:path*', '/report/:path*', '/users/:path*', '/notifications/:path*', '/trends/:path*', '/budget/:path*', '/panduan/:path*'],
}

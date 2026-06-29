import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { publicQuery } from './db'
import { SESSION_COOKIE } from './auth-constants'
import { DEFAULT_SCHEMA, isValidSchema, tenantBySchema } from './tenant'

export { SESSION_COOKIE }
const MAX_AGE = 60 * 60 * 2 // 2 jam (perkecil jendela bila sesi perlu dicabut)

// Hash bcrypt valid untuk menyamakan waktu respons saat email tidak ditemukan
// (cegah enumerasi user via timing). Bukan kredensial nyata.
const DUMMY_HASH = '$2b$10$Ru0LfwCxBYF7sJ4Q6XbOoOwtXZY/0POyR7U/LTqFmrpLZADzEWL.2'

// Identitas pengguna (disimpan di klaim JWT `user`). `homeSchema === null`
// berarti pengguna level-grup (Bank Jatim holding) yang boleh berpindah bank.
export interface AuthIdentity {
  id: number
  email: string
  nama: string
  role: string
  jabatan: string | null
  unit: string | null
  is_pimpinan: boolean
  homeTenantId: number | null
  homeSchema: string | null
}

// SessionUser = identitas + konteks tenant aktif (untuk layout, sidebar, dll).
export interface SessionUser extends AuthIdentity {
  isGroup: boolean       // boleh berpindah tenant (homeSchema === null)
  activeSchema: string   // schema tenant yang sedang aktif
  activeKode: string
  activeNama: string
}

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET belum diset di environment')
  return new TextEncoder().encode(secret)
}

async function signSession(user: AuthIdentity, activeSchema: string) {
  const token = await new SignJWT({ user, tenant: activeSchema })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey())
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

// Buat sesi baru. Tenant aktif = bank rumah (pengguna biasa) atau default grup.
export async function createSession(user: AuthIdentity) {
  const active = user.homeSchema && isValidSchema(user.homeSchema) ? user.homeSchema : DEFAULT_SCHEMA
  await signSession(user, active)
}

// Pindah bank aktif (hanya untuk pengguna level-grup). Tanda-tangani ulang JWT.
export async function setActiveTenant(schema: string): Promise<boolean> {
  const session = await getSession()
  if (!session || !session.isGroup) return false // pengguna biasa terkunci di banknya
  if (!isValidSchema(schema)) return false
  const identity: AuthIdentity = {
    id: session.id, email: session.email, nama: session.nama, role: session.role,
    jabatan: session.jabatan, unit: session.unit, is_pimpinan: session.is_pimpinan,
    homeTenantId: session.homeTenantId, homeSchema: session.homeSchema,
  }
  await signSession(identity, schema)
  return true
}

interface DbUserRow {
  role: string; is_active: boolean; nama: string; jabatan: string | null
  email: string; unit: string | null; is_pimpinan: boolean
  tenant_id: number | null; home_schema: string | null
}

function toSessionUser(id: number, db: DbUserRow, claimActive: string | undefined): SessionUser {
  const isGroup = db.tenant_id == null
  // Pengguna biasa dikunci ke bank rumahnya; pengguna grup memakai pilihan klaim.
  const active = isGroup
    ? (isValidSchema(claimActive) ? claimActive : DEFAULT_SCHEMA)
    : (db.home_schema && isValidSchema(db.home_schema) ? db.home_schema : DEFAULT_SCHEMA)
  const t = tenantBySchema(active)
  return {
    id, email: db.email, nama: db.nama, role: db.role, jabatan: db.jabatan,
    unit: db.unit, is_pimpinan: db.is_pimpinan,
    homeTenantId: db.tenant_id, homeSchema: db.home_schema,
    isGroup, activeSchema: active, activeKode: t?.kode ?? '', activeNama: t?.nama ?? '',
  }
}

// Validasi sesi: verifikasi JWT LALU cek ulang ke DB agar deaktivasi & perubahan
// peran berlaku segera. cache() = dedup per-request.
export const getSession = cache(async (): Promise<SessionUser | null> => {
  let claimUser: AuthIdentity
  let claimTenant: string | undefined
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    claimUser = (payload as { user: AuthIdentity }).user
    claimTenant = (payload as { tenant?: string }).tenant
    if (!claimUser?.id) return null
  } catch {
    return null // token tidak valid/kedaluwarsa/AUTH_SECRET belum diset
  }

  try {
    const rows = await publicQuery<DbUserRow>(
      `SELECT u.role, u.is_active, u.nama, u.jabatan, u.email, u.unit, u.is_pimpinan,
              u.tenant_id, t.schema_name AS home_schema
         FROM app_user u LEFT JOIN tenant t ON t.id = u.tenant_id
        WHERE u.id = $1 LIMIT 1`,
      [claimUser.id]
    )
    const db = rows[0]
    if (!db || !db.is_active) return null // dinonaktifkan / dihapus -> cabut akses segera
    return toSessionUser(claimUser.id, db, claimTenant)
  } catch (e) {
    // Saat DB error transien, jangan kunci semua pengguna; pakai klaim token.
    console.error('[auth] validasi sesi ke DB gagal, memakai klaim token:', e)
    const t = tenantBySchema(claimTenant ?? claimUser.homeSchema ?? DEFAULT_SCHEMA)
    const active = t?.schema ?? DEFAULT_SCHEMA
    return {
      ...claimUser,
      isGroup: claimUser.homeSchema == null,
      activeSchema: active, activeKode: t?.kode ?? '', activeNama: t?.nama ?? '',
    }
  }
})

export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

interface CredRow extends DbUserRow {
  id: number
  password_hash: string
}

export async function verifyCredentials(email: string, password: string): Promise<AuthIdentity | null> {
  const rows = await publicQuery<CredRow>(
    `SELECT u.id, u.email, u.nama, u.role, u.jabatan, u.unit, u.is_pimpinan,
            u.password_hash, u.is_active, u.tenant_id, t.schema_name AS home_schema
       FROM app_user u LEFT JOIN tenant t ON t.id = u.tenant_id
      WHERE lower(u.email) = lower($1) LIMIT 1`,
    [email.trim()]
  )
  const user = rows[0]
  if (!user || !user.is_active) {
    await bcrypt.compare(password, DUMMY_HASH) // samakan timing -> cegah enumerasi
    return null
  }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  await publicQuery('UPDATE app_user SET last_login_at = now() WHERE id = $1', [user.id])
  return {
    id: user.id, email: user.email, nama: user.nama, role: user.role, jabatan: user.jabatan,
    unit: user.unit, is_pimpinan: user.is_pimpinan,
    homeTenantId: user.tenant_id, homeSchema: user.home_schema,
  }
}

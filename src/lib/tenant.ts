import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { SESSION_COOKIE } from './auth-constants'

// ============================================================
// Tenant registry for the Bank Jatim group (multi-tenant).
// Keep in sync with scripts/tenants.mjs (the seed/provision registry).
//
// Routing model: the active tenant schema is carried INSIDE the signed
// session JWT (claim `tenant`). It is therefore tamper-proof — a user can
// only be in a schema the server signed for them. resolveActiveSchema()
// decodes that claim independently of auth.ts to avoid an import cycle
// (db.ts -> tenant.ts; auth.ts -> db.ts).
// ============================================================

// Brand palette per tenant. Maps to the CSS variables --bb-green{,-dark,-deep,-light}
// (names kept for utility-class compatibility; values are each bank's brand hue).
// `primary` = warna utama, `dark`/`deep` = gradasi gelap (sidebar/login),
// `light` = tint lembut untuk chip & latar. Disuntik di RootLayout via inline style.
export interface TenantBrand {
  primary: string
  dark: string
  deep: string
  light: string
}

export interface Tenant {
  kode: string
  nama: string
  schema: string
  isGroup: boolean
  urutan: number
  brand: TenantBrand
  logo: string // path di /public — logo resmi bank (warna), ditaruh di atas kartu putih
}

// Palet & logo diambil dari logo/situs resmi tiap bank:
//   Jatim merah · Lampung biru-navy · NTB Syariah hijau · NTT indigo · Sultra navy · Banten merah
export const TENANTS: Tenant[] = [
  { kode: 'jatim',       nama: 'Bank Jatim',       schema: 't_bank_jatim',       isGroup: true,  urutan: 1, brand: { primary: '#e1121c', dark: '#b00e16', deep: '#6b0a10', light: '#fcebec' }, logo: '/logos/jatim.png' },
  { kode: 'lampung',     nama: 'Bank Lampung',     schema: 't_bank_lampung',     isGroup: false, urutan: 2, brand: { primary: '#28317d', dark: '#1f2660', deep: '#141a45', light: '#ecedf5' }, logo: '/logos/lampung.png' },
  { kode: 'ntb_syariah', nama: 'Bank NTB Syariah', schema: 't_bank_ntb_syariah', isGroup: false, urutan: 3, brand: { primary: '#006b43', dark: '#00502f', deep: '#033a22', light: '#e6f2ec' }, logo: '/logos/ntbsyariah.png' },
  { kode: 'ntt',         nama: 'Bank NTT',         schema: 't_bank_ntt',         isGroup: false, urutan: 4, brand: { primary: '#211c74', dark: '#181450', deep: '#100d33', light: '#eae9f4' }, logo: '/logos/ntt.png' },
  { kode: 'sultra',      nama: 'Bank Sultra',      schema: 't_bank_sultra',      isGroup: false, urutan: 5, brand: { primary: '#15306e', dark: '#0e2150', deep: '#081634', light: '#e9ecf6' }, logo: '/logos/sultra.png' },
  { kode: 'banten',      nama: 'Bank Banten',      schema: 't_bank_banten',      isGroup: false, urutan: 6, brand: { primary: '#e41824', dark: '#b5121c', deep: '#6e0a10', light: '#fdeaeb' }, logo: '/logos/banten.png' },
]

// Display name for the holding/group (used in shared metadata & login).
export const GROUP_NAME = 'Bank Jatim Group'

// Default schema when no valid session tenant is present (content read paths
// always run with an authenticated session, so this is just a safe fallback).
export const DEFAULT_SCHEMA = TENANTS[0].schema

const BY_SCHEMA = new Map(TENANTS.map((t) => [t.schema, t]))
const BY_KODE = new Map(TENANTS.map((t) => [t.kode, t]))

export function tenantBySchema(schema: string | undefined | null): Tenant | undefined {
  return schema ? BY_SCHEMA.get(schema) : undefined
}
export function tenantByKode(kode: string | undefined | null): Tenant | undefined {
  return kode ? BY_KODE.get(kode) : undefined
}
export function isValidSchema(schema: string | undefined | null): schema is string {
  return !!schema && BY_SCHEMA.has(schema)
}

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET belum diset di environment')
  return new TextEncoder().encode(secret)
}

// Active tenant schema for the current request, read from the signed JWT.
// cache() => decoded once per request. Falls back to DEFAULT_SCHEMA when
// there is no valid session (e.g. public pages — which use publicQuery anyway).
export const resolveActiveSchema = cache(async (): Promise<string> => {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    if (!token) return DEFAULT_SCHEMA
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    const schema = (payload as { tenant?: string }).tenant
    return isValidSchema(schema) ? schema : DEFAULT_SCHEMA
  } catch {
    return DEFAULT_SCHEMA
  }
})

// The active tenant record (for branding etc.).
export const getActiveTenant = cache(async (): Promise<Tenant> => {
  const schema = await resolveActiveSchema()
  return tenantBySchema(schema) ?? TENANTS[0]
})

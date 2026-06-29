import { publicQuery } from './db'

export { ROLES, roleLabel, roleBadge } from './users-constants'
export type { Role } from './users-constants'

export interface AppUser {
  id: number
  email: string
  nama: string
  jabatan: string | null
  unit: string | null
  role: string
  is_active: boolean
  is_pimpinan: boolean
  tenant_id: number | null
  tenant_nama: string | null
  last_login_at: string | null
  created_at: string
}

// scope: number = batasi ke satu bank (admin bank); null = semua bank (admin grup).
function scopeClause(scope: number | null, startIdx = 1): { where: string; params: number[] } {
  return scope == null
    ? { where: '', params: [] }
    : { where: `WHERE u.tenant_id = $${startIdx}`, params: [scope] }
}

export async function listUsers(scope: number | null = null): Promise<AppUser[]> {
  const { where, params } = scopeClause(scope)
  return publicQuery<AppUser>(`
    SELECT u.id, u.email, u.nama, u.jabatan, u.unit, u.role, u.is_active, u.is_pimpinan,
           u.tenant_id, t.nama AS tenant_nama,
           to_char(u.last_login_at, 'YYYY-MM-DD HH24:MI') AS last_login_at,
           to_char(u.created_at, 'YYYY-MM-DD') AS created_at
    FROM app_user u LEFT JOIN tenant t ON t.id = u.tenant_id
    ${where}
    ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'pmo' THEN 1 ELSE 2 END, u.nama
  `, params)
}

export interface UserStats { total: number; active: number; admin: number; pmo: number; viewer: number }
export async function getUserStats(scope: number | null = null): Promise<UserStats> {
  const { where, params } = scopeClause(scope)
  const [r] = await publicQuery<UserStats & Record<string, number>>(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE is_active)::int AS active,
      count(*) FILTER (WHERE role='admin')::int AS admin,
      count(*) FILTER (WHERE role='pmo')::int AS pmo,
      count(*) FILTER (WHERE role='viewer')::int AS viewer
    FROM app_user u
    ${where}
  `, params)
  return r
}

export async function countActiveAdmins(scope: number | null = null): Promise<number> {
  const { where, params } = scope == null
    ? { where: '', params: [] as number[] }
    : { where: 'AND u.tenant_id = $1', params: [scope] }
  const [r] = await publicQuery<{ c: number }>(
    `SELECT count(*)::int AS c FROM app_user u WHERE u.role='admin' AND u.is_active ${where}`,
    params
  )
  return r?.c ?? 0
}

// Bank yang dikelola user ini (admin grup melihat semua). Untuk selektor di form.
export interface TenantRef { id: number; kode: string; nama: string }
export async function listTenants(): Promise<TenantRef[]> {
  return publicQuery<TenantRef>('SELECT id, kode, nama FROM tenant ORDER BY urutan')
}

// tenant_id satu user (untuk guard mutasi lintas-bank).
export async function getUserTenantId(id: number): Promise<number | null | undefined> {
  const [r] = await publicQuery<{ tenant_id: number | null }>('SELECT tenant_id FROM app_user WHERE id = $1', [id])
  return r ? r.tenant_id : undefined
}

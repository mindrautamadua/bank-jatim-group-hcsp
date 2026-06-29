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
  last_login_at: string | null
  created_at: string
}

export async function listUsers(): Promise<AppUser[]> {
  return publicQuery<AppUser>(`
    SELECT id, email, nama, jabatan, unit, role, is_active, is_pimpinan,
           to_char(last_login_at, 'YYYY-MM-DD HH24:MI') AS last_login_at,
           to_char(created_at, 'YYYY-MM-DD') AS created_at
    FROM app_user
    ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'pmo' THEN 1 ELSE 2 END, nama
  `)
}

export interface UserStats { total: number; active: number; admin: number; pmo: number; viewer: number }
export async function getUserStats(): Promise<UserStats> {
  const [r] = await publicQuery<UserStats & Record<string, number>>(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE is_active)::int AS active,
      count(*) FILTER (WHERE role='admin')::int AS admin,
      count(*) FILTER (WHERE role='pmo')::int AS pmo,
      count(*) FILTER (WHERE role='viewer')::int AS viewer
    FROM app_user
  `)
  return r
}

export async function countActiveAdmins(): Promise<number> {
  const [r] = await publicQuery<{ c: number }>(`SELECT count(*)::int AS c FROM app_user WHERE role='admin' AND is_active`)
  return r?.c ?? 0
}

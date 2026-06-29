// Seed initial users for bank-jatim-group-hcsp (multi-tenant).
// - Group-level accounts (tenant_id NULL): admin/pmo/bod for the Bank Jatim
//   holding HC; the admin can switch between all banks.
// - Per-tenant accounts: an admin + pmo scoped to each bank.
// All seed accounts share one password (SEED_PASSWORD env, else a generated
// one printed once at the end). Idempotent (ON CONFLICT update, password kept
// unless overridden). Usage: node scripts/seed-users.mjs
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { TENANTS } from './tenants.mjs'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
const PASSWORD = process.env.SEED_PASSWORD || randomBytes(9).toString('base64url')

async function tenantIdByKode() {
  const { rows } = await client.query('SELECT id, kode FROM public.tenant')
  return Object.fromEntries(rows.map((r) => [r.kode, r.id]))
}

async function upsert(u, hash) {
  await client.query(
    `INSERT INTO public.app_user (email, nama, jabatan, role, password_hash, tenant_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (email) DO UPDATE
       SET nama = EXCLUDED.nama, jabatan = EXCLUDED.jabatan,
           role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id`,
    [u.email, u.nama, u.jabatan, u.role, hash, u.tenant_id]
  )
  console.log(`  ✓ ${u.email} (${u.role}${u.tenant_id ? '' : ', group'})`)
}

async function main() {
  await client.connect()
  const tid = await tenantIdByKode()
  const hash = await bcrypt.hash(PASSWORD, 10)

  // Group-level (holding) accounts — can switch across all tenants.
  const group = [
    { email: 'admin@jatimgroup.co.id', nama: 'Administrator Grup', jabatan: 'Group Human Capital', role: 'admin', tenant_id: null },
    { email: 'pmo@jatimgroup.co.id',   nama: 'PMO Grup',           jabatan: 'Group PMO Human Capital', role: 'pmo', tenant_id: null },
    { email: 'bod@jatimgroup.co.id',   nama: 'Dewan Direksi Grup', jabatan: 'Board of Directors', role: 'bod', tenant_id: null },
  ]

  // Per-tenant admin + pmo.
  const perTenant = TENANTS.flatMap((t) => [
    { email: `admin.${t.kode}@jatimgroup.co.id`, nama: `Administrator ${t.nama}`, jabatan: 'Human Capital', role: 'admin', tenant_id: tid[t.kode] },
    { email: `pmo.${t.kode}@jatimgroup.co.id`,   nama: `PMO ${t.nama}`,           jabatan: 'PMO Human Capital', role: 'pmo', tenant_id: tid[t.kode] },
  ])

  console.log('Group accounts:')
  for (const u of group) await upsert(u, hash)
  console.log('Per-tenant accounts:')
  for (const u of perTenant) await upsert(u, hash)

  await client.end()
  console.log(`\nSemua akun seed memakai password: ${PASSWORD}`)
  console.log('(ganti setelah login pertama; set SEED_PASSWORD untuk menentukan sendiri)')
}

main().catch((e) => { console.error(e); process.exit(1) })

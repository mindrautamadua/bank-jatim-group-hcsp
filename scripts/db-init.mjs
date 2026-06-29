// Initialise the bank-jatim-group-hcsp database:
//   1. apply db/public_schema.sql (tenant + app_user)
//   2. seed public.tenant from scripts/tenants.mjs
//   3. provision a per-tenant schema for each bank (db/tenant_schema.sql)
// Idempotent — safe to re-run. Usage: node scripts/db-init.mjs
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
import { TENANTS } from './tenants.mjs'
import { provisionTenant } from './provision-tenant.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()

  // 1. Global schema
  const publicDdl = readFileSync(join(__dirname, '..', 'db', 'public_schema.sql'), 'utf8')
  await client.query(publicDdl)
  console.log('✓ public schema (tenant, app_user)')

  // 2. Tenant registry
  for (const t of TENANTS) {
    await client.query(
      `INSERT INTO public.tenant (kode, nama, schema_name, is_group, urutan)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (kode) DO UPDATE
         SET nama = EXCLUDED.nama, schema_name = EXCLUDED.schema_name,
             is_group = EXCLUDED.is_group, urutan = EXCLUDED.urutan`,
      [t.kode, t.nama, t.schema_name, t.is_group, t.urutan]
    )
    console.log(`  • tenant ${t.kode} → ${t.schema_name}`)
  }

  // 3. Provision per-tenant content schemas
  for (const t of TENANTS) {
    await provisionTenant(client, t.schema_name)
    console.log(`✓ schema ${t.schema_name} (content tables)`)
  }

  await client.end()
  console.log('\nDatabase initialised.')
}

main().catch((e) => { console.error(e); process.exit(1) })

// Provision a single tenant schema: CREATE SCHEMA + apply db/tenant_schema.sql
// inside it (idempotent). Usage: node scripts/provision-tenant.mjs <schema_name>
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

// pg identifiers: only allow our controlled schema naming pattern.
const SCHEMA_RE = /^t_[a-z0-9_]+$/

export async function provisionTenant(client, schema) {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Nama schema tidak valid: ${schema}`)
  const ddl = readFileSync(join(__dirname, '..', 'db', 'tenant_schema.sql'), 'utf8')
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
  // Run the content DDL inside this schema. search_path also includes public
  // so that REFERENCES public.app_user resolves. SET LOCAL keeps it scoped.
  await client.query('BEGIN')
  try {
    await client.query(`SET LOCAL search_path TO "${schema}", public`)
    await client.query(ddl)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const schema = process.argv[2]
  if (!schema) {
    console.error('Usage: node scripts/provision-tenant.mjs <schema_name>')
    process.exit(1)
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await provisionTenant(client, schema)
    console.log(`✓ provisioned schema ${schema}`)
  } finally {
    await client.end()
  }
}

// Seed Bank Sultra HCSP content into schema t_bank_sultra.
// Content extracted from hcsp-bank-sultra.pdf -> db/content/sultra-content.json
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
import { seedTenantContent } from './seed-tenant-content.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const content = JSON.parse(readFileSync(join(__dirname, '..', 'db', 'content', 'sultra-content.json'), 'utf8'))
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const stats = await seedTenantContent(client, 't_bank_sultra', content)
  console.log('✓ Bank Sultra seeded:', stats)
} finally {
  await client.end()
}

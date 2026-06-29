// Seed Bank Lampung HCSP content into schema t_bank_lampung.
// Content extracted from hcsp-bank-lampung.pdf -> db/content/lampung-content.json
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
import { seedTenantContent } from './seed-tenant-content.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const content = JSON.parse(readFileSync(join(__dirname, '..', 'db', 'content', 'lampung-content.json'), 'utf8'))
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const stats = await seedTenantContent(client, 't_bank_lampung', content)
  console.log('✓ Bank Lampung seeded:', stats)
} finally {
  await client.end()
}

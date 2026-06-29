// Seed the 4 Balanced Scorecard perspektif (HCM) into a tenant schema.
// Universal across banks → used as the scaffold for tenants without full
// content yet, and as the base for full per-bank seeds.
// Usage: node scripts/seed-perspektif.mjs <schema_name>
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'pg'

const SCHEMA_RE = /^t_[a-z0-9_]+$/

export const PERSPEKTIF = [
  { kode: 'F',   nama: 'Finansial pada HCM',                 deskripsi: 'Dampak finansial dari pengelolaan human capital (lag indicator).',          urutan: 1, warna: '#ffcb00' },
  { kode: 'KS',  nama: 'Key Stakeholder pada HCM',           deskripsi: 'Hasil yang dirasakan pemangku kepentingan utama (pegawai & organisasi).',  urutan: 2, warna: '#00814f' },
  { kode: 'PBI', nama: 'Proses Bisnis Internal pada HCM',    deskripsi: 'Efektivitas & kematangan proses inti HCM Strategic dan HCM Services.',     urutan: 3, warna: '#0B7A8C' },
  { kode: 'PP',  nama: 'Pembelajaran & Pertumbuhan pada HCM', deskripsi: 'Kapabilitas intrinsik fungsi HCM: SDM tim, sistem, data, kebijakan & knowledge.', urutan: 4, warna: '#7A4FA0' },
]

export async function seedPerspektif(client, schema) {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Nama schema tidak valid: ${schema}`)
  await client.query(`SET search_path TO "${schema}", public`)
  for (const p of PERSPEKTIF) {
    await client.query(
      `INSERT INTO perspektif (kode, nama, deskripsi, urutan, warna)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (kode) DO UPDATE
         SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi,
             urutan = EXCLUDED.urutan, warna = EXCLUDED.warna`,
      [p.kode, p.nama, p.deskripsi, p.urutan, p.warna]
    )
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const schema = process.argv[2]
  if (!schema) { console.error('Usage: node scripts/seed-perspektif.mjs <schema_name>'); process.exit(1) }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await seedPerspektif(client, schema)
    console.log(`✓ 4 perspektif seeded into ${schema}`)
  } finally {
    await client.end()
  }
}

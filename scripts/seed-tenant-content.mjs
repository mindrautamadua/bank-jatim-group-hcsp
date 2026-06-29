// Load extracted HCSP content (sasaran, IK+targets, maturity+targets, kegiatan,
// pic) into one tenant schema. Idempotent: clears the tenant's content tables
// (keeps perspektif) then inserts. Content comes from a JSON file shaped like
// scratchpad/<bank>-content.json (see extraction spec).
// Usage: node scripts/seed-tenant-content.mjs <schema_name> <content.json>
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { seedPerspektif } from './seed-perspektif.mjs'

const SCHEMA_RE = /^t_[a-z0-9_]+$/
const YEARS = [2026, 2027, 2028, 2029, 2030]

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

export async function seedTenantContent(client, schema, content) {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Nama schema tidak valid: ${schema}`)
  const { sasaran = [], ik = [], maturity = [], kegiatan = [], pic = [] } = content

  await client.query('BEGIN')
  try {
    await client.query(`SET LOCAL search_path TO "${schema}", public`)

    // Perspektif scaffold (universal BSC) — needed for sasaran FK.
    // seedPerspektif sets search_path itself; re-assert ours afterwards.
    await seedPerspektif(client, schema)
    await client.query(`SET LOCAL search_path TO "${schema}", public`)

    // Clear content (cascades to ik_target, ik_realisasi, sasaran_pic,
    // kegiatan, maturity_target, etc.). Perspektif is preserved.
    await client.query('TRUNCATE sasaran_strategis, maturity_domain, sasaran_relasi RESTART IDENTITY CASCADE')

    // Perspektif code -> id
    const pRows = (await client.query('SELECT id, kode FROM perspektif')).rows
    const perspId = Object.fromEntries(pRows.map((r) => [r.kode, r.id]))

    // Sasaran strategis
    let sUrut = 0
    for (const s of sasaran) {
      const pid = perspId[s.perspektif]
      if (!pid) { console.warn(`  ! sasaran ${s.kode}: perspektif '${s.perspektif}' tidak dikenal, dilewati`); continue }
      await client.query(
        `INSERT INTO sasaran_strategis (kode, nama, perspektif_id, jenis, key_program, cadence, urutan)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (kode) DO NOTHING`,
        [s.kode, s.nama, pid, s.jenis ?? null, s.key_program ?? null, s.cadence ?? null, ++sUrut]
      )
    }

    // sasaran_kode -> id
    const ssRows = (await client.query('SELECT id, kode FROM sasaran_strategis')).rows
    const sasId = Object.fromEntries(ssRows.map((r) => [r.kode, r.id]))

    // Indikator kinerja + target per tahun
    let ikCount = 0, tgtCount = 0
    const ikUrutByKode = {}
    for (const k of ik) {
      const sid = sasId[k.sasaran_kode]
      if (!sid) { console.warn(`  ! IK '${k.nama}': sasaran ${k.sasaran_kode} tidak ada, dilewati`); continue }
      const urut = (ikUrutByKode[k.sasaran_kode] = (ikUrutByKode[k.sasaran_kode] ?? 0) + 1)
      const { rows } = await client.query(
        `INSERT INTO indikator_kinerja (sasaran_id, nama, satuan, arah, urutan)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [sid, k.nama, k.satuan ?? null, k.arah ?? 'naik', urut]
      )
      ikCount++
      const ikId = rows[0].id
      const t = k.targets ?? {}
      for (const y of YEARS) {
        const target = num(t[y] ?? t[String(y)])
        if (target === null) continue
        await client.query(
          `INSERT INTO ik_target (ik_id, tahun, target) VALUES ($1,$2,$3)
           ON CONFLICT (ik_id, tahun) DO UPDATE SET target = EXCLUDED.target`,
          [ikId, y, target]
        )
        tgtCount++
      }
    }

    // Maturity domain + target per tahun
    let mCount = 0
    let mUrut = 0
    for (const m of maturity) {
      const { rows } = await client.query(
        `INSERT INTO maturity_domain (kode, nama, cluster, baseline2025, urutan)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [m.kode ?? null, m.nama, m.cluster ?? 'Strategic', num(m.baseline2025), ++mUrut]
      )
      mCount++
      const dId = rows[0].id
      const t = m.targets ?? {}
      for (const y of YEARS) {
        const target = num(t[y] ?? t[String(y)])
        if (target === null) continue
        await client.query(
          `INSERT INTO maturity_target (domain_id, tahun, target_itk) VALUES ($1,$2,$3)
           ON CONFLICT (domain_id, tahun) DO UPDATE SET target_itk = EXCLUDED.target_itk`,
          [dId, y, target]
        )
      }
    }

    // Kegiatan (key program) per sasaran
    let kCount = 0
    const kegUrutByKode = {}
    for (const g of kegiatan) {
      if (!sasId[g.sasaran_kode]) continue
      const urut = g.urutan ?? (kegUrutByKode[g.sasaran_kode] = (kegUrutByKode[g.sasaran_kode] ?? 0) + 1)
      await client.query(
        `INSERT INTO kegiatan (sasaran_kode, urutan, program) VALUES ($1,$2,$3)
         ON CONFLICT (sasaran_kode, urutan) DO UPDATE SET program = EXCLUDED.program`,
        [g.sasaran_kode, urut, g.program]
      )
      kCount++
    }

    // PIC (penanggung jawab) per sasaran
    let pCount = 0
    const picUrutByKode = {}
    for (const p of pic) {
      const sid = sasId[p.sasaran_kode]
      if (!sid) continue
      const urut = (picUrutByKode[p.sasaran_kode] = (picUrutByKode[p.sasaran_kode] ?? 0) + 1)
      await client.query(
        `INSERT INTO sasaran_pic (sasaran_id, peran, unit, urutan) VALUES ($1,$2,$3,$4)`,
        [sid, p.peran ?? 'Utama', p.unit, urut]
      )
      pCount++
    }

    await client.query('COMMIT')
    return { sasaran: sasId && Object.keys(sasId).length, ik: ikCount, ikTargets: tgtCount, maturity: mCount, kegiatan: kCount, pic: pCount }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [schema, jsonPath] = process.argv.slice(2)
  if (!schema || !jsonPath) { console.error('Usage: node scripts/seed-tenant-content.mjs <schema> <content.json>'); process.exit(1) }
  const content = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const stats = await seedTenantContent(client, schema, content)
    console.log(`✓ ${schema} seeded:`, stats)
  } finally {
    await client.end()
  }
}

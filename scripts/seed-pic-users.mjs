// Seed "Penanggung Jawab" accounts (one per PIC unit) for every bank that has
// Key Program / PIC data seeded (currently Bank Lampung & Bank Sultra).
//
// Model: a Penanggung Jawab account = role 'viewer' (labeled "Penanggung Jawab")
// + is_pimpinan = true + unit = <nama unit>. The app derives Utama/Pendukung
// PER sasaran by matching app_user.unit against sasaran_pic.unit (lib/kegiatan-
// constants.ts: peranOf). One pimpinan per (tenant, unit) — so exactly one
// account per distinct unit per bank. As Pendukung the account MENGAJUKAN
// laporan; as Utama ia MEMVERIFIKASI (pemisahan tugas).
//
// Idempotent: ON CONFLICT (email) updates profile but keeps the existing
// password unless SEED_PASSWORD is set (then the password is reset for all).
// Usage: node scripts/seed-pic-users.mjs   [SEED_PASSWORD=... to pin password]
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
const PASSWORD = process.env.SEED_PASSWORD || randomBytes(9).toString('base64url')
const resetPassword = !!process.env.SEED_PASSWORD

// Slug unit -> bagian lokal email. Stabil agar upsert konsisten.
function slug(s) {
  return s
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/\(.*?\)/g, ' ')
    .normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  await client.connect()
  const hash = await bcrypt.hash(PASSWORD, 10)
  const tenants = (await client.query(
    'SELECT id, kode, schema_name, nama FROM public.tenant ORDER BY urutan'
  )).rows

  let created = 0, updated = 0
  for (const t of tenants) {
    // Unit PIC unik di schema tenant ini (lewati bank tanpa data PIC).
    await client.query(`SET search_path TO ${t.schema_name}, public`)
    const units = (await client.query(
      `SELECT unit,
              count(*) FILTER (WHERE peran = 'Utama')::int      AS utama,
              count(*) FILTER (WHERE peran = 'Pendukung')::int  AS pendukung
       FROM sasaran_pic WHERE unit IS NOT NULL AND unit <> ''
       GROUP BY unit ORDER BY unit`
    )).rows
    if (units.length === 0) continue

    console.log(`\n${t.nama} (${units.length} unit):`)
    for (const u of units) {
      const email = `${slug(u.unit)}.${t.kode}@jatimgroup.co.id`
      const peranNote = u.utama > 0 && u.pendukung > 0
        ? `Utama ${u.utama} / Pendukung ${u.pendukung}`
        : u.utama > 0 ? `Utama ${u.utama}` : `Pendukung ${u.pendukung}`
      const setPass = resetPassword
        ? 'password_hash = EXCLUDED.password_hash,'
        : ''
      const r = await client.query(
        `INSERT INTO public.app_user
           (email, nama, jabatan, role, password_hash, tenant_id, unit, is_pimpinan, is_active)
         VALUES ($1,$2,$3,'viewer',$4,$5,$6,true,true)
         ON CONFLICT (email) DO UPDATE SET
           nama = EXCLUDED.nama, jabatan = EXCLUDED.jabatan, role = 'viewer',
           ${setPass}
           tenant_id = EXCLUDED.tenant_id, unit = EXCLUDED.unit,
           is_pimpinan = true, is_active = true
         RETURNING (xmax = 0) AS is_insert`,
        [email, u.unit, 'Penanggung Jawab Key Program', hash, t.id, u.unit]
      )
      const isNew = r.rows[0].is_insert
      if (isNew) created++; else updated++
      console.log(`  ${isNew ? '＋' : '↻'} ${email.padEnd(52)} ${u.unit}  [${peranNote}]`)
    }
  }

  await client.end()
  console.log(`\n✓ Selesai: ${created} akun baru, ${updated} diperbarui.`)
  if (created > 0 || resetPassword) {
    console.log(`Password semua akun Penanggung Jawab: ${PASSWORD}`)
    console.log('(ganti setelah login pertama; set SEED_PASSWORD untuk menentukan sendiri)')
  } else {
    console.log('(password lama dipertahankan; set SEED_PASSWORD untuk reset)')
  }
}

main().catch((e) => { console.error('seed-pic-users gagal:', e); process.exit(1) })

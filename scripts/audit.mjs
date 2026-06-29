// HCSP data-integrity audit. Cross-checks, per tenant:
//   DB schema  <->  db/content/<kode>-content.json  <->  src/lib/program-detail.<kode>.data.json
// plus Penanggung Jawab (PIC) accounts and theming assets.
//
// Auto-detects which banks have data — banks with 0 kegiatan are reported as
// "no Key Program data yet" and skipped for content cross-checks, so this stays
// correct as new tenants are seeded. CI-friendly: exits 1 if any FAIL.
//
// Usage: node scripts/audit.mjs   (or: npm run audit)
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'pg'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(ROOT, p), 'utf8')
const J = (p) => JSON.parse(rd(p))
const has = (p) => existsSync(join(ROOT, p))

const findings = []
const add = (sev, area, msg) => findings.push({ sev, area, msg })

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const tenants = (await client.query(
  'SELECT id, kode, schema_name, nama FROM public.tenant ORDER BY urutan'
)).rows

// Collected for cross-bank account checks.
const picUnitsByKode = {} // kode -> Set(unit)

for (const t of tenants) {
  const A = `[${t.kode}]`
  await client.query(`SET search_path TO ${t.schema_name}, public`)

  const dbSas = (await client.query('SELECT kode FROM sasaran_strategis ORDER BY kode')).rows.map(r => r.kode)
  const keg = (await client.query('SELECT sasaran_kode, urutan, program FROM kegiatan ORDER BY sasaran_kode, urutan')).rows
  const kegByKode = {}; for (const k of keg) (kegByKode[k.sasaran_kode] ||= []).push(k)
  const pic = (await client.query(
    'SELECT s.kode, p.peran, p.unit FROM sasaran_pic p JOIN sasaran_strategis s ON s.id = p.sasaran_id'
  )).rows
  picUnitsByKode[t.kode] = new Set(pic.map(p => p.unit).filter(Boolean))

  // Banks with no Key Program data: report and skip content cross-checks.
  if (keg.length === 0) {
    add('INFO', A, `no Key Program data yet (sasaran ${dbSas.length}, kegiatan 0, pic ${pic.length})`)
    continue
  }

  const contentPath = `db/content/${t.kode}-content.json`
  const pdPath = `src/lib/program-detail.${t.kode}.data.json`
  const content = has(contentPath) ? J(contentPath) : null
  const pd = has(pdPath) ? J(pdPath) : null
  if (!content) add('WARN', A + ' content', `${contentPath} missing (cannot cross-check counts)`)
  if (!pd) add('FAIL', A + ' program-detail', `${pdPath} missing — Detail/Gantt blueprint will be empty`)

  // sasaran count vs content
  if (content) {
    if (dbSas.length !== content.sasaran.length) add('FAIL', A + ' sasaran', `DB ${dbSas.length} != content ${content.sasaran.length}`)
    else add('INFO', A + ' sasaran', `${dbSas.length} sasaran (DB == content)`)
  }

  // urutan 0-based contiguous (required by gantt/detail indexing)
  let urutBad = 0
  for (const [code, rows] of Object.entries(kegByKode)) {
    const got = rows.map(r => r.urutan).sort((a, z) => a - z)
    const want = rows.map((_, i) => i)
    if (JSON.stringify(got) !== JSON.stringify(want)) { urutBad++; add('FAIL', A + ' urutan', `${code}: urutan [${got.join(',')}] not 0..${rows.length - 1}`) }
  }
  if (!urutBad) add('INFO', A + ' urutan', `all sasaran 0-based contiguous (${keg.length} kegiatan)`)

  // program-detail <-> DB alignment + schema
  if (pd) {
    for (const code of Object.keys(pd)) if (!dbSas.includes(code)) add('FAIL', A + ' program-detail', `PD key ${code} is not a DB sasaran`)
    for (const code of Object.keys(kegByKode)) if (!pd[code]) add('FAIL', A + ' program-detail', `sasaran ${code} has kegiatan but NO program-detail entry`)
    let mism = 0, badSchema = 0, emptyProg = 0
    for (const [code, rows] of Object.entries(kegByKode)) {
      const pdk = pd[code]?.kegiatan || []
      if (pd[code] && pdk.length !== rows.length) add('FAIL', A + ' align', `${code}: PD kegiatan ${pdk.length} != DB ${rows.length}`)
      for (const r of rows) {
        const pdProg = (pdk[r.urutan]?.program || '').trim()
        if (pdProg !== (r.program || '').trim()) { mism++; if (mism <= 3) add('FAIL', A + ' align', `${code}[${r.urutan}] program text PD != DB`) }
      }
    }
    for (const [code, v] of Object.entries(pd)) {
      if (!Array.isArray(v.tujuan) || !Array.isArray(v.gambaranUmum) || !Array.isArray(v.kegiatan)) { badSchema++; add('FAIL', A + ' schema', `${code}: missing array field`) }
      for (const k of v.kegiatan || []) {
        if (typeof k.program !== 'string' || !k.program.trim()) emptyProg++
        if (!Array.isArray(k.rincian) || typeof k.waktu !== 'string' || !Array.isArray(k.hasil)) { badSchema++; add('FAIL', A + ' schema', `${code}: kegiatan row wrong types`) }
      }
    }
    if (emptyProg) add('FAIL', A + ' schema', `${emptyProg} kegiatan with empty program`)
    if (!mism) add('INFO', A + ' align', 'PD program text matches DB at every urutan')
    if (!badSchema && !emptyProg) add('INFO', A + ' schema', 'program-detail schema valid')
  }

  // IK & maturity counts vs content
  if (content) {
    const ikDb = (await client.query('SELECT count(*)::int n FROM indikator_kinerja')).rows[0].n
    if (ikDb !== (content.ik?.length || 0)) add('WARN', A + ' ik', `DB ${ikDb} != content ${content.ik?.length}`)
    else add('INFO', A + ' ik', `${ikDb} IK (DB == content)`)
    const matDb = (await client.query('SELECT count(*)::int n FROM maturity_domain')).rows[0].n
    if (matDb !== (content.maturity?.length || 0)) add('WARN', A + ' maturity', `DB ${matDb} != content ${content.maturity?.length}`)
    else add('INFO', A + ' maturity', `${matDb} maturity (DB == content)`)
    if (pic.length !== (content.pic?.length || 0)) add('WARN', A + ' pic', `DB ${pic.length} != content ${content.pic?.length}`)
    else add('INFO', A + ' pic', `${pic.length} PIC rows (DB == content)`)
  }

  // PIC validity: non-empty units, valid peran, <=1 Utama per sasaran (>1 = FAIL)
  if (pic.some(p => !p.unit || !p.unit.trim())) add('FAIL', A + ' pic', 'empty unit in sasaran_pic')
  if (pic.some(p => !['Utama', 'Pendukung'].includes(p.peran))) add('FAIL', A + ' pic', 'invalid peran value')
  const utama = {}; for (const p of pic) if (p.peran === 'Utama') utama[p.kode] = (utama[p.kode] || 0) + 1
  const multi = Object.keys(utama).filter(k => utama[k] > 1)
  if (multi.length) add('FAIL', A + ' pic', `sasaran with >1 Utama: ${multi.join(', ')}`)
  const noUtama = Object.keys(kegByKode).filter(k => !utama[k])
  if (noUtama.length) add('WARN', A + ' pic', `kegiatan-bearing sasaran without Utama (umbrella/source quirk?): ${noUtama.join(', ')}`)
}

// Penanggung Jawab accounts
await client.query('SET search_path TO public')
const accts = (await client.query(`SELECT u.email, u.unit, u.role, u.is_pimpinan, u.is_active,
    u.password_hash IS NOT NULL AS pw, t.kode
  FROM public.app_user u JOIN public.tenant t ON t.id = u.tenant_id
  WHERE u.jabatan = 'Penanggung Jawab Key Program'`)).rows
add('INFO', '[accounts]', `${accts.length} Penanggung Jawab accounts`)
for (const a of accts) {
  if (a.role !== 'viewer' || !a.is_pimpinan || !a.is_active || !a.pw || !a.unit) add('FAIL', '[accounts]', `bad flags: ${a.email}`)
}
for (const [kode, units] of Object.entries(picUnitsByKode)) {
  if (units.size === 0) continue
  const bankAccts = accts.filter(a => a.kode === kode)
  for (const u of units) {
    const m = bankAccts.filter(a => a.unit === u)
    if (m.length === 0) add('FAIL', '[accounts]', `${kode}: PIC unit "${u}" has NO account`)
    else if (m.length > 1) add('FAIL', '[accounts]', `${kode}: PIC unit "${u}" has ${m.length} accounts`)
  }
  for (const a of bankAccts) if (!units.has(a.unit)) add('FAIL', '[accounts]', `${kode}: orphan account ${a.email} (unit "${a.unit}" not in PIC)`)
}
const dupEmail = (await client.query('SELECT email, count(*) n FROM app_user GROUP BY email HAVING count(*) > 1')).rows
if (dupEmail.length) add('FAIL', '[accounts]', `duplicate emails: ${dupEmail.map(r => r.email).join(', ')}`)
else add('INFO', '[accounts]', 'no duplicate emails')

// Theming assets (tenant.ts brand + logo files)
const tenantTs = rd('src/lib/tenant.ts')
const logoPaths = [...tenantTs.matchAll(/logo:\s*'([^']+)'/g)].map(m => m[1])
for (const lp of logoPaths) if (!has(`public${lp}`)) add('FAIL', '[theming]', `missing logo file: public${lp}`)
const brandCount = (tenantTs.match(/brand:\s*\{/g) || []).length
add(brandCount === tenants.length ? 'INFO' : 'WARN', '[theming]', `${brandCount} brand palettes, ${logoPaths.length} logos for ${tenants.length} tenants`)

await client.end()

// Report
const order = { FAIL: 0, WARN: 1, INFO: 2 }
findings.sort((a, z) => order[a.sev] - order[z.sev] || a.area.localeCompare(z.area))
const n = { FAIL: 0, WARN: 0, INFO: 0 }
console.log('================ HCSP DATA AUDIT ================')
for (const f of findings) { n[f.sev]++; console.log(`${f.sev.padEnd(4)} ${f.area.padEnd(28)} ${f.msg}`) }
console.log('================================================')
console.log(`FAIL ${n.FAIL} | WARN ${n.WARN} | INFO ${n.INFO}`)
console.log(n.FAIL === 0 ? (n.WARN === 0 ? '✅ ALL CHECKS PASSED' : '🟡 PASSED WITH WARNINGS') : '❌ FAILURES FOUND')
process.exit(n.FAIL === 0 ? 0 : 1)

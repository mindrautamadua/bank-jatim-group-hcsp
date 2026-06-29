import { query, withTransaction, type TxQuery } from './db'
import { deriveStatusHealth } from './sasaran-health'
import type { Perspektif, Sasaran, IK, MaturityDomain, PIC, Health, Frekuensi, UpdateLog } from './types'

const SASARAN_SELECT = `
  SELECT s.*, p.kode AS perspektif_kode, p.nama AS perspektif_nama, p.warna AS perspektif_warna
  FROM sasaran_strategis s
  JOIN perspektif p ON p.id = s.perspektif_id
`

export async function getPerspektif(): Promise<Perspektif[]> {
  return query<Perspektif>('SELECT * FROM perspektif ORDER BY urutan')
}

export async function getAllSasaran(): Promise<Sasaran[]> {
  return query<Sasaran>(`${SASARAN_SELECT} ORDER BY s.urutan`)
}

export async function getSasaranByKode(kode: string): Promise<Sasaran | null> {
  const rows = await query<Sasaran>(`${SASARAN_SELECT} WHERE s.kode = $1`, [kode])
  return rows[0] ?? null
}

export async function getPIC(sasaranId: number): Promise<PIC[]> {
  return query<PIC>('SELECT peran, unit FROM sasaran_pic WHERE sasaran_id = $1 ORDER BY urutan', [sasaranId])
}

// Admin menetapkan daftar Penanggung Jawab Utama sebuah sasaran (mengganti seluruh
// baris peran 'Utama'; baris 'Pendukung' tidak disentuh).
export async function setSasaranUtama(sasaranId: number, units: string[]): Promise<void> {
  const cleaned = Array.from(new Set(units.map((u) => u.trim()).filter(Boolean)))
  await withTransaction(async (q) => {
    await q(`DELETE FROM sasaran_pic WHERE sasaran_id = $1 AND peran = 'Utama'`, [sasaranId])
    for (let i = 0; i < cleaned.length; i++) {
      await q(
        `INSERT INTO sasaran_pic (sasaran_id, peran, unit, urutan) VALUES ($1, 'Utama', $2, $3)`,
        [sasaranId, cleaned[i], i]
      )
    }
  })
}

// Semua PIC + kode sasaran-nya dalam satu query (untuk daftar/peta yang butuh PIC
// banyak sasaran sekaligus, hindari N+1).
export async function getAllPIC(): Promise<(PIC & { sasaran_kode: string })[]> {
  return query<PIC & { sasaran_kode: string }>(
    `SELECT s.kode AS sasaran_kode, p.peran, p.unit
     FROM sasaran_pic p JOIN sasaran_strategis s ON s.id = p.sasaran_id
     ORDER BY p.urutan`
  )
}

export async function getIKForSasaran(sasaranId: number): Promise<IK[]> {
  // Satu query ber-agregasi (hindari N+1). numeric di-cast ke float8 agar json
  // mengembalikan number, bukan string.
  return query<IK>(
    `SELECT i.id, i.sasaran_id, i.nama, i.satuan, i.arah, i.frekuensi,
       COALESCE((
         SELECT json_agg(json_build_object('tahun', t.tahun, 'target', t.target::float8, 'realisasi', t.realisasi::float8) ORDER BY t.tahun)
         FROM ik_target t WHERE t.ik_id = i.id
       ), '[]'::json) AS targets,
       COALESCE((
         SELECT json_agg(json_build_object('tahun', r.tahun, 'periode', r.periode, 'nilai', r.nilai::float8) ORDER BY r.tahun, r.periode)
         FROM ik_realisasi r WHERE r.ik_id = i.id
       ), '[]'::json) AS periode
     FROM indikator_kinerja i
     WHERE i.sasaran_id = $1
     ORDER BY i.urutan`,
    [sasaranId]
  )
}

// Jumlah Indikator Kinerja per sasaran (kode → jumlah) dalam satu query.
export async function getIKCountByKode(): Promise<Map<string, number>> {
  const rows = await query<{ kode: string; jumlah: number }>(
    `SELECT s.kode, count(i.id)::int AS jumlah
     FROM sasaran_strategis s LEFT JOIN indikator_kinerja i ON i.sasaran_id = s.id
     GROUP BY s.kode`
  )
  return new Map(rows.map((r) => [r.kode, r.jumlah]))
}

// Jumlah Key Program (baris tabel kegiatan) per sasaran. Sumber kebenaran =
// tabel kegiatan di schema tenant aktif (di-seed dari Blueprint/HCSP tiap bank),
// bukan file program-detail.<bank>.json (yang hanya berisi konten blueprint kaya).
export async function getKeyProgramCountByKode(): Promise<Map<string, number>> {
  const rows = await query<{ kode: string; n: number }>(
    `SELECT sasaran_kode AS kode, count(*)::int AS n FROM kegiatan GROUP BY sasaran_kode`
  )
  return new Map(rows.map((r) => [r.kode, r.n]))
}

// Overall progress per sasaran = rata-rata progress terverifikasi seluruh key
// program (tabel kegiatan), selaras formula di halaman detail. 0 bila belum ada.
export async function getProgressByKode(): Promise<Map<string, number>> {
  const rows = await query<{ kode: string; progress: number }>(
    `SELECT sasaran_kode AS kode, round(avg(progress))::int AS progress
     FROM kegiatan GROUP BY sasaran_kode`
  )
  return new Map(rows.map((r) => [r.kode, r.progress]))
}

// Rata-rata overall progress per perspektif (kode perspektif → %). Dihitung sebagai
// rata-rata dari progress per sasaran (tiap sasaran berbobot sama), selaras Strategy Map.
export async function getProgressByPerspektif(): Promise<Map<string, number>> {
  const rows = await query<{ kode: string; progress: number }>(
    `SELECT p.kode, round(avg(t.sp))::int AS progress
     FROM (
       SELECT s.id, s.perspektif_id, avg(k.progress) AS sp
       FROM kegiatan k JOIN sasaran_strategis s ON s.kode = k.sasaran_kode
       GROUP BY s.id, s.perspektif_id
     ) t
     JOIN perspektif p ON p.id = t.perspektif_id
     GROUP BY p.kode`
  )
  return new Map(rows.map((r) => [r.kode, r.progress]))
}

// Selaraskan status, health & progress sebuah sasaran dengan overall progress key
// program-nya (rata-rata progress terverifikasi). Key program adalah SATU-SATUNYA
// sumber kebenaran status/health/progress sasaran (lihat lib/sasaran-health.ts).
// Tidak melakukan apa-apa bila sasaran belum punya key program (biarkan apa adanya).
export async function recomputeSasaranStatus(kode: string): Promise<void> {
  const [r] = await query<{ p: number | null }>(
    `SELECT round(avg(progress))::int AS p FROM kegiatan WHERE sasaran_kode = $1`,
    [kode]
  )
  if (!r || r.p === null) return
  const { status, health } = deriveStatusHealth(r.p)
  await query('UPDATE sasaran_strategis SET status = $2, health = $3, progress = $4 WHERE kode = $1', [kode, status, health, r.p])
}

// Backfill: hitung ulang status/health/progress SEMUA sasaran yang punya key program
// dari progress terverifikasi-nya. Dipakai sekali untuk meluruskan data seed lama.
export async function recomputeAllSasaranStatus(): Promise<number> {
  const rows = await query<{ kode: string }>(`SELECT DISTINCT sasaran_kode AS kode FROM kegiatan`)
  for (const r of rows) await recomputeSasaranStatus(r.kode)
  return rows.length
}

export async function getMaturityDomains(): Promise<MaturityDomain[]> {
  return query<MaturityDomain>(
    `SELECT d.id, d.kode, d.nama, d.cluster, d.baseline2025,
       COALESCE((
         SELECT json_agg(json_build_object('tahun', t.tahun, 'target_itk', t.target_itk::float8, 'realisasi', t.realisasi::float8) ORDER BY t.tahun)
         FROM maturity_target t WHERE t.domain_id = d.id
       ), '[]'::json) AS targets
     FROM maturity_domain d
     ORDER BY d.urutan`
  )
}

// ── Mutasi operasional (diisi PMO) ─────────────────────────────────────────
// Hanya menyentuh kolom operasional; data blueprint (target, IK, nama) tidak diubah.
// Catatan: status/health/progress sasaran TIDAK lagi ditulis dari sini — sumber
// tunggalnya adalah progress Key Program (lihat recomputeSasaranStatus).

export async function upsertIKRealisasi(ikId: number, tahun: number, realisasi: number | null): Promise<void> {
  await query(
    `INSERT INTO ik_target (ik_id, tahun, realisasi) VALUES ($1, $2, $3)
     ON CONFLICT (ik_id, tahun) DO UPDATE SET realisasi = EXCLUDED.realisasi`,
    [ikId, tahun, realisasi]
  )
}

export async function upsertMaturityRealisasi(domainId: number, tahun: number, realisasi: number | null): Promise<void> {
  await query(
    `INSERT INTO maturity_target (domain_id, tahun, realisasi) VALUES ($1, $2, $3)
     ON CONFLICT (domain_id, tahun) DO UPDATE SET realisasi = EXCLUDED.realisasi`,
    [domainId, tahun, realisasi]
  )
}

export async function setIKFrekuensi(ikId: number, frekuensi: Frekuensi): Promise<void> {
  await query('UPDATE indikator_kinerja SET frekuensi = $1 WHERE id = $2', [frekuensi, ikId])
}

export async function upsertIKPeriode(ikId: number, tahun: number, periode: string, nilai: number | null): Promise<void> {
  await query(
    `INSERT INTO ik_realisasi (ik_id, tahun, periode, nilai, updated_at) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (ik_id, tahun, periode) DO UPDATE SET nilai = EXCLUDED.nilai, updated_at = now()`,
    [ikId, tahun, periode, nilai]
  )
}

// Hapus baris realisasi periode yang BUKAN milik frekuensi aktif (mis. sisa Q1..Q4
// setelah IK diganti ke semesteran). Mencegah rollup tahunan salah memilih periode
// lintas namespace frekuensi.
export async function pruneIKPeriode(ikId: number, tahun: number, keepKeys: string[]): Promise<void> {
  await query(
    'DELETE FROM ik_realisasi WHERE ik_id = $1 AND tahun = $2 AND NOT (periode = ANY($3))',
    [ikId, tahun, keepKeys]
  )
}

// Rollup realisasi tahunan IK = realisasi periode terbaru (YTD) yang terisi pada tahun tsb.
// Dibatasi ke set periode frekuensi aktif (keepKeys) agar tidak salah ambil dari baris basi.
// Dipakai supaya dashboard & detail (yang membaca ik_target.realisasi) tetap konsisten.
export async function rollupIKRealisasiTahunan(ikId: number, tahun: number, keepKeys: string[]): Promise<void> {
  await query(
    `INSERT INTO ik_target (ik_id, tahun, realisasi)
     VALUES ($1, $2, (
       SELECT nilai FROM ik_realisasi
       WHERE ik_id = $1 AND tahun = $2 AND nilai IS NOT NULL AND periode = ANY($3)
       ORDER BY
         CASE WHEN periode = 'Y' THEN 999
              ELSE substring(periode from '[0-9]+')::int END DESC
       LIMIT 1
     ))
     ON CONFLICT (ik_id, tahun) DO UPDATE SET realisasi = EXCLUDED.realisasi`,
    [ikId, tahun, keepKeys]
  )
}

// ── Update log (riwayat) ─────────────────────────────────────────────────────

export async function logUpdate(entry: {
  entitas: string
  ref_kode: string | null
  ringkasan: string
  user_id: number | null
  user_nama: string | null
}, q: TxQuery = query): Promise<void> {
  await q(
    'INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1, $2, $3, $4, $5)',
    [entry.entitas, entry.ref_kode, entry.ringkasan, entry.user_id, entry.user_nama]
  )
}

export async function getRecentUpdates(limit = 10): Promise<UpdateLog[]> {
  return query<UpdateLog>(
    'SELECT id, entitas, ref_kode, ringkasan, user_nama, created_at FROM update_log ORDER BY created_at DESC LIMIT $1',
    [limit]
  )
}

export async function getUpdatesForRef(refKode: string, limit = 20): Promise<UpdateLog[]> {
  return query<UpdateLog>(
    'SELECT id, entitas, ref_kode, ringkasan, user_nama, created_at FROM update_log WHERE ref_kode = $1 ORDER BY created_at DESC LIMIT $2',
    [refKode, limit]
  )
}

export interface PortfolioStats {
  total: number
  onTrack: number
  delayed: number
  atRisk: number
  completed: number
  avgProgress: number
  byPerspektif: { kode: string; nama: string; warna: string | null; count: number }[]
}

export async function getPortfolioStats(): Promise<PortfolioStats> {
  const [agg] = await query<{ total: number; ontrack: number; delayed: number; atrisk: number; completed: number; avgprogress: number }>(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'On Track')::int AS ontrack,
      count(*) FILTER (WHERE status = 'Delayed')::int AS delayed,
      count(*) FILTER (WHERE status = 'At Risk')::int AS atrisk,
      count(*) FILTER (WHERE status = 'Completed')::int AS completed,
      COALESCE(round(avg(progress)),0)::int AS avgprogress
    FROM sasaran_strategis
  `)
  const byPerspektif = await query<{ kode: string; nama: string; warna: string | null; count: number }>(`
    SELECT p.kode, p.nama, p.warna, count(s.id)::int AS count
    FROM perspektif p LEFT JOIN sasaran_strategis s ON s.perspektif_id = p.id
    GROUP BY p.id ORDER BY p.urutan
  `)
  return {
    total: agg.total,
    onTrack: agg.ontrack,
    delayed: agg.delayed,
    atRisk: agg.atrisk,
    completed: agg.completed,
    avgProgress: agg.avgprogress,
    byPerspektif,
  }
}

export interface MaturitySummary {
  baselineOverall: number
  target2030Overall: number
  byCluster: { cluster: string; baseline: number; target2030: number }[]
}

// Rollup resmi dari Blueprint (Bab 3 Roadmap & Lampiran 2):
//   PBI.1   HCM keseluruhan : 2025 = 3,42 → target 3,50 / 3,73 / 3,87 / 3,94 / 3,96
//   PBI.1.a HCM Strategic   : 2025 = 3,44 → target 3,53 / 3,77 / 3,93 / 4,00 / 4,00
//   PBI.1.b HCM Services    : 2025 = 3,39 → target 3,46 / 3,67 / 3,81 / 3,86 / 3,92
//   HCIS                    : 2025 = 2,50 → rollup rata-rata HCIS.1 & HCIS.2
export const OFFICIAL_MATURITY = {
  overall: { baseline: 3.42, traj: { 2025: 3.42, 2026: 3.50, 2027: 3.73, 2028: 3.87, 2029: 3.94, 2030: 3.96 } },
  Strategic: { baseline: 3.44, target2030: 4.0 },
  Services: { baseline: 3.39, target2030: 3.92 },
  HCIS: { baseline: 2.5, target2030: 3.5 },
} as const

export async function getMaturitySummary(): Promise<MaturitySummary> {
  return {
    baselineOverall: OFFICIAL_MATURITY.overall.baseline,
    target2030Overall: OFFICIAL_MATURITY.overall.traj[2030],
    byCluster: [
      { cluster: 'Strategic', baseline: OFFICIAL_MATURITY.Strategic.baseline, target2030: OFFICIAL_MATURITY.Strategic.target2030 },
      { cluster: 'Services', baseline: OFFICIAL_MATURITY.Services.baseline, target2030: OFFICIAL_MATURITY.Services.target2030 },
      { cluster: 'HCIS', baseline: OFFICIAL_MATURITY.HCIS.baseline, target2030: OFFICIAL_MATURITY.HCIS.target2030 },
    ],
  }
}

export interface PicWorkload {
  unit: string
  utama: number
  pendukung: number
}

export async function getPicWorkload(): Promise<PicWorkload[]> {
  return query<PicWorkload>(`
    SELECT unit,
      count(*) FILTER (WHERE peran = 'Utama')::int AS utama,
      count(*) FILTER (WHERE peran = 'Pendukung')::int AS pendukung
    FROM sasaran_pic
    GROUP BY unit
    ORDER BY count(*) FILTER (WHERE peran = 'Utama') DESC, count(*) DESC
  `)
}

// ---- Batch 1: insight queries ----

export interface OutcomeKPI {
  kode: string
  sasaran_nama: string
  ik_nama: string
  satuan: string | null
  arah: string
  t2026: number | null
  r2026: number | null
  t2030: number | null
}

// Satu KPI utama (lag/outcome) per sasaran perspektif Finansial & Key Stakeholder.
export async function getOutcomeKPIs(): Promise<OutcomeKPI[]> {
  const rows = await query<OutcomeKPI & { t2026: string | null; r2026: string | null; t2030: string | null }>(`
    SELECT s.kode, s.nama AS sasaran_nama, ik.nama AS ik_nama, ik.satuan, ik.arah,
           t26.target AS t2026, t26.realisasi AS r2026, t30.target AS t2030
    FROM sasaran_strategis s
    JOIN LATERAL (
      SELECT id, nama, satuan, arah FROM indikator_kinerja i
      WHERE i.sasaran_id = s.id ORDER BY i.urutan LIMIT 1
    ) ik ON true
    LEFT JOIN ik_target t26 ON t26.ik_id = ik.id AND t26.tahun = 2026
    LEFT JOIN ik_target t30 ON t30.ik_id = ik.id AND t30.tahun = 2030
    WHERE s.jenis = 'lag'
    ORDER BY s.urutan
  `)
  return rows.map((r) => ({
    ...r,
    t2026: r.t2026 === null ? null : Number(r.t2026),
    r2026: r.r2026 === null ? null : Number(r.r2026),
    t2030: r.t2030 === null ? null : Number(r.t2030),
  }))
}

export interface FokusDomain {
  kode: string | null
  nama: string
  cluster: string
  baseline: number // posisi awal tahun berjalan (target tahun sebelumnya; baseline asesmen utk tahun pertama)
  target: number // target tahun berjalan
  step: number
}

// Domain kematangan yang ditargetkan naik pada `year` dibanding tahun sebelumnya.
export async function getFokus(year: number): Promise<FokusDomain[]> {
  const rows = await query<{ kode: string | null; nama: string; cluster: string; baseline2025: string; t_cur: string; t_prev: string | null }>(`
    SELECT d.kode, d.nama, d.cluster, d.baseline2025,
           cur.target_itk AS t_cur, prev.target_itk AS t_prev
    FROM maturity_domain d
    JOIN maturity_target cur ON cur.domain_id = d.id AND cur.tahun = $1
    LEFT JOIN maturity_target prev ON prev.domain_id = d.id AND prev.tahun = $1 - 1
  `, [year])
  return rows
    .map((r) => {
      const target = Number(r.t_cur)
      // Pembanding: target tahun sebelumnya, atau baseline asesmen bila tahun pertama (tak ada target tahun−1).
      const baseline = r.t_prev !== null ? Number(r.t_prev) : Number(r.baseline2025)
      return { kode: r.kode, nama: r.nama, cluster: r.cluster, baseline, target, step: Number((target - baseline).toFixed(2)) }
    })
    .filter((d) => d.step > 0)
    .sort((a, b) => b.step - a.step)
}

export interface ClusterPoint {
  tahun: number
  Strategic: number | null
  Services: number | null
  HCIS: number | null
}

// Rata-rata target kematangan per cluster, per tahun (2025-2030).
export async function getClusterTrajectory(): Promise<ClusterPoint[]> {
  const rows = await query<{ cluster: string; tahun: number; val: string }>(`
    SELECT d.cluster, t.tahun, round(avg(t.target_itk)::numeric, 2) AS val
    FROM maturity_domain d
    JOIN maturity_target t ON t.domain_id = d.id
    GROUP BY d.cluster, t.tahun
    ORDER BY t.tahun
  `)
  const byYear = new Map<number, ClusterPoint>()
  for (const r of rows) {
    const y = Number(r.tahun)
    if (!byYear.has(y)) byYear.set(y, { tahun: y, Strategic: null, Services: null, HCIS: null })
    const point = byYear.get(y)!
    point[r.cluster as 'Strategic' | 'Services' | 'HCIS'] = Number(r.val)
  }
  return [...byYear.values()].sort((a, b) => a.tahun - b.tahun)
}

// ---- Lapisan performa (variance & health) ----

export interface PerformanceOverview {
  total: number
  health: { green: number; yellow: number; red: number; grey: number }
  status: { onTrack: number; delayed: number; atRisk: number; completed: number; notStarted: number }
  avgProgress: number
}

export async function getPerformanceOverview(): Promise<PerformanceOverview> {
  const [s] = await query<{
    total: number; green: number; yellow: number; red: number; grey: number
    ontrack: number; delayed: number; atrisk: number; completed: number; notstarted: number; avgprogress: number
  }>(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE health='green')::int  AS green,
      count(*) FILTER (WHERE health='yellow')::int AS yellow,
      count(*) FILTER (WHERE health='red')::int    AS red,
      count(*) FILTER (WHERE health='grey')::int   AS grey,
      count(*) FILTER (WHERE status='On Track')::int    AS ontrack,
      count(*) FILTER (WHERE status='Delayed')::int     AS delayed,
      count(*) FILTER (WHERE status='At Risk')::int      AS atrisk,
      count(*) FILTER (WHERE status='Completed')::int    AS completed,
      count(*) FILTER (WHERE status='Not Started')::int  AS notstarted,
      COALESCE(round(avg(progress)),0)::int AS avgprogress
    FROM sasaran_strategis
  `)
  return {
    total: s.total,
    health: { green: s.green, yellow: s.yellow, red: s.red, grey: s.grey },
    status: { onTrack: s.ontrack, delayed: s.delayed, atRisk: s.atrisk, completed: s.completed, notStarted: s.notstarted },
    avgProgress: s.avgprogress,
  }
}

export interface AttentionItem {
  kode: string
  nama: string
  perspektif_kode: string
  perspektif_warna: string | null
  status: string
  health: Health
  progress: number
}

export interface MaturityTrajPoint {
  tahun: number
  target: number | null
  realisasi: number | null
}

// Trajektori kematangan HCM keseluruhan: target resmi (PBI.1) vs realisasi (rata-rata domain terisi).
export async function getMaturityTrajectory(): Promise<MaturityTrajPoint[]> {
  const rows = await query<{ tahun: number; realisasi: string | null }>(`
    SELECT tahun, round(avg(realisasi)::numeric, 2) AS realisasi
    FROM maturity_target
    WHERE realisasi IS NOT NULL
    GROUP BY tahun
  `)
  const real = new Map<number, number>()
  for (const r of rows) if (r.realisasi !== null) real.set(Number(r.tahun), Number(r.realisasi))
  const years = [2025, 2026, 2027, 2028, 2029, 2030] as const
  return years.map((y) => ({
    tahun: y,
    target: OFFICIAL_MATURITY.overall.traj[y],
    // 2025 aktual = baseline asesmen resmi (3,42); tahun lain = rata-rata realisasi domain yang terisi
    realisasi: y === 2025 ? OFFICIAL_MATURITY.overall.baseline : real.has(y) ? real.get(y)! : null,
  }))
}

// Daftar eksepsi: program yang berisiko/terlambat (Delayed/At Risk atau health
// merah) DAN program yang seharusnya sudah dimulai (tahun_mulai sudah tiba/lewat)
// tetapi belum dimulai (Not Started). Yang belum mulai dan memang belum waktunya
// (tahun_mulai > tahun berjalan) tetap dikecualikan.
export async function getAttentionList(): Promise<AttentionItem[]> {
  return query<AttentionItem>(`
    SELECT s.kode, s.nama, p.kode AS perspektif_kode, p.warna AS perspektif_warna,
           s.status, s.health, s.progress
    FROM sasaran_strategis s
    JOIN perspektif p ON p.id = s.perspektif_id
    WHERE s.status IN ('Delayed','At Risk')
       OR s.health = 'red'
       OR (s.status = 'Not Started' AND s.tahun_mulai <= EXTRACT(YEAR FROM now()))
    ORDER BY CASE s.health WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 WHEN 'grey' THEN 2 ELSE 3 END,
             s.progress ASC, s.urutan
  `)
}

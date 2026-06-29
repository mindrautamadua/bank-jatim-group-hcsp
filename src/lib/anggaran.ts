import { query } from './db'

export { serapan, fmtRp, serapanTone } from './anggaran-helpers'

export interface AnggaranRow {
  tahun: number
  rencana: number | null
  realisasi: number | null
  catatan: string | null
}

export interface AnggaranSummary {
  kode: string
  nama: string
  perspektif_kode: string
  warna: string | null
  rencana: number
  realisasi: number
  punya: boolean
}

export async function getAnggaranForSasaran(kode: string): Promise<AnggaranRow[]> {
  return query<AnggaranRow>(
    `SELECT tahun, rencana::float8 AS rencana, realisasi::float8 AS realisasi, catatan
     FROM anggaran WHERE sasaran_kode = $1 ORDER BY tahun`,
    [kode]
  )
}

export async function listAnggaranSummary(tahun?: number): Promise<AnggaranSummary[]> {
  const params: unknown[] = []
  let join = 'LEFT JOIN anggaran a ON a.sasaran_kode = s.kode'
  if (tahun) { params.push(tahun); join += ` AND a.tahun = $${params.length}` }
  return query<AnggaranSummary>(`
    SELECT s.kode, s.nama, p.kode AS perspektif_kode, p.warna,
           COALESCE(sum(a.rencana),0)::float8 AS rencana,
           COALESCE(sum(a.realisasi),0)::float8 AS realisasi,
           bool_or(a.id IS NOT NULL) AS punya
    FROM sasaran_strategis s
    JOIN perspektif p ON p.id = s.perspektif_id
    ${join}
    GROUP BY s.kode, s.nama, p.kode, p.warna, s.urutan
    ORDER BY s.urutan
  `, params)
}

export interface AnggaranStats { rencana: number; realisasi: number; programs: number }
export async function getAnggaranStats(tahun?: number): Promise<AnggaranStats> {
  const params: unknown[] = []
  let where = ''
  if (tahun) { params.push(tahun); where = `WHERE tahun = $${params.length}` }
  const [r] = await query<AnggaranStats & Record<string, number>>(`
    SELECT COALESCE(sum(rencana),0)::float8 AS rencana,
           COALESCE(sum(realisasi),0)::float8 AS realisasi,
           count(DISTINCT sasaran_kode)::int AS programs
    FROM anggaran ${where}
  `, params)
  return r
}

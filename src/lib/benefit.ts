import { query } from './db'

export { JENIS_BENEFIT, ARAH_BENEFIT } from './benefit-constants'

export interface Benefit {
  id: number
  sasaran_kode: string
  sasaran_nama: string | null
  perspektif_kode: string | null
  perspektif_warna: string | null
  nama: string
  jenis: string
  satuan: string | null
  baseline: number | null
  target: number | null
  actual: number | null
  arah: string
  target_tahun: number | null
  catatan: string | null
}

const SELECT = `
  SELECT b.id, b.sasaran_kode, s.nama AS sasaran_nama, p.kode AS perspektif_kode, p.warna AS perspektif_warna,
         b.nama, b.jenis, b.satuan,
         b.baseline::float8 AS baseline, b.target::float8 AS target, b.actual::float8 AS actual,
         b.arah, b.target_tahun, b.catatan
  FROM benefit b
  JOIN sasaran_strategis s ON s.kode = b.sasaran_kode
  JOIN perspektif p ON p.id = s.perspektif_id
`

export async function listBenefits(filter: { kode?: string; jenis?: string } = {}): Promise<Benefit[]> {
  const where: string[] = []
  const params: unknown[] = []
  if (filter.kode) { params.push(filter.kode); where.push(`b.sasaran_kode = $${params.length}`) }
  if (filter.jenis) { params.push(filter.jenis); where.push(`b.jenis = $${params.length}`) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return query<Benefit>(`${SELECT} ${clause} ORDER BY s.urutan, b.urutan, b.id`, params)
}

export async function getBenefitsForSasaran(kode: string): Promise<Benefit[]> {
  return query<Benefit>(`${SELECT} WHERE b.sasaran_kode = $1 ORDER BY b.urutan, b.id`, [kode])
}

export interface BenefitStats {
  total: number
  reached: number
  measured: number
  programsWith: number
}
export async function getBenefitStats(): Promise<BenefitStats> {
  const [r] = await query<BenefitStats & Record<string, number>>(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE actual IS NOT NULL AND target IS NOT NULL AND
        ((arah='turun' AND actual <= target) OR (arah<>'turun' AND actual >= target)))::int AS reached,
      count(*) FILTER (WHERE actual IS NOT NULL)::int AS measured,
      count(DISTINCT sasaran_kode)::int AS "programsWith"
    FROM benefit
  `)
  return r
}

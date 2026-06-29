import { query } from './db'

export { ROADMAP_YEARS, MILESTONE_STATUS, msStatusBadge, msStatusDot, triwulanLabel } from './milestone-constants'

export interface Milestone {
  id: number
  sasaran_kode: string
  judul: string
  deskripsi: string | null
  tahun: number
  triwulan: number | null
  status: string
  progress: number
  behind: boolean
}

const SELECT = `
  SELECT id, sasaran_kode, judul, deskripsi, tahun, triwulan, status, progress,
    (status <> 'Done' AND (
       tahun < EXTRACT(YEAR FROM current_date)::int
       OR (tahun = EXTRACT(YEAR FROM current_date)::int AND triwulan IS NOT NULL AND triwulan < EXTRACT(QUARTER FROM current_date)::int)
    )) AS behind
  FROM milestone
`

export async function getMilestonesForSasaran(kode: string): Promise<Milestone[]> {
  return query<Milestone>(`${SELECT} WHERE sasaran_kode = $1 ORDER BY tahun, COALESCE(triwulan,0), urutan, id`, [kode])
}

export async function getAllMilestones(): Promise<Milestone[]> {
  return query<Milestone>(`${SELECT} ORDER BY sasaran_kode, tahun, COALESCE(triwulan,0), id`)
}

export interface MilestoneStats {
  total: number
  done: number
  inProgress: number
  behind: number
  programsWith: number
}
export async function getMilestoneStats(): Promise<MilestoneStats> {
  const [r] = await query<MilestoneStats & Record<string, number>>(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status='Done')::int AS done,
      count(*) FILTER (WHERE status='In Progress')::int AS "inProgress",
      count(*) FILTER (WHERE status<>'Done' AND (
        tahun < EXTRACT(YEAR FROM current_date)::int
        OR (tahun = EXTRACT(YEAR FROM current_date)::int AND triwulan IS NOT NULL AND triwulan < EXTRACT(QUARTER FROM current_date)::int)
      ))::int AS behind,
      count(DISTINCT sasaran_kode)::int AS "programsWith"
    FROM milestone
  `)
  return r
}

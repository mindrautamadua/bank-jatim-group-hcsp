import { query } from './db'

export interface Snapshot {
  id: number
  periode: string
  tanggal: string
  maturity_overall: number | null
  programs_total: number
  on_track: number
  delayed: number
  at_risk: number
  health_green: number
  health_yellow: number
  health_red: number
  avg_progress: number
  milestones_total: number
  milestones_done: number
  milestones_behind: number
  benefits_total: number
  benefits_reached: number
  actions_open: number
  actions_overdue: number
  created_by: string | null
}

export async function listSnapshots(): Promise<Snapshot[]> {
  return query<Snapshot>(`
    SELECT id, periode, to_char(tanggal,'YYYY-MM-DD') AS tanggal,
           maturity_overall::float8 AS maturity_overall,
           programs_total, on_track, delayed, at_risk,
           health_green, health_yellow, health_red, avg_progress,
           milestones_total, milestones_done, milestones_behind,
           benefits_total, benefits_reached, actions_open, actions_overdue, created_by
    FROM snapshot ORDER BY tanggal, id
  `)
}

// Maturity "saat ini" = rata-rata realisasi terbaru per domain (fallback baseline resmi 3.42).
export async function currentMaturity(): Promise<number> {
  const [r] = await query<{ m: number | null }>(`
    SELECT round(avg(latest)::numeric, 2)::float8 AS m FROM (
      SELECT (SELECT t.realisasi FROM maturity_target t WHERE t.domain_id = d.id AND t.realisasi IS NOT NULL ORDER BY t.tahun DESC LIMIT 1) AS latest
      FROM maturity_domain d
    ) x WHERE latest IS NOT NULL
  `)
  return r?.m ?? 3.42
}

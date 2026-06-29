'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getPerformanceOverview } from '@/lib/queries'
import { getMilestoneStats } from '@/lib/milestone'
import { getBenefitStats } from '@/lib/benefit'
import { getGovStats } from '@/lib/governance'
import { currentMaturity } from '@/lib/snapshot'

export interface SnapState { error?: string; ok?: boolean }

async function requireEditor() {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' as const }
  if (user.role !== 'pmo' && user.role !== 'admin') return { error: 'Hanya PMO/Administrator yang dapat mengambil snapshot.' as const }
  return { user }
}

export async function takeSnapshotAction(_prev: SnapState, fd: FormData): Promise<SnapState> {
  const g = await requireEditor(); if ('error' in g) return g

  const now = new Date()
  const auto = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
  const periode = String(fd.get('periode') ?? '').trim() || auto

  const [perf, ms, ben, gov, mat] = await Promise.all([
    getPerformanceOverview(), getMilestoneStats(), getBenefitStats(), getGovStats(), currentMaturity(),
  ])

  await query(
    `INSERT INTO snapshot (periode, maturity_overall, programs_total, on_track, delayed, at_risk,
       health_green, health_yellow, health_red, avg_progress,
       milestones_total, milestones_done, milestones_behind,
       benefits_total, benefits_reached, actions_open, actions_overdue, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [periode, mat, perf.total, perf.status.onTrack, perf.status.delayed, perf.status.atRisk,
     perf.health.green, perf.health.yellow, perf.health.red, perf.avgProgress,
     ms.total, ms.done, ms.behind, ben.total, ben.reached, gov.actionsOpen, gov.actionsOverdue, g.user.nama]
  )
  try { await query('INSERT INTO update_log (entitas, ref_kode, ringkasan, user_id, user_nama) VALUES ($1,$2,$3,$4,$5)', ['snapshot', null, `Snapshot ${periode}`, g.user.id, g.user.nama]) } catch { }
  revalidatePath('/trends')
  return { ok: true }
}

export async function deleteSnapshotAction(id: number): Promise<void> {
  const g = await requireEditor(); if ('error' in g) return
  await query('DELETE FROM snapshot WHERE id=$1', [id])
  revalidatePath('/trends')
}

// Konstanta milestone aman dipakai di client & server (tanpa import DB/pg).
export const ROADMAP_YEARS = [2026, 2027, 2028, 2029, 2030]
export const MILESTONE_STATUS = ['Planned', 'In Progress', 'Done', 'Delayed'] as const

export const msStatusBadge: Record<string, string> = {
  Planned: 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-amber-50 text-amber-700',
  Done: 'bg-bbgreen-light text-bbgreen-dark',
  Delayed: 'bg-red-50 text-red-700',
}
export const msStatusDot: Record<string, string> = {
  Planned: '#9aa8a3',
  'In Progress': 'var(--bb-amber)',
  Done: 'var(--bb-green)',
  Delayed: 'var(--bb-red)',
}
export const triwulanLabel = (t: number | null) => (t ? `Q${t}` : '')

// ── Komparasi jadwal vs progress (schedule variance) ────────────────────────
// Membandingkan progress aktual dengan progress yang DIHARAPKAN menurut tenggat
// rencana (tahun + triwulan). Murni — aman dipakai client & server.

export type VsJadwalTone = 'green' | 'red' | 'blue' | 'muted'
export interface VsJadwal {
  expected: number // progress yang diharapkan pada posisi waktu kini (0 atau 100)
  gap: number      // expected - aktual (>0 = tertinggal dari jadwal)
  state: 'done' | 'behind' | 'ahead' | 'ontrack'
  label: string
  tone: VsJadwalTone
}

// Tenggat dalam satuan kuartal. Triwulan kosong = akhir tahun (Q4).
function quarterIndex(tahun: number, triwulan: number | null): number {
  return tahun * 4 + (triwulan ?? 4)
}

export function vsJadwal(
  m: { tahun: number; triwulan: number | null; status: string; progress: number },
  now: Date
): VsJadwal {
  const due = quarterIndex(m.tahun, m.triwulan)
  const nowIdx = now.getFullYear() * 4 + (Math.floor(now.getMonth() / 3) + 1)
  const expected = nowIdx >= due ? 100 : 0
  const gap = expected - m.progress

  if (m.status === 'Done' || m.progress >= 100) {
    return { expected, gap: 0, state: 'done', label: 'Selesai', tone: 'green' }
  }
  if (m.status === 'Delayed' || (expected === 100 && gap > 0)) {
    const g = Math.max(0, gap)
    return { expected, gap, state: 'behind', label: g > 0 ? `Tertinggal ${g}% dari jadwal` : 'Terlambat', tone: 'red' }
  }
  if (expected === 0 && m.progress > 0) {
    return { expected, gap, state: 'ahead', label: `Lebih cepat (${m.progress}% sebelum jadwal)`, tone: 'blue' }
  }
  return { expected, gap: 0, state: 'ontrack', label: 'Sesuai jadwal', tone: 'muted' }
}

export const vsJadwalBadge: Record<VsJadwalTone, string> = {
  green: 'bg-bbgreen-light text-bbgreen-dark',
  red: 'bg-red-50 text-bbred',
  blue: 'bg-sky-50 text-sky-700',
  muted: 'bg-gray-100 text-gray-500',
}

// Turunkan status & health sebuah Sasaran Strategis dari overall progress
// (rata-rata progress terverifikasi seluruh Key Program-nya, 0..100).
// Satu sumber kebenaran ambang batas — dipakai saat persist (recompute) & backfill.
export type SasaranHealth = 'green' | 'yellow' | 'red' | 'grey'

export function deriveStatusHealth(progress: number): { status: string; health: SasaranHealth } {
  if (progress >= 100) return { status: 'Completed', health: 'green' }
  if (progress >= 75) return { status: 'On Track', health: 'green' }
  if (progress >= 40) return { status: 'At Risk', health: 'yellow' }
  if (progress >= 1) return { status: 'Delayed', health: 'red' }
  return { status: 'Not Started', health: 'grey' }
}

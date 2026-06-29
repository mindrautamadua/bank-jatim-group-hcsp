// Konstanta & helper benefit aman dipakai client & server (tanpa import DB/pg).
export const JENIS_BENEFIT = ['Output', 'Outcome', 'Business Impact'] as const
export const ARAH_BENEFIT = ['naik', 'turun'] as const

export const jenisBadge: Record<string, string> = {
  Output: 'bg-sky-50 text-sky-700',
  Outcome: 'bg-bbgreen-light text-bbgreen-dark',
  'Business Impact': 'bg-violet-50 text-violet-700',
}

export interface BenefitLike {
  baseline: number | null
  target: number | null
  actual: number | null
  arah: string
}

// % realisasi dari baseline menuju target (arah-aware). null bila data kurang.
export function realizationPct(b: BenefitLike): number | null {
  if (b.baseline === null || b.target === null || b.actual === null) return null
  const denom = b.arah === 'turun' ? b.baseline - b.target : b.target - b.baseline
  if (denom === 0) return reached(b) ? 100 : 0
  const num = b.arah === 'turun' ? b.baseline - b.actual : b.actual - b.baseline
  return Math.max(0, Math.round((num / denom) * 100))
}

export function reached(b: BenefitLike): boolean {
  if (b.target === null || b.actual === null) return false
  return b.arah === 'turun' ? b.actual <= b.target : b.actual >= b.target
}

export type BenefitTone = 'green' | 'amber' | 'red' | 'neutral'
export function benefitStatus(b: BenefitLike): { label: string; tone: BenefitTone } {
  if (b.actual === null) return { label: 'Belum diukur', tone: 'neutral' }
  if (reached(b)) return { label: 'Tercapai', tone: 'green' }
  const p = realizationPct(b)
  if (p === null) return { label: 'Belum diukur', tone: 'neutral' }
  if (p >= 70) return { label: 'On Track', tone: 'amber' }
  return { label: 'Berisiko', tone: 'red' }
}

export const benefitToneText: Record<BenefitTone, string> = {
  green: 'text-bbgreen-dark', amber: 'text-bbamber', red: 'text-bbred', neutral: 'text-bbmuted',
}
export const benefitToneBadge: Record<BenefitTone, string> = {
  green: 'bg-bbgreen-light text-bbgreen-dark', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', neutral: 'bg-gray-100 text-gray-600',
}

export function fmtVal(v: number | null, satuan?: string | null): string {
  if (v === null || v === undefined) return '-'
  const n = Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 })
  if (!satuan) return n
  if (satuan === '%') return `${n}%`
  if (satuan.startsWith('Rp')) return `Rp${n}`
  return `${n} ${satuan}`
}

// Helper anggaran aman dipakai client & server (tanpa import DB/pg).
export function serapan(rencana: number | null, realisasi: number | null): number | null {
  if (!rencana || rencana === 0 || realisasi === null) return null
  return Math.round((realisasi / rencana) * 100)
}
export function fmtRp(v: number | null): string {
  if (v === null || v === undefined) return '-'
  return `Rp${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Jt`
}
export function serapanTone(s: number | null): 'green' | 'amber' | 'red' | 'neutral' {
  if (s === null) return 'neutral'
  if (s >= 90 && s <= 105) return 'green'
  if (s >= 70) return 'amber'
  return 'red'
}

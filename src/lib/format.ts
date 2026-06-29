import type { Health, Frekuensi } from './types'

export const YEARS = [2026, 2027, 2028, 2029, 2030]

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return '-'
  const n = Number(v)
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

export function fmtTarget(v: number | null | undefined, satuan?: string | null): string {
  if (v === null || v === undefined) return '-'
  const n = Number(v)
  if (satuan === '%' || satuan === '% dari target') return `${fmtNum(n, 2)}%`
  if (satuan === 'Kali') return `${fmtNum(n, 2)}×`
  if (satuan?.startsWith('Rp')) return `Rp${fmtNum(n, 2)}`
  return fmtNum(n, 2)
}

export const healthColor: Record<Health, string> = {
  green: 'var(--bb-green)',
  yellow: 'var(--bb-gold)',
  red: 'var(--bb-red)',
  grey: '#9aa8a3',
}

export const statusBadge: Record<string, string> = {
  'On Track': 'bg-bbgreen-light text-bbgreen-dark',
  'Completed': 'bg-emerald-100 text-emerald-800',
  'At Risk': 'bg-amber-50 text-amber-700',
  'Delayed': 'bg-red-50 text-red-700',
  'Not Started': 'bg-gray-100 text-gray-600',
}

// Sifat input / frekuensi pelaporan IK
export const frekuensiLabel: Record<Frekuensi, string> = {
  bulanan: 'Bulanan',
  triwulanan: 'Triwulanan',
  semesteran: 'Semesteran',
  tahunan: 'Tahunan',
}

export const frekuensiBadge: Record<Frekuensi, string> = {
  bulanan: 'bg-sky-50 text-sky-700',
  triwulanan: 'bg-violet-50 text-violet-700',
  semesteran: 'bg-amber-50 text-amber-700',
  tahunan: 'bg-bbgreen-light text-bbgreen-dark',
}

export const clusterLabel: Record<string, string> = {
  Strategic: 'HCM Strategic',
  Services: 'HCM Services',
  HCIS: 'HCM Information System',
}

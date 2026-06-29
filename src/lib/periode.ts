import type { Frekuensi } from './types'

export interface PeriodeDef {
  key: string // M1.. | Q1.. | S1.. | Y
  label: string // Jan, Tw I, Sem I, Tahunan
}

export const FREKUENSI_OPSI: { value: Frekuensi; label: string }[] = [
  { value: 'bulanan', label: 'Bulanan' },
  { value: 'triwulanan', label: 'Triwulanan' },
  { value: 'semesteran', label: 'Semesteran' },
  { value: 'tahunan', label: 'Tahunan' },
]

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const ROMAWI = ['I', 'II', 'III', 'IV']

export const PERIODE: Record<Frekuensi, PeriodeDef[]> = {
  bulanan: BULAN.map((b, i) => ({ key: `M${i + 1}`, label: b })),
  triwulanan: [1, 2, 3, 4].map((n) => ({ key: `Q${n}`, label: `Tw ${ROMAWI[n - 1]}` })),
  semesteran: [1, 2].map((n) => ({ key: `S${n}`, label: `Sem ${ROMAWI[n - 1]}` })),
  tahunan: [{ key: 'Y', label: 'Tahunan' }],
}

export function periodeUntuk(frekuensi: Frekuensi): PeriodeDef[] {
  return PERIODE[frekuensi] ?? PERIODE.tahunan
}

export function isValidFrekuensi(v: string): v is Frekuensi {
  return v === 'bulanan' || v === 'triwulanan' || v === 'semesteran' || v === 'tahunan'
}

// Semua kunci periode yang sah (lintas frekuensi) - dipakai untuk validasi input.
export const SEMUA_PERIODE: ReadonlySet<string> = new Set(
  Object.values(PERIODE).flat().map((p) => p.key)
)

export function frekuensiLabel(v: string): string {
  return FREKUENSI_OPSI.find((f) => f.value === v)?.label ?? 'Tahunan'
}

export function periodeLabel(key: string): string {
  for (const list of Object.values(PERIODE)) {
    const found = list.find((p) => p.key === key)
    if (found) return found.label
  }
  return key
}

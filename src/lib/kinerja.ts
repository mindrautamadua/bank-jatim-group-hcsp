import type { Frekuensi, Health } from './types'
import { periodeUntuk } from './periode'

// ── Auto-kalkulasi kinerja sasaran dari realisasi IK ────────────────────────
// Dipakai bersama oleh form (preview live) dan server action (sumber kebenaran).

// Ambang health berbasis rata-rata capaian (% realisasi terhadap target).
// Hijau ≥ 90%, Kuning ≥ 70%, selain itu Merah.
export const AMBANG_HEALTH = { hijau: 90, kuning: 70 } as const

// Batas atas capaian agar over-achiever tidak menarik rata-rata terlalu jauh.
const CAPAIAN_MAKS = 150

// Capaian satu IK = % realisasi terhadap target, sadar-arah.
//   arah 'turun' (makin rendah makin baik) → target / realisasi
//   selain itu (makin tinggi makin baik)   → realisasi / target
// Mengembalikan null bila data tak cukup. Nilai dibatasi 0..CAPAIAN_MAKS.
export function capaianIK(realisasi: number | null, target: number | null, arah: string): number | null {
  if (realisasi === null || target === null) return null
  let pct: number
  if (arah === 'turun') {
    if (realisasi <= 0) pct = target <= 0 ? 100 : CAPAIAN_MAKS
    else pct = (target / realisasi) * 100
  } else {
    if (target === 0) pct = realisasi <= 0 ? 100 : CAPAIAN_MAKS
    else pct = (realisasi / target) * 100
  }
  return Math.min(CAPAIAN_MAKS, Math.max(0, pct))
}

export function deriveHealth(rataCapaian: number): Health {
  if (rataCapaian >= AMBANG_HEALTH.hijau) return 'green'
  if (rataCapaian >= AMBANG_HEALTH.kuning) return 'yellow'
  return 'red'
}

export interface KinerjaItem {
  realisasi: number | null
  target: number | null
  arah: string
}

export interface KinerjaHasil {
  adaData: boolean // true bila minimal satu IK punya realisasi & target
  progress: number // 0..100 (rata-rata capaian, dibulatkan & dibatasi)
  health: Health
  rataCapaian: number | null
  capaian: (number | null)[] // capaian per IK, selaras urutan input
}

// Agregat capaian seluruh IK → progress (rata-rata, dibatasi 0..100) + health.
export function hitungKinerja(items: KinerjaItem[]): KinerjaHasil {
  const capaian = items.map((it) => capaianIK(it.realisasi, it.target, it.arah))
  const valid = capaian.filter((c): c is number => c !== null)
  if (valid.length === 0) {
    return { adaData: false, progress: 0, health: 'yellow', rataCapaian: null, capaian }
  }
  const rata = valid.reduce((a, b) => a + b, 0) / valid.length
  return {
    adaData: true,
    progress: Math.min(100, Math.max(0, Math.round(rata))),
    health: deriveHealth(rata),
    rataCapaian: rata,
    capaian,
  }
}

// ── Guardrail jadwal (Opsi 2): milestone terlambat menurunkan health ────────
// Capaian KPI saja bisa menyembunyikan risiko eksekusi: program "hijau" padahal
// banyak deliverable telat. Health diturunkan berbasis milestone yang behind.
// Proporsi milestone terlambat yang memaksa health menjadi Merah.
export const AMBANG_BEHIND_MERAH = 0.4

// Turunkan health menurut jadwal: ada telat → maksimal Kuning; telat ≥ 40% → Merah.
// Progress tidak diubah. Tidak berlaku bila tak ada milestone.
export function terapkanGuardrailJadwal(health: Health, behind: number, totalMilestone: number): Health {
  if (behind <= 0 || totalMilestone <= 0) return health
  if (behind / totalMilestone >= AMBANG_BEHIND_MERAH) return 'red'
  return health === 'green' ? 'yellow' : health
}

// Realisasi tahunan = nilai periode terisi TERAKHIR (YTD) untuk frekuensi aktif.
// Selaras dengan rollup di DB (rollupIKRealisasiTahunan).
export function realisasiTahunanDari(frek: Frekuensi, getNilai: (key: string) => number | null): number | null {
  let last: number | null = null
  for (const p of periodeUntuk(frek)) {
    const n = getNilai(p.key)
    if (n !== null) last = n
  }
  return last
}

// Konstanta & helper Gantt — aman dipakai client & server (tanpa import DB/pg).

export const GANTT_MIN = 2026
export const GANTT_MAX = 2030
export const GANTT_YEARS = [2026, 2027, 2028, 2029, 2030]
const SPAN = GANTT_MAX - GANTT_MIN + 1 // jumlah tahun (lebar skala)

export interface Span { start: number; end: number }

// Ambil rentang tahun dari teks "Waktu Pelaksanaan" blueprint.
// Contoh: "2026" -> {2026,2026}; "2027 – 2030, minimal 1 kali setahun" -> {2027,2030}.
// Bila tak ada tahun terdeteksi, default ke seluruh horizon 2026-2030.
export function parseWaktuSpan(waktu: string | null | undefined): Span {
  const found = (waktu ?? '').match(/20\d{2}/g)?.map(Number).filter((y) => y >= 2024 && y <= 2031) ?? []
  if (!found.length) return { start: GANTT_MIN, end: GANTT_MAX }
  const clamp = (y: number) => Math.max(GANTT_MIN, Math.min(GANTT_MAX, y))
  const start = clamp(Math.min(...found))
  const end = Math.max(start, clamp(Math.max(...found)))
  return { start, end }
}

// Posisi bar dalam persen (left & width) pada skala 2026..2030 (akhir tahun inklusif).
export function barPos(span: Span): { left: number; width: number } {
  const left = ((span.start - GANTT_MIN) / SPAN) * 100
  const width = ((span.end - span.start + 1) / SPAN) * 100
  return { left, width: Math.max(width, 100 / SPAN / 2) }
}

// Posisi penanda "hari ini" dalam persen pada skala yang sama.
export function nowPos(now: Date): number | null {
  const y = now.getFullYear() + now.getMonth() / 12
  if (y < GANTT_MIN || y > GANTT_MAX + 1) return null
  return ((y - GANTT_MIN) / SPAN) * 100
}

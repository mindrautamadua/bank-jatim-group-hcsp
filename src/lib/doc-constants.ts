// Konstanta dokumen yang aman dipakai di client & server (tanpa import DB/pg).
export const JENIS_DOKUMEN = ['TOR', 'Perdir/SK', 'SOP', 'Business Case', 'MoM', 'Laporan', 'Bukti Realisasi', 'Lainnya'] as const
export const MAX_DOC_BYTES = 15 * 1024 * 1024 // 15 MB

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// Keamanan unggah: whitelist tipe berkas. SVG & HTML SENGAJA tidak diizinkan
// (vektor stored-XSS bila disajikan inline dari origin aplikasi).
export const ALLOWED_DOC_MIME: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
])
export const ALLOWED_DOC_EXT = /\.(pdf|png|jpe?g|gif|webp|docx?|xlsx?|pptx?|txt|csv)$/i

// Hanya tipe ini yang boleh dibuka inline (di-render) di browser. Sisanya dipaksa unduh.
export const SAFE_INLINE_MIME: ReadonlySet<string> = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
])

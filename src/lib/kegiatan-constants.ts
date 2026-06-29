// Konstanta & helper kegiatan utama — aman dipakai client & server (tanpa import DB/pg).

// Status kegiatan (state machine sederhana mengikuti laporan terakhir).
export const KEGIATAN_STATUS = ['Belum Dikerjakan', 'Diajukan', 'Diverifikasi', 'Dikembalikan'] as const
export type KegiatanStatus = (typeof KEGIATAN_STATUS)[number]

export const kegiatanStatusBadge: Record<string, string> = {
  'Belum Dikerjakan': 'bg-gray-100 text-gray-600',
  Diajukan: 'bg-amber-50 text-amber-700',
  Diverifikasi: 'bg-bbgreen-light text-bbgreen-dark',
  Dikembalikan: 'bg-red-50 text-bbred',
}
export const kegiatanStatusDot: Record<string, string> = {
  'Belum Dikerjakan': '#9aa8a3',
  Diajukan: 'var(--bb-amber)',
  Diverifikasi: 'var(--bb-green)',
  Dikembalikan: 'var(--bb-red)',
}

// Status sebuah laporan saat diverifikasi.
export const LAPORAN_STATUS = ['Diajukan', 'Diverifikasi', 'Dikembalikan'] as const
export type LaporanStatus = (typeof LAPORAN_STATUS)[number]

// Unit/divisi terlibat (selaras sasaran_pic.unit). Dipakai sebagai pilihan unit
// pengguna di admin & untuk memetakan peran Utama/Pendukung per program.
export const UNITS = [
  'Divisi Sumber Daya Manusia',
  'Bagian Pengembangan dan Manajemen Kinerja',
  'Bagian Pelatihan dan Budaya Kerja',
  'Bagian Remunerasi dan SIM SDM',
  'Divisi Perencanaan Strategis',
  'Divisi Teknologi Informasi',
  'Divisi Pengembangan Digital',
  'Divisi Operasional, Keuangan dan Akuntansi',
] as const

// Batas ukuran & tipe evidence yang diterima.
export const EVIDENCE_MAX_BYTES = 15 * 1024 * 1024 // 15 MB
export const EVIDENCE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip'

// Peran pengguna pada sebuah program berdasarkan unit vs daftar PIC.
export type Peran = 'utama' | 'pendukung' | null
export function peranOf(
  userUnit: string | null | undefined,
  pic: { peran: string; unit: string }[]
): Peran {
  if (!userUnit) return null
  const u = userUnit.trim()
  if (pic.some((p) => p.peran === 'Utama' && p.unit === u)) return 'utama'
  if (pic.some((p) => p.peran === 'Pendukung' && p.unit === u)) return 'pendukung'
  return null
}

// PIC (Utama/Pendukung) adalah PIMPINAN divisi/bagian: hanya akun pimpinan unit
// terkait (atau admin) yang boleh beraksi. Anggota unit lain tidak.

// Pendukung-pimpinan (atau admin) boleh mengajukan laporan. Utama tidak mengajukan
// (memverifikasi) agar pemisahan tugas terjaga.
export function canSubmit(peran: Peran, isAdmin: boolean, isPimpinan: boolean): boolean {
  return isAdmin || (isPimpinan && peran === 'pendukung')
}

// Siapa yang boleh meng-update sebuah Key Program: bila admin sudah menetapkan
// pendukung_unit pada Key Program itu, hanya pimpinan unit tsb (atau admin);
// bila belum ditetapkan, fallback ke pimpinan unit Pendukung level Sasaran.
export function canSubmitKegiatan(
  userUnit: string | null | undefined,
  pendukungUnit: string | null | undefined,
  peran: Peran,
  isAdmin: boolean,
  isPimpinan: boolean
): boolean {
  if (isAdmin) return true
  if (!isPimpinan) return false
  if (pendukungUnit) return !!userUnit && userUnit.trim() === pendukungUnit.trim()
  return peran === 'pendukung'
}
// Utama-pimpinan (atau admin) boleh memverifikasi.
export function canVerify(peran: Peran, isAdmin: boolean, isPimpinan: boolean): boolean {
  return isAdmin || (isPimpinan && peran === 'utama')
}

// Siapa yang boleh mengunduh evidence sebuah program: peran pengawas lintas program
// (admin/PMO/BOD) atau PIC (Utama/Pendukung) program tersebut. Mencegah pengguna
// non-PIC (mis. viewer) mengunduh evidence sembarang program lewat tebak-tebak id.
export function canViewEvidence(role: string | null | undefined, peran: Peran): boolean {
  return role === 'admin' || role === 'pmo' || role === 'bod' || peran !== null
}

export function fmtBytes(n: number): string {
  if (!n) return '0 B'
  const k = 1024, u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(k)))
  return `${(n / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

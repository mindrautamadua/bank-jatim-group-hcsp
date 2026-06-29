// Konstanta peran aman dipakai client & server (tanpa import DB/pg).
// Catatan: key 'viewer' dipertahankan (dipakai DB & logika otorisasi); label
// tampilannya adalah "Penanggung Jawab" karena peran ini mengajukan/menyetujui
// laporan kegiatan, bukan sekadar melihat.
export const ROLES = ['admin', 'pmo', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  pmo: 'PMO',
  viewer: 'Penanggung Jawab',
}
export const roleBadge: Record<string, string> = {
  admin: 'bg-violet-50 text-violet-700',
  pmo: 'bg-bbgreen-light text-bbgreen-dark',
  viewer: 'bg-amber-50 text-amber-700',
}

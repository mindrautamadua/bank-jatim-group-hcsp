// Definisi peran pengguna HCSP. Satu sumber kebenaran untuk otorisasi & label.
// Modul murni (tanpa 'server-only') agar bisa dipakai komponen client & server.

export type AppRole = 'admin' | 'pmo' | 'bod' | 'viewer'

// Peran yang boleh mengubah data eksekusi PMO (realisasi IK, progress key program,
// maturity). Direksi (BOD) hanya melihat. Penanggung Jawab (key 'viewer') tidak
// mengubah data PMO, tetapi tetap mengajukan/menyetujui laporan kegiatan via alur PIC.
const EDITOR_ROLES: ReadonlySet<string> = new Set<AppRole>(['admin', 'pmo'])

export function isEditor(role: string | null | undefined): boolean {
  return role != null && EDITOR_ROLES.has(role)
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  pmo: 'PMO Human Capital',
  bod: 'Direksi (BOD)',
  viewer: 'Penanggung Jawab',
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—'
  return ROLE_LABEL[role] ?? role
}

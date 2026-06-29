import 'server-only'
import { query } from './db'

export interface Kegiatan {
  id: number
  sasaran_kode: string
  urutan: number
  program: string
  status: string
  progress: number
  pendukung_unit: string | null // unit Pendukung yang ditetapkan admin (null = ikut Sasaran)
}

// Semua kegiatan utama (Key Program) sebuah program. Progress & status diturunkan
// dari pengajuan progress rincian (lihat kegiatan-rincian.ts).
export async function getKegiatanForSasaran(kode: string): Promise<Kegiatan[]> {
  return query<Kegiatan>(
    `SELECT id, sasaran_kode, urutan, program, status, progress, pendukung_unit
     FROM kegiatan WHERE sasaran_kode = $1 ORDER BY urutan`,
    [kode]
  )
}

export async function getKegiatanById(id: number): Promise<Kegiatan | null> {
  const rows = await query<Kegiatan>(
    `SELECT id, sasaran_kode, urutan, program, status, progress, pendukung_unit FROM kegiatan WHERE id = $1`,
    [id]
  )
  return rows[0] ?? null
}

// Admin menetapkan/menghapus unit Pendukung sebuah Key Program (null = ikut Sasaran).
export async function setKegiatanPendukung(kegiatanId: number, unit: string | null): Promise<void> {
  await query('UPDATE kegiatan SET pendukung_unit = $2, updated_at = now() WHERE id = $1', [kegiatanId, unit])
}

// PIC (peran + unit) program berdasarkan kode sasaran.
export async function getPicForKode(kode: string): Promise<{ peran: string; unit: string }[]> {
  return query<{ peran: string; unit: string }>(
    `SELECT p.peran, p.unit FROM sasaran_pic p
     JOIN sasaran_strategis s ON s.id = p.sasaran_id
     WHERE s.kode = $1 ORDER BY p.urutan`,
    [kode]
  )
}

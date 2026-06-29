import 'server-only'
import { query } from './db'
import { logUpdate } from './queries'
import type { LaporanStatus } from './kegiatan-constants'

// Progress per item Kegiatan Utama (rincian) sebuah Key Program.
// Pendukung mengajukan, Utama memverifikasi. Progress Key Program (kegiatan.progress)
// = rata-rata progress rincian yang Diverifikasi (dihitung ulang tiap ajukan/verifikasi).
// Catatan: rincian hanya melaporkan progress (tanpa evidence); upload evidence ada
// di level Key Program (lihat HasilEvidencePanel).

export interface RincianProgress {
  id: number
  kegiatan_id: number
  rincian_index: number
  progress: number
  catatan: string | null
  status: LaporanStatus
  diajukan_user_id: number | null
  diajukan_nama: string | null
  diajukan_unit: string | null
  diajukan_at: string
  verifikasi_nama: string | null
  verifikasi_at: string | null
  verifikasi_catatan: string | null
}

const COLS = `rp.id, rp.kegiatan_id, rp.rincian_index, rp.progress, rp.catatan,
       rp.status, rp.diajukan_user_id, rp.diajukan_nama, rp.diajukan_unit, rp.diajukan_at,
       rp.verifikasi_nama, rp.verifikasi_at, rp.verifikasi_catatan`

// Semua pengajuan progress rincian + kode sasaran (untuk Gantt; satu query, terbaru dulu).
export async function getAllRincianProgress(): Promise<(RincianProgress & { sasaran_kode: string })[]> {
  return query<RincianProgress & { sasaran_kode: string }>(
    `SELECT ${COLS}, k.sasaran_kode FROM kegiatan_rincian_progress rp
     JOIN kegiatan k ON k.id = rp.kegiatan_id
     ORDER BY rp.diajukan_at DESC, rp.id DESC`
  )
}

// Pengajuan progress rincian untuk satu sasaran saja (terbaru dulu).
export async function getRincianProgressForSasaran(kode: string): Promise<RincianProgress[]> {
  return query<RincianProgress>(
    `SELECT ${COLS} FROM kegiatan_rincian_progress rp
     JOIN kegiatan k ON k.id = rp.kegiatan_id
     WHERE k.sasaran_kode = $1
     ORDER BY rp.diajukan_at DESC, rp.id DESC`,
    [kode]
  )
}

// kode sasaran sebuah baris progress (untuk otorisasi verifikasi).
export async function getRincianProgressOwner(
  id: number
): Promise<{ kode: string; kegiatan_id: number; rincian_index: number } | null> {
  const rows = await query<{ kode: string; kegiatan_id: number; rincian_index: number }>(
    `SELECT k.sasaran_kode AS kode, rp.kegiatan_id, rp.rincian_index
     FROM kegiatan_rincian_progress rp JOIN kegiatan k ON k.id = rp.kegiatan_id
     WHERE rp.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

interface SubmitArgs {
  kegiatanId: number
  kode: string
  rincianIndex: number
  rincianTeks: string
  progress: number
  catatan: string | null
  user: { id: number; nama: string; unit: string | null }
}

export async function submitRincianProgress(a: SubmitArgs, rincianCount: number): Promise<void> {
  await query(
    `INSERT INTO kegiatan_rincian_progress
       (kegiatan_id, rincian_index, rincian_teks, progress, catatan,
        diajukan_user_id, diajukan_nama, diajukan_unit, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Diajukan')`,
    [a.kegiatanId, a.rincianIndex, a.rincianTeks, a.progress, a.catatan,
      a.user.id, a.user.nama, a.user.unit]
  )
  await recomputeKegiatanProgress(a.kegiatanId, rincianCount)
  await logUpdate({
    entitas: 'kegiatan', ref_kode: a.kode,
    ringkasan: `Progress kegiatan utama diajukan (${a.progress}%) — ${a.rincianTeks.slice(0, 60)}`,
    user_id: a.user.id, user_nama: a.user.nama,
  })
}

export async function verifyRincianProgress(a: {
  id: number
  kegiatanId: number
  kode: string
  keputusan: 'Diverifikasi' | 'Dikembalikan'
  catatan: string | null
  user: { id: number; nama: string }
}, rincianCount: number): Promise<void> {
  await query(
    `UPDATE kegiatan_rincian_progress
       SET status=$2, verifikasi_user_id=$3, verifikasi_nama=$4, verifikasi_at=now(), verifikasi_catatan=$5
     WHERE id=$1`,
    [a.id, a.keputusan, a.user.id, a.user.nama, a.catatan]
  )
  await recomputeKegiatanProgress(a.kegiatanId, rincianCount)
  await logUpdate({
    entitas: 'kegiatan', ref_kode: a.kode,
    ringkasan: `Progress kegiatan utama ${a.keputusan.toLowerCase()} oleh ${a.user.nama}`,
    user_id: a.user.id, user_nama: a.user.nama,
  })
}

// Reset: hapus SELURUH pengajuan progress (semua status, termasuk Diverifikasi)
// untuk satu Kegiatan Utama (rincian) sebuah Key Program. Mengembalikan jumlah baris
// terhapus. Pemanggil wajib recomputeKegiatanProgress + recomputeSasaranStatus setelahnya.
export async function resetRincianProgressItem(kegiatanId: number, rincianIndex: number): Promise<number> {
  const rows = await query<{ id: number }>(
    `DELETE FROM kegiatan_rincian_progress WHERE kegiatan_id = $1 AND rincian_index = $2 RETURNING id`,
    [kegiatanId, rincianIndex]
  )
  return rows.length
}

// Hitung ulang kegiatan.progress (rata-rata progress rincian terverifikasi atas
// total rincian) & kegiatan.status (dari kondisi pengajuan terkini per rincian).
export async function recomputeKegiatanProgress(kegiatanId: number, rincianCount: number): Promise<void> {
  const rows = await query<{ rincian_index: number; status: LaporanStatus; progress: number }>(
    `SELECT rincian_index, status, progress FROM kegiatan_rincian_progress
     WHERE kegiatan_id = $1 ORDER BY rincian_index, diajukan_at DESC, id DESC`,
    [kegiatanId]
  )
  // Baris terkini & progress terverifikasi terakhir per rincian.
  const latest = new Map<number, LaporanStatus>()
  const verified = new Map<number, number>()
  for (const r of rows) {
    if (!latest.has(r.rincian_index)) latest.set(r.rincian_index, r.status)
    if (r.status === 'Diverifikasi' && !verified.has(r.rincian_index)) verified.set(r.rincian_index, r.progress)
  }
  const denom = rincianCount > 0 ? rincianCount : latest.size
  const sum = [...verified.values()].reduce((a, b) => a + b, 0)
  const progress = denom > 0 ? Math.round(sum / denom) : 0

  const statuses = [...latest.values()]
  let status = 'Belum Dikerjakan'
  if (statuses.includes('Diajukan')) status = 'Diajukan'
  else if (statuses.includes('Dikembalikan')) status = 'Dikembalikan'
  else if (verified.size > 0) status = 'Diverifikasi'

  await query('UPDATE kegiatan SET progress=$2, status=$3, updated_at=now() WHERE id=$1', [kegiatanId, progress, status])
}

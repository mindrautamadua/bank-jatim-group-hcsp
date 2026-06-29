import 'server-only'
import { query } from './db'
import { logUpdate } from './queries'
import type { LaporanStatus } from './kegiatan-constants'

// Evidence per item Hasil Pelaksanaan sebuah Key Program (kegiatan).
// Pendukung mengunggah (boleh banyak file/riwayat), Utama memverifikasi.

export interface HasilEvidence {
  id: number
  kegiatan_id: number
  hasil_index: number
  catatan: string | null
  evidence_nama: string
  evidence_mime: string | null
  evidence_size: number
  diupload_user_id: number | null
  diupload_nama: string | null
  diupload_unit: string | null
  diupload_at: string
  status: LaporanStatus
  verifikasi_nama: string | null
  verifikasi_at: string | null
  verifikasi_catatan: string | null
}

const EVIDENCE_COLS = `he.id, he.kegiatan_id, he.hasil_index, he.catatan,
       he.evidence_nama, he.evidence_mime, he.evidence_size::int AS evidence_size,
       he.diupload_user_id, he.diupload_nama, he.diupload_unit, he.diupload_at,
       he.status, he.verifikasi_nama, he.verifikasi_at, he.verifikasi_catatan`

// Semua evidence hasil pelaksanaan untuk satu sasaran (semua kegiatan-nya), terbaru dulu.
export async function getHasilEvidenceForSasaran(kode: string): Promise<HasilEvidence[]> {
  return query<HasilEvidence>(
    `SELECT ${EVIDENCE_COLS} FROM kegiatan_hasil_evidence he
     JOIN kegiatan k ON k.id = he.kegiatan_id
     WHERE k.sasaran_kode = $1 ORDER BY he.diupload_at DESC`,
    [kode]
  )
}

// Semua evidence hasil pelaksanaan + kode sasaran-nya (untuk Gantt; satu query).
export async function getAllHasilEvidence(): Promise<(HasilEvidence & { sasaran_kode: string })[]> {
  return query<HasilEvidence & { sasaran_kode: string }>(
    `SELECT ${EVIDENCE_COLS}, k.sasaran_kode FROM kegiatan_hasil_evidence he
     JOIN kegiatan k ON k.id = he.kegiatan_id
     ORDER BY he.diupload_at DESC`
  )
}

export async function getHasilEvidenceById(
  id: number
): Promise<{ kode: string; key: string; nama: string; mime: string | null } | null> {
  const rows = await query<{ kode: string; key: string; nama: string; mime: string | null }>(
    `SELECT k.sasaran_kode AS kode, he.evidence_key AS key, he.evidence_nama AS nama, he.evidence_mime AS mime
     FROM kegiatan_hasil_evidence he JOIN kegiatan k ON k.id = he.kegiatan_id
     WHERE he.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

// Cek pemilik + kode sasaran sebuah evidence (untuk otorisasi hapus/verifikasi).
export async function getHasilEvidenceOwner(
  id: number
): Promise<{ kode: string; diupload_user_id: number | null; evidence_key: string } | null> {
  const rows = await query<{ kode: string; diupload_user_id: number | null; evidence_key: string }>(
    `SELECT k.sasaran_kode AS kode, he.diupload_user_id, he.evidence_key
     FROM kegiatan_hasil_evidence he JOIN kegiatan k ON k.id = he.kegiatan_id
     WHERE he.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

interface InsertHasilEvidenceArgs {
  kegiatanId: number
  kode: string
  hasilIndex: number
  hasilTeks: string
  catatan: string | null
  evidence: { key: string; nama: string; mime: string; size: number }
  user: { id: number; nama: string; unit: string | null }
}

export async function insertHasilEvidence(a: InsertHasilEvidenceArgs): Promise<void> {
  await query(
    `INSERT INTO kegiatan_hasil_evidence
       (kegiatan_id, hasil_index, hasil_teks, catatan,
        evidence_key, evidence_nama, evidence_mime, evidence_size,
        diupload_user_id, diupload_nama, diupload_unit, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Diajukan')`,
    [a.kegiatanId, a.hasilIndex, a.hasilTeks, a.catatan,
      a.evidence.key, a.evidence.nama, a.evidence.mime, a.evidence.size,
      a.user.id, a.user.nama, a.user.unit]
  )
  await logUpdate({
    entitas: 'kegiatan', ref_kode: a.kode,
    ringkasan: `Evidence hasil pelaksanaan diunggah — ${a.evidence.nama}`,
    user_id: a.user.id, user_nama: a.user.nama,
  })
}

export async function verifyHasilEvidence(a: {
  id: number
  kode: string
  keputusan: 'Diverifikasi' | 'Dikembalikan'
  catatan: string | null
  user: { id: number; nama: string }
}): Promise<void> {
  await query(
    `UPDATE kegiatan_hasil_evidence
       SET status=$2, verifikasi_user_id=$3, verifikasi_nama=$4, verifikasi_at=now(), verifikasi_catatan=$5
     WHERE id=$1`,
    [a.id, a.keputusan, a.user.id, a.user.nama, a.catatan]
  )
  await logUpdate({
    entitas: 'kegiatan', ref_kode: a.kode,
    ringkasan: `Evidence hasil pelaksanaan ${a.keputusan.toLowerCase()} oleh ${a.user.nama}`,
    user_id: a.user.id, user_nama: a.user.nama,
  })
}

export async function deleteHasilEvidence(id: number): Promise<void> {
  await query(`DELETE FROM kegiatan_hasil_evidence WHERE id=$1`, [id])
}

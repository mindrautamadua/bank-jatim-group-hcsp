import 'server-only'
import { query } from './db'
import { getAllSasaran } from './queries'
import { getProgramDetailMap } from './program-detail'
import { parseWaktuSpan } from './gantt-constants'
import { getSession } from './auth'
import { peranOf, canSubmitKegiatan, canVerify as canVerifyFn } from './kegiatan-constants'
import { getAllHasilEvidence, type HasilEvidence } from './kegiatan-hasil'
import { getAllRincianProgress, type RincianProgress } from './kegiatan-rincian'

export interface GanttHasil {
  index: number
  teks: string
  evidence: HasilEvidence[]   // terbaru dulu
}

export interface GanttRincian {
  index: number
  teks: string                // Kegiatan Utama (langkah a, b, c, …) dari blueprint
  progress: number            // progress terverifikasi terakhir (untuk batang & agregat)
  status: string | null       // status pengajuan terkini ('Diajukan'|'Diverifikasi'|'Dikembalikan') atau null
  history: RincianProgress[]  // riwayat pengajuan, terbaru dulu
}

export interface GanttKegiatan {
  id: number
  urutan: number
  program: string
  status: string
  progress: number
  start: number
  end: number
  pendukungUnit: string | null // unit Pendukung khusus yang ditetapkan admin (null = ikut Sasaran)
  pendukungUnits: string[]     // Pendukung efektif untuk ditampilkan (khusus KP, atau fallback Sasaran)
  canSubmit: boolean           // user boleh meng-update Key Program ini (per-Key Program)
  rincian: GanttRincian[] // Kegiatan Utama + progress (ajukan Pendukung, verifikasi Utama)
  hasil: GanttHasil[]     // Hasil Pelaksanaan + evidence per item
}

export interface GanttProgram {
  kode: string
  nama: string
  perspektif_kode: string
  perspektif_nama: string
  perspektif_warna: string
  progress: number          // progress tersimpan (dari realisasi IK / PMO)
  health: string
  status: string
  start: number
  end: number
  kegiatan: GanttKegiatan[]
  kegiatanTotal: number
  kegiatanVerified: number
  overallProgress: number   // rata-rata progress terverifikasi key program → isian batang program
  utamaUnits: string[]      // Penanggung Jawab Utama sasaran (level Sasaran)
  canVerify: boolean        // user (Utama/admin) boleh verifikasi (level Sasaran)
}

// Data Gantt: program (sasaran) + kegiatan utamanya. Rentang waktu kegiatan
// diturunkan dari teks "Waktu Pelaksanaan" blueprint; status & progress dari DB.
// Tiap kegiatan membawa item Hasil Pelaksanaan + evidence (unggah Pendukung,
// verifikasi Utama) agar bisa dikelola langsung di halaman Gantt.
export async function getGanttData(): Promise<GanttProgram[]> {
  const [sasaran, kegRows, picRows, evRows, rpRows, user] = await Promise.all([
    getAllSasaran(),
    query<{ id: number; sasaran_kode: string; urutan: number; program: string; status: string; progress: number; pendukung_unit: string | null }>(
      'SELECT id, sasaran_kode, urutan, program, status, progress, pendukung_unit FROM kegiatan ORDER BY sasaran_kode, urutan'
    ),
    query<{ kode: string; peran: string; unit: string }>(
      `SELECT s.kode, p.peran, p.unit FROM sasaran_pic p
       JOIN sasaran_strategis s ON s.id = p.sasaran_id`
    ),
    getAllHasilEvidence(),
    getAllRincianProgress(),
    getSession(),
  ])

  const byKode = new Map<string, typeof kegRows>()
  for (const k of kegRows) {
    const arr = byKode.get(k.sasaran_kode) ?? []
    arr.push(k)
    byKode.set(k.sasaran_kode, arr)
  }
  const picByKode = new Map<string, { peran: string; unit: string }[]>()
  for (const p of picRows) {
    const arr = picByKode.get(p.kode) ?? []
    arr.push({ peran: p.peran, unit: p.unit })
    picByKode.set(p.kode, arr)
  }

  const isAdmin = user?.role === 'admin'

  // Evidence hasil dipetakan per (kegiatan_id, hasil_index) — sudah terurut terbaru dulu.
  const evByKegHasil = new Map<string, HasilEvidence[]>()
  for (const e of evRows) {
    const key = `${e.kegiatan_id}:${e.hasil_index}`
    const arr = evByKegHasil.get(key) ?? []
    arr.push(e)
    evByKegHasil.set(key, arr)
  }

  // Progress rincian dipetakan per (kegiatan_id, rincian_index) — terurut terbaru dulu.
  const rpByKegRincian = new Map<string, RincianProgress[]>()
  for (const r of rpRows) {
    const key = `${r.kegiatan_id}:${r.rincian_index}`
    const arr = rpByKegRincian.get(key) ?? []
    arr.push(r)
    rpByKegRincian.set(key, arr)
  }

  const pdMap = await getProgramDetailMap()
  return sasaran.map((s) => {
    const detail = pdMap[s.kode]
    const sasaranPic = picByKode.get(s.kode) ?? []
    const peran = peranOf(user?.unit, sasaranPic)
    const utamaUnits = sasaranPic.filter((p) => p.peran === 'Utama').map((p) => p.unit)
    const sasaranPendukung = sasaranPic.filter((p) => p.peran === 'Pendukung').map((p) => p.unit)

    const kegiatan: GanttKegiatan[] = (byKode.get(s.kode) ?? []).map((k) => {
      const row = detail?.kegiatan[k.urutan]
      const span = parseWaktuSpan(row?.waktu ?? null)
      const hasil: GanttHasil[] = (row?.hasil ?? []).map((teks, index) => ({
        index,
        teks,
        evidence: evByKegHasil.get(`${k.id}:${index}`) ?? [],
      }))
      const rincian: GanttRincian[] = (row?.rincian ?? []).map((teks, index) => {
        const history = rpByKegRincian.get(`${k.id}:${index}`) ?? []
        const verified = history.find((h) => h.status === 'Diverifikasi')
        return { index, teks, progress: verified?.progress ?? 0, status: history[0]?.status ?? null, history }
      })
      return {
        id: k.id, urutan: k.urutan, program: k.program, status: k.status, progress: k.progress,
        pendukungUnit: k.pendukung_unit ?? null,
        pendukungUnits: k.pendukung_unit ? [k.pendukung_unit] : sasaranPendukung,
        canSubmit: canSubmitKegiatan(user?.unit, k.pendukung_unit, peran, isAdmin, user?.is_pimpinan ?? false),
        rincian, hasil, ...span,
      }
    })
    const start = kegiatan.length ? Math.min(...kegiatan.map((k) => k.start)) : s.tahun_mulai
    const end = kegiatan.length ? Math.max(...kegiatan.map((k) => k.end)) : s.tahun_selesai
    const kegiatanTotal = kegiatan.length
    const kegiatanVerified = kegiatan.filter((k) => k.status === 'Diverifikasi').length
    // Selaras dengan halaman detail/Strategy Map: rata-rata progress terverifikasi
    // seluruh key program (bukan rasio status). Fallback ke progress PMO bila belum ada.
    const overallProgress = kegiatanTotal
      ? Math.round(kegiatan.reduce((a, k) => a + k.progress, 0) / kegiatanTotal)
      : s.progress
    return {
      kode: s.kode,
      nama: s.nama,
      perspektif_kode: s.perspektif_kode,
      perspektif_nama: s.perspektif_nama,
      perspektif_warna: s.perspektif_warna ?? '#00814f',
      progress: s.progress,
      health: s.health,
      status: s.status,
      start,
      end,
      kegiatan,
      kegiatanTotal,
      kegiatanVerified,
      overallProgress,
      utamaUnits,
      canVerify: canVerifyFn(peran, isAdmin, user?.is_pimpinan ?? false),
    }
  })
}

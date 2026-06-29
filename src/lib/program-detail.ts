// Detail "Implementasi Program HCM" per Sasaran Strategis, PER TENANT.
// Sumber: Blueprint/HCSP masing-masing bank (hasil ekstraksi PDF).
// Data referensi statis (bukan data operasional PMO). Disimpan per bank di
// program-detail.<kode>.data.json dan dipilih berdasarkan tenant aktif.

import { getActiveTenant } from './tenant'
import lampung from './program-detail.lampung.data.json'
import sultra from './program-detail.sultra.data.json'

export interface KegiatanRow {
  program: string      // baris Key Program / Kegiatan Utama (bernomor)
  rincian: string[]    // langkah rinci (a, b, c, …)
  waktu: string        // Waktu Pelaksanaan
  hasil: string[]      // Hasil Pelaksanaan
}

export interface ProgramDetail {
  tujuan: string[]        // Tujuan / Latar Belakang
  gambaranUmum: string[]  // Gambaran Umum
  kegiatan: KegiatanRow[] // Key Program & Kegiatan Utama → Waktu → Hasil Pelaksanaan
}

type DetailMap = Record<string, ProgramDetail>

// Registry per bank (kode tenant -> { sasaran_kode -> ProgramDetail }).
// Bank tanpa konten = peta kosong (UI menampilkan keadaan kosong).
const BY_TENANT: Record<string, DetailMap> = {
  lampung: lampung as unknown as DetailMap,
  sultra: sultra as unknown as DetailMap,
}

// Seluruh peta detail untuk tenant aktif (dipakai saat mengindeks banyak kode).
export async function getProgramDetailMap(): Promise<DetailMap> {
  const t = await getActiveTenant()
  return BY_TENANT[t.kode] ?? {}
}

export async function getProgramDetail(kode: string): Promise<ProgramDetail | undefined> {
  return (await getProgramDetailMap())[kode]
}

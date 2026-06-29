export type Health = 'green' | 'yellow' | 'red' | 'grey'

export interface Perspektif {
  id: number
  kode: string
  nama: string
  deskripsi: string | null
  urutan: number
  warna: string | null
}

export interface Sasaran {
  id: number
  kode: string
  nama: string
  perspektif_id: number
  perspektif_kode: string
  perspektif_nama: string
  perspektif_warna: string | null
  jenis: string | null
  key_program: string | null
  cadence: string | null
  tahun_mulai: number
  tahun_selesai: number
  sponsor: string | null
  status: string
  health: Health
  progress: number
}

export interface PIC {
  peran: string
  unit: string
}

export interface IKTarget {
  tahun: number
  target: number | null
  realisasi: number | null
}

export type Frekuensi = 'bulanan' | 'triwulanan' | 'semesteran' | 'tahunan'

export interface IKPeriode {
  tahun: number
  periode: string // M1..M12 | Q1..Q4 | S1..S2 | Y
  nilai: number | null
}

export interface IK {
  id: number
  sasaran_id: number
  nama: string
  satuan: string | null
  arah: string
  frekuensi: Frekuensi
  targets: IKTarget[]
  periode: IKPeriode[]
}

export interface UpdateLog {
  id: number
  entitas: string // sasaran | ik | maturity | risk | issue
  ref_kode: string | null
  ringkasan: string
  user_nama: string | null
  created_at: string
}

export interface MaturityDomain {
  id: number
  kode: string | null
  nama: string
  cluster: string
  baseline2025: number | null
  targets: { tahun: number; target_itk: number | null; realisasi: number | null }[]
}

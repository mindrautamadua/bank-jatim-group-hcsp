import { query } from './db'

export interface KGSasaran {
  kode: string
  nama: string
  jenis: string | null
  persp: string
  warna: string | null
}
export interface KGRelasi {
  dari: string
  ke: string
  jenis: string
}
export interface KGPic {
  kode: string
  unit: string
  peran: string
}
export interface KGPerspektif {
  kode: string
  nama: string
  warna: string | null
}
export interface KnowledgeGraph {
  sasaran: KGSasaran[]
  relasi: KGRelasi[]
  pic: KGPic[]
  perspektif: KGPerspektif[]
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraph> {
  const [sasaran, relasi, pic, perspektif] = await Promise.all([
    query<KGSasaran>(
      `SELECT s.kode, s.nama, s.jenis, p.kode AS persp, p.warna
       FROM sasaran_strategis s JOIN perspektif p ON p.id = s.perspektif_id
       ORDER BY s.urutan`
    ),
    query<KGRelasi>(`SELECT dari_kode AS dari, ke_kode AS ke, jenis FROM sasaran_relasi`),
    query<KGPic>(
      `SELECT s.kode, sp.unit, sp.peran
       FROM sasaran_pic sp JOIN sasaran_strategis s ON s.id = sp.sasaran_id`
    ),
    query<KGPerspektif>(`SELECT kode, nama, warna FROM perspektif ORDER BY urutan`),
  ])
  return { sasaran, relasi, pic, perspektif }
}

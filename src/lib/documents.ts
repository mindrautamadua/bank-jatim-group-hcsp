import { query } from './db'

// Re-export konstanta client-safe agar importer server lama tetap jalan.
export { JENIS_DOKUMEN, MAX_DOC_BYTES, fmtBytes } from './doc-constants'

export interface DocMeta {
  id: number
  nama: string
  jenis: string
  sasaran_kode: string | null
  sasaran_nama: string | null
  filename: string
  mime_type: string | null
  size_bytes: number
  catatan: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export async function listDocuments(filter: { jenis?: string; kode?: string } = {}): Promise<DocMeta[]> {
  const where: string[] = []
  const params: unknown[] = []
  if (filter.jenis) { params.push(filter.jenis); where.push(`d.jenis = $${params.length}`) }
  if (filter.kode) { params.push(filter.kode); where.push(`d.sasaran_kode = $${params.length}`) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return query<DocMeta>(`
    SELECT d.id, d.nama, d.jenis, d.sasaran_kode, s.nama AS sasaran_nama,
           d.filename, d.mime_type, d.size_bytes::bigint AS size_bytes, d.catatan, d.uploaded_by,
           to_char(d.uploaded_at, 'YYYY-MM-DD HH24:MI') AS uploaded_at
    FROM dokumen d
    LEFT JOIN sasaran_strategis s ON s.kode = d.sasaran_kode
    ${clause}
    ORDER BY d.uploaded_at DESC, d.id DESC
  `, params)
}

export interface DocStats {
  total: number
  totalBytes: number
  byJenis: { jenis: string; n: number }[]
}
export async function getDocStats(): Promise<DocStats> {
  const [agg] = await query<{ total: number; totalbytes: string }>(`SELECT count(*)::int AS total, COALESCE(sum(size_bytes),0)::bigint AS totalbytes FROM dokumen`)
  const byJenis = await query<{ jenis: string; n: number }>(`SELECT jenis, count(*)::int AS n FROM dokumen GROUP BY jenis ORDER BY count(*) DESC`)
  return { total: agg.total, totalBytes: Number(agg.totalbytes), byJenis }
}

export interface DocContent {
  filename: string
  mime_type: string | null
  size_bytes: number
  content: Buffer
}
export async function getDocumentForDownload(id: number): Promise<DocContent | null> {
  const rows = await query<DocContent>(`SELECT filename, mime_type, size_bytes::bigint AS size_bytes, content FROM dokumen WHERE id = $1`, [id])
  return rows[0] ?? null
}

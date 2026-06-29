import { getSession } from '@/lib/auth'
import { getHasilEvidenceById } from '@/lib/kegiatan-hasil'
import { getPicForKode } from '@/lib/kegiatan'
import { peranOf, canViewEvidence } from '@/lib/kegiatan-constants'
import { presignEvidenceUrl, s3Enabled } from '@/lib/storage'

// Akses evidence hasil pelaksanaan: redirect ke URL S3 ber-presign (kedaluwarsa singkat).
// Diotorisasi per-program (pengawas atau PIC) agar tidak bisa ditebak lewat id.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!s3Enabled()) return new Response('Penyimpanan evidence (S3) belum dikonfigurasi.', { status: 503 })

  const { id } = await params
  const ev = await getHasilEvidenceById(Number(id))
  if (!ev) return new Response('Not found', { status: 404 })

  const pic = await getPicForKode(ev.kode)
  if (!canViewEvidence(user.role, peranOf(user.unit, pic))) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const url = await presignEvidenceUrl(ev.key, ev.nama, ev.mime || 'application/octet-stream')
    return Response.redirect(url, 302)
  } catch (e) {
    console.error('[evidence-hasil] gagal presign:', e)
    return new Response('Gagal membuka evidence.', { status: 500 })
  }
}

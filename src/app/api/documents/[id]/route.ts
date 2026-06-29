import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDocumentForDownload } from '@/lib/documents'
import { SAFE_INLINE_MIME } from '@/lib/doc-constants'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const doc = await getDocumentForDownload(Number(id))
  if (!doc) return new Response('Not found', { status: 404 })

  const mime = doc.mime_type || 'application/octet-stream'
  // inline HANYA untuk tipe yang aman dirender (PDF/gambar raster); sisanya dipaksa unduh.
  const inline = req.nextUrl.searchParams.get('view') === '1' && SAFE_INLINE_MIME.has(mime)
  const safe = doc.filename.replace(/[^\w.\-() ]+/g, '_')
  const dispo = inline ? 'inline' : 'attachment'

  return new Response(new Uint8Array(doc.content), {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(doc.size_bytes),
      'Content-Disposition': `${dispo}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}

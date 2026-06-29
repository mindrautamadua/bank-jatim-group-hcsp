import Link from 'next/link'
import { Compass, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-bbgreen-light text-bbgreen">
          <Compass size={30} strokeWidth={1.8} />
        </div>
        <p className="font-display text-5xl font-bold tracking-tight text-bbink">404</p>
        <h1 className="mt-3 font-display text-xl font-semibold text-bbink">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-bbmuted">
          Sasaran strategis atau halaman yang Anda tuju tidak ada. Periksa kembali kode program, atau kembali ke dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="bb-press inline-flex items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-bbgreen-dark"
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

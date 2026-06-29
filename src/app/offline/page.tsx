import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Luring — HCSP',
}

export default function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-bbgreen font-display text-2xl font-extrabold text-white shadow-sm">
          B
        </div>
        <h1 className="font-display text-xl font-bold text-bbink">Anda sedang luring</h1>
        <p className="mt-2 text-sm leading-relaxed text-bbmuted">
          Koneksi internet tidak tersedia. HCSP memerlukan koneksi untuk menampilkan data terbaru.
          Periksa jaringan Anda lalu coba lagi.
        </p>
        <a
          href="/dashboard"
          className="bb-press mt-6 inline-flex items-center justify-center rounded-lg bg-bbgreen px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-bbgreen-dark"
        >
          Coba lagi
        </a>
      </div>
    </main>
  )
}

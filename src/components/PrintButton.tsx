'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print bb-press inline-flex shrink-0 items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] transition-colors hover:bg-bbgreen-dark"
    >
      <Printer size={16} /> Cetak / Simpan PDF
    </button>
  )
}

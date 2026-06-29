'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

// Modal untuk intercepting route. Menutup = router.back() agar URL & history
// konsisten (kembali ke list). Refresh/akses langsung tetap halaman penuh.
export default function RouteModal({ children }: { children: ReactNode }) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [router])

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) router.back() }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative my-2 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col rounded-2xl bg-bbgreen-deep shadow-2xl outline-none sm:my-4 sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/15 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Detail Program</span>
          <button
            onClick={() => router.back()}
            aria-label="Tutup"
            className="bb-press grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}

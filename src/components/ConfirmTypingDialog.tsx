'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'

// Modal konfirmasi aksi destruktif: tombol konfirmasi baru aktif setelah pengguna
// mengetik kata kunci (default "RESET") persis. Dirender via portal ke document.body
// agar lepas dari ancestor ber-transform dan benar-benar center di viewport.
export default function ConfirmTypingDialog({
  open, onClose, onConfirm, title, message,
  confirmWord = 'RESET', confirmLabel = 'Reset', pending = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmWord?: string
  confirmLabel?: string
  pending?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    setValue('')
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending) onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose, pending])

  if (!open || !mounted) return null

  const matched = value === confirmWord

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ct-title">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!pending) onClose() }} />
      <div ref={panelRef} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-bbborder bg-bbcard shadow-2xl">
        <div className="flex items-center justify-between border-b border-bbborder px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-bbred">
              <AlertTriangle size={18} strokeWidth={1.9} />
            </span>
            <h2 id="ct-title" className="font-display text-base font-bold text-bbink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => { if (!pending) onClose() }}
            aria-label="Tutup"
            className="bb-press grid h-8 w-8 place-items-center rounded-lg text-bbmuted transition-colors hover:bg-bbborder/40 hover:text-bbink disabled:opacity-50"
            disabled={pending}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-bbmuted">{message}</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ct-input" className="text-sm text-bbink">
              Ketik <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono font-bold text-bbred">{confirmWord}</span> untuk mengonfirmasi.
            </label>
            <input
              id="ct-input"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && matched && !pending) onConfirm() }}
              autoComplete="off"
              spellCheck={false}
              placeholder={confirmWord}
              className="w-full rounded-lg border border-bbborder bg-white px-3.5 py-2.5 font-mono text-sm tracking-wide text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbred focus:ring-2 focus:ring-bbred/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { if (!pending) onClose() }}
              disabled={pending}
              className="bb-press rounded-lg px-4 py-2.5 text-sm font-medium text-bbmuted transition-colors hover:bg-bbborder/40 hover:text-bbink disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!matched || pending}
              className="bb-press flex items-center justify-center gap-2 rounded-lg bg-bbred px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? <><Loader2 size={16} className="animate-spin" /> Memproses</> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

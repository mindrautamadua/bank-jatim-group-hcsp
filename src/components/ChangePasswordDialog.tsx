'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react'
import { changePasswordAction, type ChangePasswordState } from '@/app/(app)/account/actions'

function PasswordField({
  id, label, autoComplete,
}: { id: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-bbink">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className="w-full rounded-lg border border-bbborder bg-white px-3.5 py-2.5 pr-11 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="bb-press absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-bbmuted transition-colors hover:text-bbink"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {})
  const [mounted, setMounted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Portal hanya di klien (hindari mismatch SSR).
  useEffect(() => { setMounted(true) }, [])

  // Reset form & fokus saat dibuka; tutup dengan Escape.
  useEffect(() => {
    if (!open) return
    formRef.current?.reset()
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  // Tutup otomatis sesaat setelah berhasil.
  useEffect(() => {
    if (!state.ok) return
    const t = setTimeout(onClose, 1400)
    return () => clearTimeout(t)
  }, [state.ok, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-bbborder bg-bbcard shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-bbborder px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-bbgreen-light text-bbgreen">
              <KeyRound size={18} strokeWidth={1.9} />
            </span>
            <h2 id="cp-title" className="font-display text-base font-bold text-bbink">Ganti kata sandi</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="bb-press grid h-8 w-8 place-items-center rounded-lg text-bbmuted transition-colors hover:bg-bbborder/40 hover:text-bbink"
          >
            <X size={18} />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4 px-5 py-5">
          {state.error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bbred/30 bg-red-50 px-3.5 py-3 text-sm text-bbred">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}
          {state.ok && (
            <div role="status" className="flex items-start gap-2.5 rounded-lg border border-bbgreen/30 bg-bbgreen-light px-3.5 py-3 text-sm text-bbgreen-dark">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <span>Kata sandi berhasil diganti.</span>
            </div>
          )}

          <PasswordField id="current_password" label="Kata sandi saat ini" autoComplete="current-password" />
          <PasswordField id="new_password" label="Kata sandi baru" autoComplete="new-password" />
          <PasswordField id="confirm_password" label="Ulangi kata sandi baru" autoComplete="new-password" />
          <p className="text-xs text-bbfaint">Minimal 8 karakter.</p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="bb-press rounded-lg px-4 py-2.5 text-sm font-medium text-bbmuted transition-colors hover:bg-bbborder/40 hover:text-bbink"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending || state.ok}
              className="bb-press flex items-center justify-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bbgreen-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? <><Loader2 size={16} className="animate-spin" /> Menyimpan</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

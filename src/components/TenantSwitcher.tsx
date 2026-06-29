'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { switchTenantAction } from '@/app/(app)/tenant-actions'

export interface TenantOption { kode: string; nama: string; schema: string }

// Pemilih bank untuk pengguna level-grup (Bank Jatim holding). Pengguna biasa
// terkunci di banknya sehingga komponen ini tidak dirender untuk mereka.
export default function TenantSwitcher({
  tenants,
  active,
}: {
  tenants: TenantOption[]
  active: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = tenants.find((t) => t.schema === active)

  function select(schema: string) {
    setOpen(false)
    if (schema === active) return
    startTransition(async () => {
      const ok = await switchTenantAction(schema)
      if (ok) router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        className="bb-press flex items-center gap-2 rounded-xl border border-bbborder bg-bbcard py-1.5 pl-2.5 pr-2 text-left shadow-sm transition-colors hover:border-bbborder-strong disabled:opacity-60"
        title="Pilih bank"
      >
        <Building2 size={16} className="shrink-0 text-bbgreen" />
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-bbmuted">Bank</span>
          <span className="block truncate text-[13px] font-semibold text-bbink">{current?.nama ?? 'Pilih bank'}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-bbfaint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-bbborder bg-bbcard py-1 shadow-lg"
        >
          {tenants.map((t) => {
            const isActive = t.schema === active
            return (
              <button
                key={t.schema}
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => select(t.schema)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-bbbg ${
                  isActive ? 'font-semibold text-bbgreen-deep' : 'text-bbink'
                }`}
              >
                <span className="truncate">{t.nama}</span>
                {isActive && <Check size={15} className="shrink-0 text-bbgreen" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

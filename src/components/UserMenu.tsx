'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react'
import { logoutAction } from '@/app/login/actions'
import type { SessionUser } from '@/lib/auth'
import { roleLabel } from '@/lib/roles'
import ChangePasswordDialog from '@/components/ChangePasswordDialog'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="bb-press flex items-center gap-2.5 rounded-xl border border-bbborder bg-bbcard py-1.5 pl-1.5 pr-2.5 text-left shadow-sm transition-colors hover:border-bbborder-strong"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bbgreen font-display text-sm font-bold text-white">
          {initials(user.nama)}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-[13px] font-semibold text-bbink">{user.nama}</span>
          <span className="block truncate text-[11px] capitalize text-bbmuted">{user.jabatan || user.role}</span>
        </span>
        <ChevronDown
          size={16}
          className={`hidden shrink-0 text-bbfaint transition-transform sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-bbborder bg-bbcard shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-bbborder px-4 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bbgreen font-display text-sm font-bold text-white">
              {initials(user.nama)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-bbink">{user.nama}</div>
              <div className="truncate text-[11.5px] text-bbmuted">{user.email}</div>
            </div>
          </div>
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-bbmuted">
              <UserRound size={14} className="shrink-0 text-bbfaint" />
              <span>{roleLabel(user.role)}</span>
            </div>
          </div>
          <div className="border-t border-bbborder p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); setPwOpen(true) }}
              className="bb-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-bbink transition-colors hover:bg-bbborder/40"
            >
              <KeyRound size={16} className="text-bbmuted" /> Ganti kata sandi
            </button>
          </div>
          <form action={logoutAction} className="border-t border-bbborder p-1.5">
            <button
              type="submit"
              role="menuitem"
              className="bb-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-bbred transition-colors hover:bg-bbred/8"
            >
              <LogOut size={16} /> Keluar aplikasi
            </button>
          </form>
        </div>
      )}

      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

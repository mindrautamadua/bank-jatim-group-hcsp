'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, AlertTriangle, Clock, ArrowRight } from 'lucide-react'

interface NItem { key: string; kategori: string; severity: 'high' | 'medium' | 'info'; judul: string; detail: string; href: string }
const dot: Record<string, string> = { high: 'var(--bb-red)', medium: 'var(--bb-amber)', info: '#9aa8a3' }

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<NItem[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const r = await fetch('/api/notifications', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json()
      setCount(d.count ?? 0); setItems(d.items ?? [])
    } catch { /* abaikan */ }
  }
  useEffect(() => {
    load()
    const id = setInterval(load, 120000) // refresh tiap 2 menit
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => { clearInterval(id); document.removeEventListener('mousedown', onClick) }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="bb-press relative grid h-9 w-9 place-items-center rounded-lg text-bbmuted transition-colors hover:bg-bbgreen-light hover:text-bbgreen-dark" aria-label="Notifikasi">
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-bbred px-1 text-[10px] font-bold leading-none text-white">{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-xl border border-bbborder bg-white shadow-[var(--bb-shadow-lg)]">
          <div className="flex items-center justify-between border-b border-bbborder px-4 py-2.5">
            <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-bbink"><AlertTriangle size={15} className="text-bbamber" /> Perlu tindakan</span>
            <span className="text-xs text-bbmuted">{items.length} item{count > 0 ? ` · ${count} mendesak` : ''}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-bbmuted">Tidak ada notifikasi.</p>
            ) : items.map((it) => (
              <Link key={it.key} href={it.href} onClick={() => setOpen(false)} className="flex items-start gap-2.5 border-b border-bbborder/60 px-4 py-2.5 last:border-0 hover:bg-bbgreen-light/30">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot[it.severity] }} />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-bbfaint">{it.kategori}</span>
                  <p className="truncate text-sm text-bbink" title={it.judul}>{it.judul}</p>
                  <p className="flex items-start gap-1 text-[11px] text-bbmuted" title={it.detail}><Clock size={10} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{it.detail}</span></p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 border-t border-bbborder bg-bbbg px-4 py-2.5 text-sm font-medium text-bbgreen hover:underline">
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}

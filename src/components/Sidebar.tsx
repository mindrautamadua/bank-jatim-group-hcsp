'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Network, Gauge, Share2, BookOpen,
  FileText, UserCog, LifeBuoy,
  GanttChartSquare, ChevronLeft, ChevronRight, ChevronDown, Menu, X, type LucideIcon,
} from 'lucide-react'
import UserMenu from '@/components/UserMenu'
import TenantSwitcher, { type TenantOption } from '@/components/TenantSwitcher'
import type { SessionUser } from '@/lib/auth'

interface NavItem { href: string; label: string; short: string; icon: LucideIcon; adminOnly?: boolean }

// IA: dikelompokkan per tugas, diurutkan berdasarkan frekuensi & kepentingan.
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Ringkasan',
    items: [
      { href: '/dashboard', label: 'Executive Dashboard', short: 'Dashboard', icon: LayoutDashboard },
      { href: '/strategy-map', label: 'HCM Strategy Map', short: 'Strategy', icon: Network },
      { href: '/maturity', label: 'Maturity & Gap', short: 'Maturity', icon: Gauge },
    ],
  },
  {
    label: 'Eksekusi & Analisis',
    items: [
      { href: '/gantt', label: 'Gantt Chart Program', short: 'Gantt', icon: GanttChartSquare },
      { href: '/graph', label: 'Knowledge Graph', short: 'Graph', icon: Share2 },
      { href: '/report', label: 'Board Pack / Laporan', short: 'Laporan', icon: FileText },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/panduan', label: 'Panduan', short: 'Panduan', icon: LifeBuoy },
      { href: '/glossary', label: 'Glossary', short: 'Glossary', icon: BookOpen },
      { href: '/users', label: 'Manajemen Pengguna', short: 'Users', icon: UserCog, adminOnly: true },
    ],
  },
]
const visible = (it: NavItem, role?: string) => !it.adminOnly || role === 'admin'

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`)
}

// Persist preferensi sidebar ke cookie (dibaca server agar SSR konsisten, tanpa kedip).
function setSidebarCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`
}

function monogram(name: string) {
  return name.replace(/^Bank\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function Logo({ compact = false, bankName = 'Bank Jatim Group', logoSrc }: { compact?: boolean; bankName?: string; logoSrc?: string }) {
  // Saat menu lebar: tampilkan logo resmi bank (di atas kartu putih agar warna
  // logo selalu terbaca di sidebar gelap). Saat menu ciut / tanpa logo: monogram.
  if (!compact && logoSrc) {
    return (
      <Link href="/" className="bb-press flex flex-col items-start gap-1.5" aria-label="Beranda HCSP">
        <span className="flex h-11 items-center rounded-xl bg-white px-3 shadow-sm">
          <Image src={logoSrc} alt={bankName} width={220} height={56} className="h-7 w-auto object-contain" priority />
        </span>
        <span className="pl-1 text-[10.5px] tracking-[0.14em] text-white/60">HUMAN CAPITAL · HCSP</span>
      </Link>
    )
  }
  return (
    <Link href="/" className="bb-press flex items-center gap-3" aria-label="Beranda HCSP">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white font-display text-sm font-bold text-bbgreen-deep shadow-sm">
        {monogram(bankName)}
      </span>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display font-bold text-white">{bankName}</div>
          <div className="text-[10.5px] tracking-[0.14em] text-white/65">HUMAN CAPITAL · HCSP</div>
        </div>
      )}
    </Link>
  )
}

function SupportedBy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`shrink-0 border-t border-white/12 ${compact ? 'px-2 py-3' : 'px-5 py-4'}`}>
      <a
        href="https://lppi.or.id/"
        target="_blank"
        rel="noopener noreferrer"
        className="bb-press flex flex-col items-center gap-1.5"
        aria-label="Didukung oleh LPPI"
        title="Didukung oleh LPPI"
      >
        {!compact && (
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Didukung oleh
          </span>
        )}
        <Image
          src="/lppi-logo-white.png"
          alt="Logo LPPI"
          width={150}
          height={71}
          className={compact ? 'h-6 w-auto opacity-90' : 'h-7 w-auto opacity-95'}
        />
      </a>
    </div>
  )
}

export default function Sidebar({
  role,
  bankName,
  logoSrc,
  defaultCollapsed = false,
  defaultClosedGroups = [],
}: {
  role?: string
  bankName?: string
  logoSrc?: string
  defaultCollapsed?: boolean
  defaultClosedGroups?: string[]
}) {
  const path = usePathname()
  // State awal berasal dari cookie (via props server) → identik di server & client,
  // jadi tidak ada hydration mismatch maupun kedip saat memuat.
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const toggle = () =>
    setCollapsed((c) => { const n = !c; setSidebarCookie('hcsp-sidebar-collapsed', n ? '1' : '0'); return n })

  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => new Set(defaultClosedGroups))
  const toggleGroup = (label: string) => setClosedGroups((prev) => {
    const n = new Set(prev)
    if (n.has(label)) n.delete(label); else n.add(label)
    setSidebarCookie('hcsp-sidebar-groups', JSON.stringify([...n]))
    return n
  })

  return (
    <aside className={`bb-sidebar sticky top-0 hidden h-[100dvh] shrink-0 flex-col text-white transition-[width] duration-200 md:flex ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className={`shrink-0 border-b border-white/12 ${collapsed ? 'flex flex-col items-center gap-3 px-2 py-4' : 'flex items-center justify-between px-5 py-5'}`}>
        <Logo compact={collapsed} bankName={bankName} logoSrc={logoSrc} />
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'}
          title={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'}
          className="bb-press grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      <nav className={`flex-1 space-y-4 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navGroups.map((group, gi) => {
          const items = group.items.filter((it) => visible(it, role))
          if (items.length === 0) return null
          const groupClosed = !collapsed && closedGroups.has(group.label)
          return (
            <div key={group.label} className="space-y-1">
              {collapsed
                ? gi > 0 && <div className="mx-1 mb-2 border-t border-white/10" />
                : (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={!groupClosed}
                    className="flex w-full items-center justify-between rounded px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/75"
                  >
                    {group.label}
                    <ChevronDown size={13} className={`transition-transform duration-200 ${groupClosed ? '-rotate-90' : ''}`} />
                  </button>
                )}
              {!groupClosed && items.map(({ href, label, icon: Icon }) => {
                const active = isActive(path, href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    aria-label={label}
                    title={collapsed ? label : undefined}
                    className={`bb-press group relative flex items-center rounded-lg text-sm font-medium transition-colors ${
                      collapsed ? 'mx-auto h-10 w-10 justify-center' : 'gap-3 px-3 py-2'
                    } ${active ? 'bg-white text-bbgreen-deep shadow-sm' : 'text-white/85 hover:bg-white/10 hover:text-white'}`}
                  >
                    {active && !collapsed && <span className="absolute -left-3 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-bbgold" style={{ width: 4 }} />}
                    <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                    {!collapsed && label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <SupportedBy compact={collapsed} />
    </aside>
  )
}

export function MobileNav({ user, bankName, logoSrc, tenants = [] }: { user: SessionUser; bankName?: string; logoSrc?: string; tenants?: TenantOption[] }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Kunci scroll + Escape + fokus saat drawer terbuka.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  return (
    <header className="bb-sidebar sticky top-0 z-20 pt-[env(safe-area-inset-top)] text-white md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            aria-expanded={open}
            className="bb-press grid h-10 w-10 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <Logo compact bankName={bankName} />
        </div>
        <div className="flex items-center gap-2">
          {user.isGroup && tenants.length > 0 && <TenantSwitcher tenants={tenants} active={user.activeSchema} />}
          <UserMenu user={user} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="bb-sidebar absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)] text-white shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-white/12 px-4 py-3.5">
              <Logo bankName={bankName} logoSrc={logoSrc} />
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="bb-press grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
              {navGroups.map((group) => {
                const items = group.items.filter((it) => visible(it, user.role))
                if (items.length === 0) return null
                return (
                  <div key={group.label} className="space-y-1">
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{group.label}</p>
                    {items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(path, href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`bb-press flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active ? 'bg-white text-bbgreen-deep shadow-sm' : 'text-white/85 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
            </nav>
            <SupportedBy />
          </div>
        </div>
      )}
    </header>
  )
}

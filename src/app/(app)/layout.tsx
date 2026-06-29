import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar, { MobileNav } from '@/components/Sidebar'
import UserMenu from '@/components/UserMenu'
import NotificationBell from '@/components/NotificationBell'
import TenantSwitcher from '@/components/TenantSwitcher'
import { getSession } from '@/lib/auth'
import { TENANTS, getActiveTenant } from '@/lib/tenant'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getSession()
  if (!user) redirect('/login')

  // Preferensi sidebar dari cookie → render server sudah sesuai (tanpa hydration mismatch / kedip).
  const jar = await cookies()
  const sidebarCollapsed = jar.get('hcsp-sidebar-collapsed')?.value === '1'
  let closedGroups: string[] = []
  const closedRaw = jar.get('hcsp-sidebar-groups')?.value
  if (closedRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(closedRaw))
      if (Array.isArray(parsed)) closedGroups = parsed.filter((x): x is string => typeof x === 'string')
    } catch { }
  }

  // Daftar bank untuk pemilih tenant (hanya dipakai pengguna level-grup).
  const tenantOptions = TENANTS.map((t) => ({ kode: t.kode, nama: t.nama, schema: t.schema }))

  // Logo bank aktif untuk header sidebar (berganti mengikuti bank yang dipilih).
  const activeTenant = await getActiveTenant()

  return (
    <div className="relative z-[2] flex min-h-[100dvh]">
      <Sidebar role={user.role} bankName={user.activeNama} logoSrc={activeTenant.logo} defaultCollapsed={sidebarCollapsed} defaultClosedGroups={closedGroups} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={user} bankName={user.activeNama} logoSrc={activeTenant.logo} tenants={tenantOptions} />
        <header className="sticky top-0 z-20 hidden items-center justify-end gap-2 border-b border-bbborder bg-bbbg/85 px-9 py-3 backdrop-blur md:flex">
          {user.isGroup && <TenantSwitcher tenants={tenantOptions} active={user.activeSchema} />}
          <NotificationBell />
          <UserMenu user={user} />
        </header>
        <main className="min-w-0 flex-1 px-5 py-6 md:px-9 md:py-9">{children}</main>
      </div>
    </div>
  )
}

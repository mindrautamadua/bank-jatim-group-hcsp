import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from '@/components/LoginForm'
import { ShieldCheck, Gauge, FolderKanban, Network } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const session = await getSession()
  if (session) redirect('/dashboard')

  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  return (
    <div className="relative z-[2] grid min-h-[100dvh] lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="bb-sidebar relative hidden flex-col justify-between p-12 text-white lg:flex">
        <Link href="/" className="bb-press flex items-center gap-3">
          <span className="flex h-11 items-center rounded-xl bg-white px-3 shadow-sm">
            <Image src="/bankjatim-logo.png" alt="Bank Jatim" width={160} height={40} className="h-6 w-auto" priority />
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Group</span>
        </Link>

        <div className="max-w-md">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Human Capital Strategic Planning
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Platform eksekusi Blueprint HCM 2026-2030. Pantau program strategis, kematangan, dan
            dampaknya dalam satu tempat.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {[
              { icon: FolderKanban, t: '26 program strategis terpantau' },
              { icon: Gauge, t: 'Kematangan 13 domain HCM' },
              { icon: Network, t: 'Balanced Scorecard 4 perspektif' },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
                  <Icon size={16} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <a
            href="https://lppi.or.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="bb-press flex items-center gap-3"
            aria-label="Didukung oleh LPPI"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Didukung oleh
            </span>
            <Image
              src="/lppi-logo-white.png"
              alt="Logo LPPI"
              width={150}
              height={71}
              className="h-7 w-auto opacity-95"
            />
          </a>
          <p className="text-xs text-white/55">
            Penggunaan internal Kelompok Usaha Bank Jatim.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="bb-press inline-flex items-center gap-2.5">
              <Image src="/bankjatim-logo.png" alt="Bank Jatim" width={160} height={40} className="h-7 w-auto" priority />
              <span className="font-display text-base font-bold text-bbink">Group <span className="text-bbgreen">HCSP</span></span>
            </Link>
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-bbgreen-light text-bbgreen">
              <ShieldCheck size={22} strokeWidth={1.9} />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-bbink">Masuk ke platform</h2>
            <p className="mt-1.5 text-sm text-bbmuted">
              Gunakan akun yang diberikan oleh Divisi SDM untuk melanjutkan.
            </p>
          </div>

          <LoginForm next={safeNext} />

          <p className="mt-8 text-xs text-bbfaint">
            Belum punya akses? Hubungi Divisi Sumber Daya Manusia.
          </p>

          <a
            href="https://lppi.or.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="bb-press mt-8 flex items-center gap-2.5 border-t border-bbborder pt-6 lg:hidden"
            aria-label="Didukung oleh LPPI"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bbfaint">
              Didukung oleh
            </span>
            <Image
              src="/lppi-logo.png"
              alt="Logo LPPI"
              width={425}
              height={204}
              className="h-7 w-auto"
            />
          </a>
        </div>
      </main>
    </div>
  )
}

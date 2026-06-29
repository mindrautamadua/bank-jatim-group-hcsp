import type { ReactNode } from 'react'
import type { Health } from '@/lib/types'
import { healthColor } from '@/lib/format'

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-[1.7rem] font-bold leading-tight text-bbink">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-bbmuted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`bb-card ${hover ? 'bb-card-hover' : ''} p-5 ${className}`}>{children}</div>
}

export function StatCard({
  label,
  value,
  sub,
  accent = 'var(--bb-green)',
  icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: string
  icon?: ReactNode
}) {
  return (
    <div className="bb-card bb-card-hover relative overflow-hidden p-5">
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bbfaint">{label}</div>
        {icon && (
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${accent}14`, color: accent }}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-[2.1rem] font-bold leading-none tracking-tight text-bbink tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-xs text-bbmuted">{sub}</div>}
    </div>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

const HEALTH_LABEL: Record<Health, string> = {
  green: 'Sehat',
  yellow: 'Perlu perhatian',
  red: 'Kritis',
  grey: 'Belum mulai',
}

export function HealthDot({ health }: { health: Health }) {
  const label = HEALTH_LABEL[health]
  return (
    <span className="relative inline-flex h-2.5 w-2.5" role="img" aria-label={label} title={label}>
      <span
        className="inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white"
        style={{ background: healthColor[health] }}
      />
    </span>
  )
}

export function ProgressBar({ value, accent = 'var(--bb-green)' }: { value: number; accent?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bbgreen-light">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: accent }}
      />
    </div>
  )
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-bbborder bg-white/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-bbfaint">{icon}</div>}
      <p className="text-sm font-medium text-bbink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-bbmuted">{hint}</p>}
    </div>
  )
}

'use client'

import { useSyncExternalStore } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell,
} from 'recharts'

const GREEN = 'var(--bb-green)' // warna brand bank aktif (di-set via CSS var di layout)
const GOLD = '#f0b800'
const AMBER = '#c97a1f'
const RED = '#d9343b'

// Deteksi layar sempit (SSR-safe, tanpa hydration mismatch) untuk menyesuaikan chart.
const MQ = '(max-width: 640px)'
function useNarrow() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(MQ); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(MQ).matches,
    () => false,
  )
}

export function MaturityTrajectory({
  data,
}: {
  data: { tahun: string; baseline: number | null; target: number | null }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
        <XAxis dataKey="tahun" tick={{ fontSize: 12, fill: '#5b6b66' }} />
        <YAxis domain={[2, 4.2]} tick={{ fontSize: 12, fill: '#5b6b66' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="target" name="Target ITK" stroke={GREEN} strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="baseline" name="Realisasi" stroke={AMBER} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ClusterTrajectory({
  data,
}: {
  data: { tahun: number; Strategic: number | null; Services: number | null; HCIS: number | null }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
        <XAxis dataKey="tahun" tick={{ fontSize: 12, fill: '#5b6b66' }} />
        <YAxis domain={[1.5, 4.2]} tick={{ fontSize: 12, fill: '#5b6b66' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Strategic" name="HCM Strategic" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Services" name="HCM Services" stroke={AMBER} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="HCIS" name="HCIS" stroke={RED} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MaturitySpider({
  data,
  showRealisasi = false,
}: {
  data: { domain: string; baseline: number; target: number; realisasi?: number | null }[]
  showRealisasi?: boolean
}) {
  const narrow = useNarrow()
  return (
    <ResponsiveContainer width="100%" height={narrow ? 340 : 420}>
      <RadarChart data={data} outerRadius={narrow ? '60%' : '72%'}>
        <PolarGrid stroke="#dbe5e0" />
        <PolarAngleAxis dataKey="domain" tick={{ fontSize: narrow ? 8.5 : 10.5, fill: '#3a4844' }} />
        <PolarRadiusAxis domain={[0, 4]} tick={{ fontSize: 9, fill: '#9aa8a3' }} angle={90} />
        <Radar name="Target 2030" dataKey="target" stroke={GREEN} fill={GREEN} fillOpacity={0.28} />
        <Radar name="Baseline 2025" dataKey="baseline" stroke={AMBER} fill={GOLD} fillOpacity={0.18} />
        {showRealisasi && (
          <Radar name="Realisasi terkini" dataKey="realisasi" stroke={RED} fill={RED} fillOpacity={0.12} />
        )}
        <Legend />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function GapBars({
  data,
}: {
  data: { nama: string; gap: number; baseline: number; target: number }[]
}) {
  const narrow = useNarrow()
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <YAxis
          type="category"
          dataKey="nama"
          width={narrow ? 96 : 210}
          tick={{ fontSize: 10.5, fill: '#3a4844' }}
          tickFormatter={(v: string) => (narrow && v.length > 14 ? `${v.slice(0, 13)}…` : v)}
        />
        <Tooltip formatter={(v) => [Number(v).toFixed(2), 'Gap ITK']} />
        <Bar dataKey="gap" radius={[0, 5, 5, 0]}>
          {data.map((d) => (
            <Cell key={d.nama} fill={d.gap >= 0.6 ? AMBER : d.gap > 0 ? GOLD : GREEN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function IKTrajectory({
  data,
  satuan,
}: {
  data: { tahun: string; target: number | null; realisasi: number | null }[]
  satuan?: string | null
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
        <XAxis dataKey="tahun" tick={{ fontSize: 12, fill: '#5b6b66' }} />
        <YAxis tick={{ fontSize: 11, fill: '#5b6b66' }} width={48} />
        <Tooltip formatter={(v) => [`${v}${satuan === '%' ? '%' : ''}`, '']} />
        <Legend />
        <Line type="monotone" dataKey="target" name="Target" stroke={GREEN} strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="realisasi" name="Realisasi" stroke={AMBER} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PerspektifBars({
  data,
}: {
  data: { kode: string; count: number; warna: string }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
        <XAxis dataKey="kode" tick={{ fontSize: 12, fill: '#5b6b66' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <Tooltip formatter={(v) => [v, 'Program']} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.kode} fill={d.warna} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

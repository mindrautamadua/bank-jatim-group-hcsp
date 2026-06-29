'use client'

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const GREEN = 'var(--bb-green)' // warna brand bank aktif (di-set via CSS var di layout)
const GOLD = '#f0b800'
const RED = '#d9343b'
const AMBER = '#c97a1f'
const VIOLET = '#7A4FA0'

export interface TrendPoint {
  periode: string
  maturity: number | null
  green: number
  yellow: number
  red: number
  progress: number
  msDone: number
  benReached: number
  overdue: number
}

export function MaturityTrend({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
        <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <YAxis domain={[2, 4.2]} tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <Tooltip />
        <Line type="monotone" dataKey="maturity" name="Kematangan HCM" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function HealthTrend({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
        <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="green" name="Hijau" stackId="h" fill={GREEN} />
        <Bar dataKey="yellow" name="Kuning" stackId="h" fill={GOLD} />
        <Bar dataKey="red" name="Merah" stackId="h" fill={RED} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ExecutionTrend({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
        <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5b6b66' }} />
        <Tooltip formatter={(v) => [`${v}%`, '']} />
        <Legend />
        <Line type="monotone" dataKey="progress" name="Rata-rata progress" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="msDone" name="Milestone selesai" stroke={VIOLET} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="benReached" name="Benefit tercapai" stroke={AMBER} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

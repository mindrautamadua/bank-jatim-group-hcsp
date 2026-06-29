import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllSasaran, getMaturityDomains } from '@/lib/queries'
import { listBenefits } from '@/lib/benefit'
import { realizationPct, benefitStatus } from '@/lib/benefit-constants'
import { getAllMilestones } from '@/lib/milestone'

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')

async function build(dataset: string): Promise<{ rows: unknown[][]; name: string } | null> {
  if (dataset === 'portfolio') {
    const s = await getAllSasaran()
    return {
      name: 'portfolio',
      rows: [['Kode', 'Sasaran Strategis', 'Perspektif', 'Jenis', 'Status', 'Health', 'Progress %', 'Sponsor'],
        ...s.map((x) => [x.kode, x.nama, x.perspektif_kode, x.jenis, x.status, x.health, x.progress, x.sponsor])],
    }
  }
  if (dataset === 'maturity') {
    const d = await getMaturityDomains()
    const yr = [2025, 2026, 2027, 2028, 2029, 2030]
    return {
      name: 'maturity',
      rows: [['Domain', 'Cluster', 'Baseline 2025', ...yr.slice(1).map((y) => `Target ${y}`), 'Realisasi terkini'],
        ...d.map((x) => {
          const t = (y: number) => x.targets.find((q) => q.tahun === y)?.target_itk ?? ''
          const real = x.targets.filter((q) => q.realisasi !== null).sort((a, b) => b.tahun - a.tahun)[0]
          return [x.nama, x.cluster, x.baseline2025, ...yr.slice(1).map((y) => t(y)), real ? Number(real.realisasi) : '']
        })],
    }
  }
  if (dataset === 'benefits') {
    const b = await listBenefits()
    return {
      name: 'benefit-register',
      rows: [['Program', 'Benefit', 'Tingkatan', 'Satuan', 'Baseline', 'Target', 'Actual', 'Arah', 'Realisasi %', 'Status'],
        ...b.map((x) => [x.sasaran_kode, x.nama, x.jenis, x.satuan, x.baseline, x.target, x.actual, x.arah, realizationPct(x) ?? '', benefitStatus(x).label])],
    }
  }
  if (dataset === 'milestones') {
    const m = await getAllMilestones()
    return {
      name: 'milestones',
      rows: [['Program', 'Milestone', 'Tahun', 'Triwulan', 'Status', 'Progress %', 'Terlambat'],
        ...m.map((x) => [x.sasaran_kode, x.judul, x.tahun, x.triwulan ? `Q${x.triwulan}` : '', x.status, x.progress, x.behind ? 'Ya' : ''])],
    }
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ dataset: string }> }) {
  const user = await getSession()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { dataset } = await params
  const out = await build(dataset)
  if (!out) return new Response('Dataset tidak dikenal', { status: 404 })
  return new Response(csv(out.rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hcsp-${out.name}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

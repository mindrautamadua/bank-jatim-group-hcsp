'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force'
import type { KnowledgeGraph as KG } from '@/lib/graph'
import { ArrowRight, Users2, GitFork, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

const W = 1000
const H = 640
const ROLLUP_COLOR = '#0B7A8C'
const UNIT_COLOR = '#7d8a85'

type NodeType = 'sasaran' | 'rollup' | 'unit'
interface GNode {
  id: string
  label: string
  nama: string
  type: NodeType
  persp?: string
  color: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}
interface GLink {
  source: string | GNode
  target: string | GNode
  type: 'mendukung' | 'menanggung'
  peran?: string
}

function layerX(n: GNode): number {
  if (n.type === 'unit') return 500
  if (n.type === 'rollup') return 540
  switch (n.persp) {
    case 'PP': return 150
    case 'PBI': return 360
    case 'KS': return 700
    case 'F': return 880
    default: return 500
  }
}
const idOf = (e: string | GNode) => (typeof e === 'string' ? e : e.id)

export default function KnowledgeGraph({ data }: { data: KG }) {
  const [showPIC, setShowPIC] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [, force] = useState(0)
  const rerender = useCallback(() => force((t) => t + 1), [])

  // view transform (zoom/pan)
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const dragRef = useRef<GNode | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const warna: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of data.perspektif) m[p.kode] = p.warna ?? '#00814f'
    return m
  }, [data.perspektif])

  // Build nodes + links from data + toggles
  const { nodes, links } = useMemo(() => {
    const ns: GNode[] = data.sasaran.map((s) => ({
      id: s.kode,
      label: s.kode,
      nama: s.nama,
      type: 'sasaran',
      persp: s.persp,
      color: s.warna ?? warna[s.persp] ?? '#00814f',
    }))
    const ids = new Set(ns.map((n) => n.id))

    // rollup node bila dirujuk relasi (mis. PBI.1) namun bukan sasaran
    const refs = new Set<string>()
    for (const r of data.relasi) { refs.add(r.dari); refs.add(r.ke) }
    for (const r of refs) {
      if (!ids.has(r)) {
        ns.push({ id: r, label: r, nama: 'Kematangan HCM (rollup)', type: 'rollup', persp: 'PBI', color: ROLLUP_COLOR })
        ids.add(r)
      }
    }

    const ls: GLink[] = data.relasi
      .filter((r) => ids.has(r.dari) && ids.has(r.ke))
      .map((r) => ({ source: r.dari, target: r.ke, type: 'mendukung' as const }))

    if (showPIC) {
      const units = new Map<string, GNode>()
      for (const p of data.pic) {
        const uid = `U:${p.unit}`
        if (!units.has(uid)) units.set(uid, { id: uid, label: p.unit, nama: p.unit, type: 'unit', color: UNIT_COLOR })
        ls.push({ source: uid, target: p.kode, type: 'menanggung', peran: p.peran })
      }
      ns.push(...units.values())
    }
    return { nodes: ns, links: ls }
  }, [data, showPIC, warna])

  const nodesRef = useRef<GNode[]>([])
  const simRef = useRef<Simulation<GNode, undefined> | null>(null)

  useEffect(() => {
    const ns = nodes.map((n) => ({ ...n }))
    const byId = new Map(ns.map((n) => [n.id, n]))
    const ls = links.map((l) => ({ ...l, source: idOf(l.source), target: idOf(l.target) }))
    nodesRef.current = ns

    const sim = forceSimulation<GNode>(ns)
      .force('link', forceLink<GNode, GLink>(ls as unknown as GLink[]).id((d) => (d as GNode).id).distance(95).strength(0.25))
      .force('charge', forceManyBody().strength(-300))
      .force('x', forceX<GNode>((d) => layerX(d)).strength(0.2))
      .force('y', forceY<GNode>(H / 2).strength(0.06))
      .force('collide', forceCollide<GNode>(30))
      .alpha(1)
      .on('tick', rerender)
    simRef.current = sim
    byId.size // touch
    return () => { sim.stop() }
  }, [nodes, links, rerender])

  // adjacency for highlight + panel
  const adj = useMemo(() => {
    const up = new Map<string, string[]>()   // didukung oleh (dari -> sel)
    const down = new Map<string, string[]>() // mendukung (sel -> ke)
    const neigh = new Map<string, Set<string>>()
    const add = (m: Map<string, string[]>, k: string, v: string) => { (m.get(k) ?? m.set(k, []).get(k)!).push(v) }
    const addN = (a: string, b: string) => { (neigh.get(a) ?? neigh.set(a, new Set()).get(a)!).add(b) }
    for (const r of data.relasi) {
      add(down, r.dari, r.ke)
      add(up, r.ke, r.dari)
      addN(r.dari, r.ke); addN(r.ke, r.dari)
    }
    return { up, down, neigh }
  }, [data.relasi])

  const activeNodes = useMemo(() => {
    if (!selected) return null
    const set = new Set<string>([selected])
    for (const l of links) {
      const s = idOf(l.source), t = idOf(l.target)
      if (s === selected) set.add(t)
      if (t === selected) set.add(s)
    }
    return set
  }, [selected, links])

  // ----- interaction -----
  const toLocal = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const rect = svg.getBoundingClientRect()
    const sx = ((e.clientX - rect.left) / rect.width) * W
    const sy = ((e.clientY - rect.top) / rect.height) * H
    return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k }
  }

  const onNodeDown = (e: React.PointerEvent, n: GNode) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = n
    setSelected(n.id)
    simRef.current?.alphaTarget(0.2).restart()
  }
  const onBgDown = (e: React.PointerEvent) => {
    panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
    setSelected(null)
  }
  const onMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const p = toLocal(e)
      dragRef.current.fx = p.x
      dragRef.current.fy = p.y
      rerender()
    } else if (panRef.current) {
      const dx = e.clientX - panRef.current.x
      const dy = e.clientY - panRef.current.y
      const rect = svgRef.current!.getBoundingClientRect()
      setView((v) => ({ ...v, x: panRef.current!.vx + (dx / rect.width) * W, y: panRef.current!.vy + (dy / rect.height) * H }))
    }
  }
  const onUp = () => {
    if (dragRef.current) { dragRef.current.fx = null; dragRef.current.fy = null; dragRef.current = null }
    panRef.current = null
    simRef.current?.alphaTarget(0)
  }
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setView((v) => {
      const k = Math.min(3, Math.max(0.4, v.k * factor))
      const rect = svgRef.current!.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * W
      const my = ((e.clientY - rect.top) / rect.height) * H
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k }
    })
  }
  const reset = () => setView({ k: 1, x: 0, y: 0 })
  // Zoom via tombol (penting di sentuh: tak ada wheel/pinch). Zoom ke titik tengah.
  const zoomBy = (factor: number) => setView((v) => {
    const k = Math.min(3, Math.max(0.4, v.k * factor))
    const cx = W / 2, cy = H / 2
    return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k }
  })

  const sel = selected ? nodes.find((n) => n.id === selected) ?? null : null
  const ns = nodesRef.current

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Graph canvas */}
      <div className="bb-card relative overflow-hidden p-0">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPIC((s) => !s)}
            className={`bb-press inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${showPIC ? 'border-bbgreen bg-bbgreen text-white' : 'border-bbborder bg-white text-bbmuted hover:border-bbgreen'}`}
          >
            <Users2 size={13} /> Penanggung Jawab
          </button>
          <button onClick={reset} className="bb-press inline-flex items-center gap-1.5 rounded-lg border border-bbborder bg-white px-2.5 py-1.5 text-xs font-medium text-bbmuted hover:border-bbgreen">
            <Maximize2 size={13} /> Reset
          </button>
          <button onClick={() => zoomBy(1.25)} aria-label="Perbesar" className="bb-press grid h-9 w-9 place-items-center rounded-lg border border-bbborder bg-white text-bbmuted hover:border-bbgreen">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => zoomBy(1 / 1.25)} aria-label="Perkecil" className="bb-press grid h-9 w-9 place-items-center rounded-lg border border-bbborder bg-white text-bbmuted hover:border-bbgreen">
            <ZoomOut size={15} />
          </button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-[440px] w-full touch-none select-none sm:h-[640px]"
          style={{ cursor: panRef.current ? 'grabbing' : 'grab' }}
          onPointerDown={onBgDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onWheel={onWheel}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9fb3aa" />
            </marker>
            <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#00814f" />
            </marker>
          </defs>

          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {/* edges */}
            {links.map((l, i) => {
              const s = ns.find((n) => n.id === idOf(l.source))
              const t = ns.find((n) => n.id === idOf(l.target))
              if (!s || !t || s.x == null || t.x == null) return null
              const on = selected ? idOf(l.source) === selected || idOf(l.target) === selected : false
              const dim = selected ? !on : false
              const pic = l.type === 'menanggung'
              return (
                <line
                  key={i}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={on ? '#00814f' : pic ? '#cdd8d2' : '#c4d2cb'}
                  strokeWidth={on ? 2 : 1}
                  strokeDasharray={pic ? '4 3' : undefined}
                  markerEnd={pic ? undefined : on ? 'url(#arrow-on)' : 'url(#arrow)'}
                  opacity={dim ? 0.1 : on ? 0.95 : 0.5}
                />
              )
            })}
            {/* nodes */}
            {ns.map((n) => {
              if (n.x == null || n.y == null) return null
              const active = !activeNodes || activeNodes.has(n.id)
              const isSel = selected === n.id
              const r = n.type === 'rollup' ? 16 : n.type === 'unit' ? 9 : 12
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={active ? 1 : 0.18} style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => onNodeDown(e, n)}>
                  {n.type === 'unit' ? (
                    <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={3} fill={n.color} stroke={isSel ? '#14211d' : 'white'} strokeWidth={isSel ? 2.5 : 1.5} />
                  ) : (
                    <circle r={r} fill={n.color} stroke={isSel ? '#14211d' : 'white'} strokeWidth={isSel ? 2.5 : 1.5} />
                  )}
                  <text textAnchor="middle" dy={n.type === 'unit' ? 3 : 4} fontSize={n.type === 'rollup' ? 8.5 : 9} fontWeight={700} fill="white" pointerEvents="none">
                    {n.type === 'unit' ? '' : n.label}
                  </text>
                  {(isSel || n.type === 'rollup' || n.type === 'unit') && (
                    <text x={0} y={r + 11} textAnchor="middle" fontSize={9} fill="#3a4844" pointerEvents="none">
                      {n.type === 'unit' ? n.label.replace('Divisi ', '').replace('Bagian ', '').slice(0, 22) : ''}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-bbborder px-4 py-2.5 text-[11px] text-bbmuted">
          {data.perspektif.map((p) => (
            <span key={p.kode} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.warna ?? '#00814f' }} />
              {p.kode} · {p.nama.replace(' pada HCM', '')}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLLUP_COLOR }} /> Rollup</span>
          <span className="ml-auto text-bbfaint">Klik node untuk telusuri · tombol +/− untuk zoom · seret untuk geser</span>
        </div>
      </div>

      {/* Side panel */}
      <DetailPanel data={data} sel={sel} adj={adj} warna={warna} />
    </div>
  )
}

function DetailPanel({
  data, sel, adj, warna,
}: {
  data: KG
  sel: GNode | null
  adj: { up: Map<string, string[]>; down: Map<string, string[]> }
  warna: Record<string, string>
}) {
  const namaOf = (kode: string) => data.sasaran.find((s) => s.kode === kode)?.nama ?? (kode === 'PBI.1' ? 'Kematangan HCM (rollup)' : kode)

  if (!sel) {
    return (
      <div className="bb-card p-5">
        <h3 className="flex items-center gap-2 font-display font-semibold text-bbink"><GitFork size={17} className="text-bbgreen" /> Ontologi</h3>
        <p className="mt-2 text-xs leading-relaxed text-bbmuted">
          Knowledge graph strategi HCM. Pilih node untuk melihat keterkaitannya.
        </p>
        <dl className="mt-4 space-y-2.5 text-xs">
          <div><dt className="font-semibold text-bbink">Node</dt><dd className="text-bbmuted">Sasaran strategis (per perspektif), rollup Kematangan HCM, dan unit penanggung jawab.</dd></div>
          <div><dt className="font-semibold text-bbink">Relasi: mendukung</dt><dd className="text-bbmuted">Panah A → B: A menjadi fondasi/pendukung bagi B. Alurnya PP → PBI → KS → F.</dd></div>
          <div><dt className="font-semibold text-bbink">Relasi: menanggung</dt><dd className="text-bbmuted">Garis putus-putus: unit bertanggung jawab atas sasaran (aktifkan "Penanggung Jawab").</dd></div>
        </dl>
      </div>
    )
  }

  const isUnit = sel.type === 'unit'
  const perspWarna = (kode: string) => warna[data.sasaran.find((s) => s.kode === kode)?.persp ?? ''] ?? ROLLUP_COLOR

  // Node unit: tampilkan sasaran yang ditanggung (relasi menanggung), bukan dependensi.
  const tanggung = isUnit
    ? data.pic
        .filter((p) => `U:${p.unit}` === sel.id)
        .map((p) => ({ kode: p.kode, peran: p.peran }))
        .sort((a, b) => (a.peran === b.peran ? a.kode.localeCompare(b.kode) : a.peran === 'Utama' ? -1 : 1))
    : []
  const up = (adj.up.get(sel.id) ?? []).slice().sort()
  const down = (adj.down.get(sel.id) ?? []).slice().sort()
  const pics = data.pic.filter((p) => p.kode === sel.id)

  return (
    <div className="bb-card p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-md px-2 py-0.5 font-mono text-xs font-bold text-white" style={{ background: sel.color }}>{isUnit ? 'UNIT' : sel.label}</span>
        {sel.persp && <span className="text-xs text-bbmuted">{sel.persp}</span>}
      </div>
      <h3 className="mt-2 font-display text-sm font-semibold leading-snug text-bbink">{sel.nama}</h3>

      {isUnit ? (
        <Group title={`Menanggung (${tanggung.length})`} hint="sasaran yang menjadi tanggung jawab unit ini">
          {tanggung.length ? tanggung.map((t) => (
            <div key={t.kode + t.peran} className="flex items-center gap-2 py-0.5 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: perspWarna(t.kode) }} />
              <span className="font-mono font-semibold text-bbink">{t.kode}</span>
              <span className="min-w-0 flex-1 truncate text-bbmuted" title={namaOf(t.kode)}>
                {namaOf(t.kode).replace('Meningkatkan Efektivitas dan Kematangan ', '').replace('Manajemen ', '')}
              </span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.peran === 'Utama' ? 'bg-bbgreen-light text-bbgreen-dark' : 'bg-gray-100 text-gray-600'}`}>{t.peran}</span>
            </div>
          )) : <Empty />}
        </Group>
      ) : (
        <>
          <Group title={`Mendukung (${down.length})`} hint="sasaran yang diaktifkan node ini">
            {down.length ? down.map((k) => <Item key={k} kode={k} nama={namaOf(k)} warna={perspWarna(k)} />) : <Empty />}
          </Group>
          <Group title={`Didukung oleh (${up.length})`} hint="fondasi yang dibutuhkan node ini">
            {up.length ? up.map((k) => <Item key={k} kode={k} nama={namaOf(k)} warna={perspWarna(k)} />) : <Empty />}
          </Group>
          {pics.length > 0 && (
            <Group title="Penanggung jawab" hint="">
              {pics.map((p) => (
                <div key={p.unit + p.peran} className="flex items-center justify-between py-0.5 text-xs">
                  <span className="truncate text-bbink">{p.unit}</span>
                  <span className="ml-2 shrink-0 text-bbmuted">{p.peran}</span>
                </div>
              ))}
            </Group>
          )}
        </>
      )}
      {sel.type === 'sasaran' && (
        <Link href={`/portfolio/${encodeURIComponent(sel.id)}`} className="bb-press mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-bbgreen hover:underline">
          Buka program <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-bbborder pt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-bbmuted">{title}</div>
      {hint && <div className="mb-1 text-[10.5px] text-bbfaint">{hint}</div>}
      <div className="mt-1 space-y-1">{children}</div>
    </div>
  )
}
function Item({ kode, nama, warna }: { kode: string; nama: string; warna: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: warna }} />
      <span className="font-mono font-semibold text-bbink">{kode}</span>
      <span className="min-w-0 truncate text-bbmuted" title={nama}>{nama.replace('Meningkatkan Efektivitas dan Kematangan ', '').replace('Manajemen ', '')}</span>
    </div>
  )
}
function Empty() {
  return <div className="text-xs text-bbfaint">—</div>
}

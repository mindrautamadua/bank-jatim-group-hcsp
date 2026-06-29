import { getAllSasaran, getMaturityDomains, getAttentionList, getPicWorkload, getOutcomeKPIs } from './queries'
import { getKnowledgeGraph } from './graph'
import { getActiveTenant } from './tenant'

export type Tone = 'green' | 'amber' | 'red' | 'neutral'

export interface AnswerItem {
  kode?: string
  primary: string
  secondary?: string
  href?: string
  tone?: Tone
  badge?: string
}
export type AnswerBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; title?: string; items: AnswerItem[] }

export interface Answer {
  title: string
  blocks: AnswerBlock[]
  suggestions: string[]
}

const ROLLUP_NAMA = 'Kematangan HCM (rollup PBI.1)'
const healthTone = (h: string): Tone => (h === 'red' ? 'red' : h === 'yellow' ? 'amber' : 'green')
const shortNama = (n: string) =>
  n.replace('Meningkatkan Efektivitas dan Kematangan ', '').replace('Manajemen ', '').replace('Terpenuhinya Kebutuhan ', '')

export const SYSTEM_PROMPT = `Anda "Strategic Assistant" untuk bank dalam Grup Bank Jatim, ahli eksekusi Blueprint Human Capital Management 2026-2030 (model Balanced Scorecard).

ATURAN KETAT:
- Jawab HANYA berdasarkan KNOWLEDGE BASE yang diberikan. JANGAN mengarang angka, kode, nama, atau fakta.
- Jika informasi tidak ada di knowledge base, katakan terus terang "data itu tidak tersedia".
- Jawab ringkas dan to the point dalam Bahasa Indonesia formal. Gunakan bullet (diawali "- ") bila menyebut beberapa item.
- Selalu sebutkan kode program yang relevan (mis. PP.6, F.1, KS.2, PBI.1.a.3).
- Untuk pertanyaan dampak/ketergantungan/percepatan, telusuri relasi "mendukung" (A -> B berarti A fondasi bagi B; alurnya PP -> PBI -> KS/F).
- JANGAN gunakan karakter em-dash atau en-dash; pakai tanda hubung biasa (-).
- Jangan menyapa berlebihan; langsung jawab.`

function extractKodes(q: string): string[] {
  const re = /(PBI\.1\.[ab]\.\d|PBI\.1|PP\.\d|KS\.\d|F\.\d)/gi
  return [...new Set((q.match(re) ?? []).map((s) => s.toUpperCase()))]
}

function push(m: Map<string, string[]>, k: string, v: string) {
  const a = m.get(k)
  if (a) a.push(v)
  else m.set(k, [v])
}

// BFS transitif; mengembalikan Map<node, kedalaman> tanpa start.
function reach(adj: Map<string, string[]>, start: string): Map<string, number> {
  const seen = new Map<string, number>([[start, 0]])
  const queue = [start]
  while (queue.length) {
    const n = queue.shift()!
    for (const m of adj.get(n) ?? []) {
      if (!seen.has(m)) { seen.set(m, (seen.get(n) ?? 0) + 1); queue.push(m) }
    }
  }
  seen.delete(start)
  return seen
}

// Knowledge base ringkas (seluruh strategi) untuk grounding LLM. Dataset kecil → muat penuh.
export async function buildKnowledgeContext(): Promise<string> {
  const [tenant, sasaran, kg, domains, pic, outcomes] = await Promise.all([
    getActiveTenant(), getAllSasaran(), getKnowledgeGraph(), getMaturityDomains(), getPicWorkload(), getOutcomeKPIs(),
  ])
  const L: string[] = []
  L.push(`# KNOWLEDGE BASE: Strategi HCM ${tenant.nama} 2026-2030 (Balanced Scorecard)`)
  L.push('Perspektif: F=Finansial (dampak), KS=Key Stakeholder (hasil pegawai/organisasi), PBI=Proses Bisnis Internal (kematangan HCM), PP=Pembelajaran & Pertumbuhan (kapabilitas/fondasi fungsi HCM).')
  L.push('Tingkat kematangan & target per domain ada di bagian MATURITY di bawah; gunakan angka itu, jangan mengarang.')

  L.push('\n## SASARAN STRATEGIS (kode | perspektif | jenis | status/health/progress | nama)')
  for (const s of sasaran) {
    L.push(`${s.kode} | ${s.perspektif_kode} | ${s.jenis ?? '-'} | ${s.status}/${s.health}/${s.progress}% | ${s.nama}`)
  }

  L.push('\n## INDIKATOR OUTCOME (kode | indikator | target 2026 -> target 2030 | realisasi 2026)')
  for (const o of outcomes) {
    L.push(`${o.kode} | ${o.ik_nama} | ${o.t2026 ?? '-'} -> ${o.t2030 ?? '-'} ${o.satuan ?? ''} | realisasi: ${o.r2026 ?? 'belum diisi'}`)
  }

  L.push('\n## DEPENDENSI (mendukung: "A -> B" artinya A menjadi fondasi bagi B)')
  for (const r of kg.relasi) L.push(`${r.dari} -> ${r.ke}`)

  L.push('\n## KEMATANGAN DOMAIN (nama | cluster | baseline2025 -> target2030 | gap)')
  for (const d of domains) {
    const b = Number(d.baseline2025 ?? 0)
    const t = Number(d.targets.find((x) => x.tahun === 2030)?.target_itk ?? 0)
    L.push(`${d.nama} | ${d.cluster} | ${b.toFixed(2)} -> ${t.toFixed(2)} | gap ${(t - b).toFixed(2)}`)
  }

  L.push('\n## PENANGGUNG JAWAB (unit | jumlah sebagai Utama / Pendukung)')
  for (const p of pic) L.push(`${p.unit} | ${p.utama}U / ${p.pendukung}P`)

  return L.join('\n')
}

export async function answerQuestion(qRaw: string): Promise<Answer> {
  const q = qRaw.trim()
  const ql = q.toLowerCase()
  const kodes = extractKodes(q)

  const [sasaran, kg] = await Promise.all([getAllSasaran(), getKnowledgeGraph()])
  const byKode = new Map(sasaran.map((s) => [s.kode, s]))
  const namaOf = (k: string) => byKode.get(k)?.nama ?? (k === 'PBI.1' ? ROLLUP_NAMA : k)
  const perspOf = (k: string) => byKode.get(k)?.perspektif_kode ?? (k === 'PBI.1' ? 'PBI' : '')
  const hrefOf = (k: string) => (byKode.has(k) ? `/portfolio/${encodeURIComponent(k)}` : undefined)

  const down = new Map<string, string[]>()
  const up = new Map<string, string[]>()
  for (const r of kg.relasi) { push(down, r.dari, r.ke); push(up, r.ke, r.dari) }

  const itemFor = (k: string, depth?: number): AnswerItem => {
    const s = byKode.get(k)
    return {
      kode: k,
      primary: shortNama(namaOf(k)),
      secondary: [perspOf(k), s ? s.status : 'rollup', depth ? `tingkat ${depth}` : ''].filter(Boolean).join(' · '),
      href: hrefOf(k),
      tone: s ? healthTone(s.health) : 'neutral',
    }
  }

  // ---- INTENT: dampak / ripple (downstream) ----
  if (kodes.length && /(dampak|terlambat|telat|terpengaruh|kalau|jika|gagal|mundur|tertunda)/.test(ql)) {
    const k = kodes[0]
    const aff = reach(down, k)
    const sorted = [...aff.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    const outcomes = sorted.filter(([n]) => /^(F|KS)\./.test(n))
    return {
      title: `Dampak bila ${k} terlambat`,
      blocks: [
        { kind: 'text', text: `${k} (${shortNama(namaOf(k))}) menjadi fondasi bagi ${aff.size} sasaran lain — langsung maupun tidak langsung. Keterlambatannya berisiko menjalar ke seluruh sasaran berikut.` },
        ...(outcomes.length ? [{ kind: 'list' as const, title: `Berdampak ke hasil bisnis (${outcomes.length})`, items: outcomes.map(([n, d]) => itemFor(n, d)) }] : []),
        { kind: 'list', title: `Seluruh sasaran terdampak (${sorted.length})`, items: sorted.map(([n, d]) => itemFor(n, d)) },
      ],
      suggestions: [`Apa prasyarat ${k}?`, `Jelaskan ${k}`, 'Program apa yang paling fondasional?'],
    }
  }

  // ---- INTENT: prasyarat / percepatan (upstream) ----
  if (kodes.length && /(prasyarat|butuh|dibutuhkan|percepat|dipercepat|tercapai|fondasi untuk|bergantung|tergantung|syarat)/.test(ql)) {
    const k = kodes[0]
    const deps = reach(up, k)
    const sorted = [...deps.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    const behind = sorted.filter(([n]) => { const s = byKode.get(n); return s && s.health !== 'green' })
    return {
      title: `Prasyarat untuk mencapai ${k}`,
      blocks: [
        { kind: 'text', text: `${k} (${shortNama(namaOf(k))}) bergantung pada ${deps.size} sasaran fondasi. Untuk mempercepat ${k}, prioritaskan fondasi yang sedang bermasalah.` },
        ...(behind.length ? [{ kind: 'list' as const, title: `Fondasi yang perlu dipercepat (${behind.length})`, items: behind.map(([n, d]) => itemFor(n, d)) }] : [{ kind: 'text' as const, text: 'Saat ini tidak ada fondasi yang ditandai bermasalah (semua health hijau / rencana).' }]),
        { kind: 'list', title: `Semua prasyarat (${sorted.length})`, items: sorted.map(([n, d]) => itemFor(n, d)) },
      ],
      suggestions: [`Apa dampak bila ${k} terlambat?`, `Jelaskan ${k}`, 'Program apa yang paling berisiko?'],
    }
  }

  // ---- INTENT: risiko / perlu perhatian ----
  if (/(risiko|berisiko|perhatian|bermasalah|merah|delayed|terlambat|at risk|rawan|gagal)/.test(ql) && !kodes.length) {
    const [attention, outcomes] = await Promise.all([getAttentionList(), getOutcomeKPIs()])
    const below = outcomes.filter((o) => o.r2026 !== null && o.t2026 !== null && (o.arah === 'turun' ? o.r2026! > o.t2026! : o.r2026! < o.t2026!))
    const blocks: AnswerBlock[] = []
    if (attention.length) {
      blocks.push({ kind: 'list', title: `Program ditandai berisiko/terlambat (${attention.length})`, items: attention.map((a) => ({ kode: a.kode, primary: shortNama(a.nama), secondary: `${a.perspektif_kode} · ${a.status} · ${a.progress}%`, href: `/portfolio/${encodeURIComponent(a.kode)}`, tone: healthTone(a.health) })) })
    } else {
      blocks.push({ kind: 'text', text: 'Belum ada program yang ditandai berisiko (health kuning/merah) atau terlambat oleh PMO.' })
    }
    if (below.length) {
      blocks.push({ kind: 'list', title: `KPI di bawah target 2026 (${below.length})`, items: below.map((o) => ({ kode: o.kode, primary: shortNama(o.ik_nama), secondary: `realisasi vs target 2026`, href: `/portfolio/${encodeURIComponent(o.kode)}`, tone: 'red' })) })
    }
    return {
      title: 'Program & indikator yang paling berisiko',
      blocks,
      suggestions: ['Area maturity mana yang gap-nya terbesar?', 'Siapa penanggung jawab paling terbeban?', 'Apa fokus tahun 2026?'],
    }
  }

  // ---- INTENT: maturity gap ----
  if (/(maturity|kematangan|gap|tertinggal|skor)/.test(ql)) {
    const domains = await getMaturityDomains()
    const gaps = domains
      .map((d) => { const b = Number(d.baseline2025 ?? 0); const t = Number(d.targets.find((x) => x.tahun === 2030)?.target_itk ?? 0); return { d, gap: t - b, b, t } })
      .sort((a, b) => b.gap - a.gap).slice(0, 6)
    return {
      title: 'Gap kematangan terbesar menuju target 2030',
      blocks: [
        { kind: 'text', text: 'Domain dengan jarak terbesar antara baseline 2025 dan target 2030 perlu prioritas dan anggaran. Cluster HCIS paling tertinggal.' },
        { kind: 'list', items: gaps.map(({ d, gap, b, t }) => ({ primary: shortNama(d.nama), secondary: `${d.cluster} · ${b.toFixed(2)} menuju ${t.toFixed(2)}`, tone: gap >= 0.6 ? 'amber' : 'green', badge: `+${gap.toFixed(2)}`, href: '/maturity' })) },
      ],
      suggestions: ['Program apa yang paling berisiko?', 'Apa dampak bila PP.4 terlambat?', 'Program apa yang paling fondasional?'],
    }
  }

  // ---- INTENT: fondasi / paling penting ----
  if (/(fondasi|fondasional|paling penting|prioritas|kritis|tumpuan|sentral|kunci)/.test(ql)) {
    const ranked = [...byKode.keys(), 'PBI.1']
      .map((k) => ({ k, n: reach(down, k).size }))
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n).slice(0, 6)
    return {
      title: 'Program paling fondasional (tumpuan terbanyak)',
      blocks: [
        { kind: 'text', text: 'Diukur dari berapa banyak sasaran yang bergantung padanya (langsung & tidak langsung). Keterlambatan di sini berdampak paling luas.' },
        { kind: 'list', items: ranked.map(({ k, n }) => ({ kode: k, primary: shortNama(namaOf(k)), secondary: `${perspOf(k)} · menopang ${n} sasaran`, href: hrefOf(k), tone: 'green', badge: `${n}` })) },
      ],
      suggestions: [`Apa dampak bila ${ranked[0]?.k ?? 'PP.6'} terlambat?`, 'Program apa yang paling berisiko?', 'Apa fokus tahun 2026?'],
    }
  }

  // ---- INTENT: PIC / beban ----
  if (/(penanggung jawab|pic|beban|bottleneck|unit|divisi|bagian)/.test(ql)) {
    const pic = await getPicWorkload()
    const top = pic.slice(0, 6)
    return {
      title: 'Beban penanggung jawab',
      blocks: [
        { kind: 'text', text: `Divisi SDM menjadi Penanggung Jawab Utama pada mayoritas program — titik konsentrasi yang perlu diwaspadai sebagai bottleneck.` },
        { kind: 'list', items: top.map((p) => ({ primary: p.unit, secondary: `${p.utama} utama · ${p.pendukung} pendukung`, tone: p.utama >= 10 ? 'amber' : 'neutral', badge: `${p.utama}U` })) },
      ],
      suggestions: ['Program apa yang paling berisiko?', 'Apa fokus tahun 2026?', 'Area maturity mana yang gap-nya terbesar?'],
    }
  }

  // ---- INTENT: fokus tahun ini ----
  if (/(fokus|tahun ini|2026|harus naik|prioritas tahun)/.test(ql)) {
    const domains = await getMaturityDomains()
    const naik = domains
      .map((d) => { const b = Number(d.baseline2025 ?? 0); const t = Number(d.targets.find((x) => x.tahun === 2026)?.target_itk ?? 0); return { d, step: t - b, b, t } })
      .filter((x) => x.step > 0).sort((a, b) => b.step - a.step)
    return {
      title: 'Fokus kematangan tahun 2026',
      blocks: [
        { kind: 'text', text: `${naik.length} domain ditargetkan naik kematangannya tahun ini. Urut dari lompatan terbesar.` },
        { kind: 'list', items: naik.map(({ d, step, b, t }) => ({ primary: shortNama(d.nama), secondary: `${d.cluster} · ${b.toFixed(2)} menuju ${t.toFixed(2)} (2026)`, badge: `+${step.toFixed(2)}`, tone: 'green', href: '/maturity' })) },
      ],
      suggestions: ['Program apa yang paling berisiko?', 'Program apa yang paling fondasional?', 'Siapa penanggung jawab paling terbeban?'],
    }
  }

  // ---- INTENT: jelaskan / default untuk kode ----
  if (kodes.length) {
    const k = kodes[0]
    const s = byKode.get(k)
    const dCount = (down.get(k) ?? []).length
    const uCount = (up.get(k) ?? []).length
    const pics = kg.pic.filter((p) => p.kode === k)
    return {
      title: `${k} — ${shortNama(namaOf(k))}`,
      blocks: [
        { kind: 'text', text: s ? `Perspektif ${s.perspektif_nama}. Status: ${s.status} (health ${s.health}, progress ${s.progress}%). ${s.key_program ?? ''}` : `${ROLLUP_NAMA}: node agregat kematangan HCM.` },
        { kind: 'list', title: 'Keterkaitan', items: [
          { primary: `Mendukung ${dCount} sasaran`, secondary: 'lihat dampak hilir', tone: 'neutral' },
          { primary: `Didukung oleh ${uCount} sasaran`, secondary: 'prasyarat / fondasi', tone: 'neutral' },
          ...(pics.length ? [{ primary: `Penanggung jawab: ${pics.find((p) => p.peran === 'Utama')?.unit ?? '-'}`, secondary: `${pics.length} unit terlibat`, tone: 'neutral' as Tone }] : []),
        ] },
        ...(hrefOf(k) ? [{ kind: 'list' as const, items: [{ kode: k, primary: 'Buka halaman program', href: hrefOf(k), tone: 'green' as Tone }] }] : []),
      ],
      suggestions: [`Apa dampak bila ${k} terlambat?`, `Apa prasyarat ${k}?`, 'Program apa yang paling berisiko?'],
    }
  }

  // ---- fallback ----
  return {
    title: 'Tanyakan tentang strategi HCM',
    blocks: [
      { kind: 'text', text: 'Saya menjawab dari data Blueprint & knowledge graph (tanpa mengarang). Coba salah satu pertanyaan berikut, atau sebutkan kode program (mis. PP.6, F.1, KS.2).' },
    ],
    suggestions: [
      'Program apa yang paling berisiko?',
      'Apa dampak bila PP.6 terlambat?',
      'Area maturity mana yang gap-nya terbesar?',
      'Program apa yang paling fondasional?',
      'Siapa penanggung jawab paling terbeban?',
      'Apa fokus tahun 2026?',
    ],
  }
}

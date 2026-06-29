import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import { getProgramDetail, type KegiatanRow } from '@/lib/program-detail'
import { getKegiatanForSasaran, getPicForKode, type Kegiatan } from '@/lib/kegiatan'
import { getRincianProgressForSasaran } from '@/lib/kegiatan-rincian'
import { getHasilEvidenceForSasaran, type HasilEvidence } from '@/lib/kegiatan-hasil'
import { getSession } from '@/lib/auth'
import { peranOf, kegiatanStatusBadge, fmtBytes } from '@/lib/kegiatan-constants'
import { Target, BookOpen, ListChecks, CalendarClock, CheckSquare, ChevronRight, UserCheck, Paperclip } from 'lucide-react'

// Detail "Implementasi Program HCM" dari Blueprint (Tujuan, Gambaran Umum,
// Kegiatan Utama & Hasil Pelaksanaan). Kegiatan utama bersifat operasional:
// dipantau, diajukan Pendukung, diverifikasi Utama (evidence wajib).
// keyProgramSlot dirender di antara Tujuan/Gambaran Umum dan daftar Kegiatan,
// agar urutan halaman: Tujuan/Latar Belakang → Gambaran Umum → Key Program → Kegiatan.
export default async function ProgramBlueprint({ kode, keyProgramSlot }: { kode: string; keyProgramSlot?: ReactNode }) {
  const detail = await getProgramDetail(kode)
  if (!detail) return null
  const { tujuan, gambaranUmum, kegiatan } = detail

  const [dbKeg, pic, user, rincianProg, hasilEv] = await Promise.all([
    getKegiatanForSasaran(kode),
    getPicForKode(kode),
    getSession(),
    getRincianProgressForSasaran(kode),
    getHasilEvidenceForSasaran(kode),
  ])
  const byUrutan = new Map<number, Kegiatan>(dbKeg.map((k) => [k.urutan, k]))
  // Progress terverifikasi terakhir per (kegiatan_id, rincian_index).
  const verifiedRincian = new Map<string, number>()
  for (const r of rincianProg) {
    const key = `${r.kegiatan_id}:${r.rincian_index}`
    if (r.status === 'Diverifikasi' && !verifiedRincian.has(key)) verifiedRincian.set(key, r.progress)
  }
  // Evidence yang sudah diverifikasi per (kegiatan_id, hasil_index) — terbaru dulu.
  const verifiedEvByHasil = new Map<string, HasilEvidence[]>()
  for (const e of hasilEv) {
    if (e.status !== 'Diverifikasi') continue
    const key = `${e.kegiatan_id}:${e.hasil_index}`
    const arr = verifiedEvByHasil.get(key) ?? []
    arr.push(e)
    verifiedEvByHasil.set(key, arr)
  }
  const peran = peranOf(user?.unit, pic)

  return (
    <div className="mb-6 space-y-6">
      <div className="space-y-6">
        {tujuan.length > 0 && (
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-bbink">
              <Target size={18} className="text-bbgreen" /> Tujuan / Latar Belakang
            </h2>
            <PointList items={tujuan} />
          </Card>
        )}
        {gambaranUmum.length > 0 && (
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-bbink">
              <BookOpen size={18} className="text-bbgreen" /> Gambaran Umum
            </h2>
            <PointList items={gambaranUmum} />
          </Card>
        )}
      </div>

      {keyProgramSlot}

      {kegiatan.length > 0 && (
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-bbink">
            <ListChecks size={18} className="text-bbgreen" /> Kegiatan Utama &amp; Hasil Pelaksanaan
          </h2>
          <p className="mb-3 text-xs text-bbmuted">{kegiatan.length} key program dipantau. Progress terverifikasi & evidence ditampilkan di bawah; pembaruan/verifikasi dilakukan di halaman Gantt.</p>
          {peran && (
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-bbgreen-light/50 px-2.5 py-1 text-xs font-medium text-bbgreen-dark">
              <UserCheck size={13} /> Peran Anda di program ini: Penanggung Jawab {peran === 'utama' ? 'Utama' : 'Pendukung'}
            </p>
          )}
          <div className="space-y-2.5">
            {kegiatan.map((row, i) => {
              const k = byUrutan.get(i)
              const rincianVerified = row.rincian.map((_, ri) => (k ? verifiedRincian.get(`${k.id}:${ri}`) ?? null : null))
              const hasilEvidence = row.hasil.map((_, hi) => (k ? verifiedEvByHasil.get(`${k.id}:${hi}`) ?? [] : []))
              return (
                <KegiatanItem
                  key={i} no={i + 1} row={row} kegiatan={k} rincianVerified={rincianVerified} hasilEvidence={hasilEvidence}
                />
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// Pisahkan narasi yang memuat penomoran berurut di dalamnya (angka Romawi I. II. …
// atau angka biasa 1. 2. …) menjadi intro + daftar item, agar mudah dibaca.
function splitEnumerated(text: string): { intro: string; items: { label: string; text: string }[] } | null {
  const re = /\s+((?:[IVXLCDM]+|\d{1,2})\.)\s+(?=[A-Z])/g
  const marks: { at: number; label: string; from: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) marks.push({ at: m.index, label: m[1], from: m.index + m[0].length })
  if (marks.length < 2) return null
  const intro = text.slice(0, marks[0].at).trim()
  const items = marks.map((mk, i) => ({
    label: mk.label,
    text: text.slice(mk.from, i + 1 < marks.length ? marks[i + 1].at : text.length).trim(),
  }))
  return { intro, items }
}

function PointList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5 text-sm leading-relaxed text-bbmuted">
      {items.map((t, i) => {
        const enumd = splitEnumerated(t)
        return (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bbgreen-light text-[11px] font-semibold tabular-nums text-bbgreen-dark">{i + 1}</span>
            {enumd ? (
              <div className="min-w-0 flex-1 space-y-1.5">
                {enumd.intro && <p>{enumd.intro}</p>}
                <ul className="space-y-1.5">
                  {enumd.items.map((it, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="shrink-0 font-semibold tabular-nums text-bbink">{it.label}</span>
                      <span className="min-w-0">{it.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <span>{t}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function KegiatanItem({
  no, row, kegiatan, rincianVerified, hasilEvidence,
}: {
  no: number; row: KegiatanRow; kegiatan?: Kegiatan; rincianVerified: (number | null)[]; hasilEvidence: HasilEvidence[][]
}) {
  const status = kegiatan?.status ?? 'Belum Dikerjakan'
  return (
    <details className="group rounded-lg border border-bbborder bg-bbbg/40 [&_svg.chev]:open:rotate-90">
      <summary className="flex cursor-pointer list-none items-start gap-2.5 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight size={16} className="chev mt-0.5 shrink-0 text-bbmuted transition-transform" />
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-bbgreen text-[11px] font-bold tabular-nums text-white">{no}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug text-bbink">{row.program}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {row.waktu && (
              <span className="inline-flex items-center gap-1 text-[11px] text-bbmuted"><CalendarClock size={11} /> {row.waktu}</span>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${kegiatanStatusBadge[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
            <span className="inline-flex items-center gap-1 rounded bg-bbgreen-light/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-bbgreen-dark" title="Progress terverifikasi key program">
              {kegiatan?.progress ?? 0}% terverifikasi
            </span>
          </span>
        </span>
      </summary>
      <div className="border-t border-bbborder px-3.5 py-3.5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-bbfaint">Kegiatan Utama</div>
            {row.rincian.length ? (
              <ul className="space-y-1.5 text-sm leading-relaxed text-bbmuted">
                {row.rincian.map((r, i) => {
                  const prog = rincianVerified[i]
                  return (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-bbgreen/70" />
                      <span className="min-w-0 flex-1">
                        {r}
                        <span className="ml-1.5 whitespace-nowrap rounded bg-bbgreen-light/60 px-1.5 py-px text-[10px] font-semibold tabular-nums text-bbgreen-dark" title="Progress terverifikasi">
                          {prog ?? 0}%
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="text-sm text-bbmuted">-</p>}
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-bbfaint">
              <CheckSquare size={12} /> Hasil Pelaksanaan
            </div>
            {row.hasil.length ? (
              <ul className="space-y-2 text-sm leading-relaxed text-bbink">
                {row.hasil.map((h, i) => {
                  const ev = hasilEvidence[i] ?? []
                  return (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-bbamber" />
                      <span className="min-w-0 flex-1">
                        {h}
                        {ev.length > 0 && (
                          <span className="mt-1 flex flex-col gap-1">
                            {ev.map((e) => (
                              <a
                                key={e.id}
                                href={`/api/evidence/hasil/${e.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-fit items-center gap-1.5 rounded-md border border-bbborder bg-white px-2 py-1 text-xs font-medium text-bbgreen hover:bg-bbgreen-light/40"
                                title={`Evidence terverifikasi — ${e.evidence_nama}`}
                              >
                                <Paperclip size={12} /> {e.evidence_nama} <span className="text-bbfaint">({fmtBytes(e.evidence_size)})</span>
                              </a>
                            ))}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="text-sm text-bbmuted">-</p>}
          </div>
        </div>
      </div>
    </details>
  )
}

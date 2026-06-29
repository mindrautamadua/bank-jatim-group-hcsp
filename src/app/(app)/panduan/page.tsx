import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutDashboard, Network, Gauge, GanttChartSquare, Share2, FileText, BookOpen, UserCog,
  PencilLine, ShieldCheck, Compass, Target, Activity,
  Sparkles, Database, LineChart, Workflow, HelpCircle, Check, Minus, ChevronRight, type LucideIcon,
} from 'lucide-react'
import { PageHeader, Card, Badge } from '@/components/ui'
import { roleBadge, roleLabel } from '@/lib/users-constants'

export const metadata: Metadata = {
  title: 'Panduan',
}

// ── Menu yang dijelaskan (selaras dengan navigasi sidebar saat ini) ──────────
interface MenuDoc { href: string; label: string; icon: LucideIcon; desc: string; edit?: string }
const menuGroups: { group: string; items: MenuDoc[] }[] = [
  {
    group: 'Ringkasan',
    items: [
      {
        href: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard,
        desc: 'Halaman ringkasan eksekutif: KPI utama (total program, kematangan, program on-track, unit penanggung jawab), kesehatan portfolio, program yang perlu perhatian, progress per perspektif Balanced Scorecard, dan update terbaru — gambaran cepat status eksekusi Blueprint HCM 2026–2030 dalam satu layar.',
      },
      {
        href: '/strategy-map', label: 'HCM Strategy Map', icon: Network,
        desc: 'Peta strategi Balanced Scorecard: seluruh sasaran strategis HCM 2026–2030 dikelompokkan per perspektif. Klik sebuah sasaran untuk membuka detail program (target IK, key program, PIC, realisasi, dan riwayat update).',
      },
      {
        href: '/maturity', label: 'Maturity & Gap', icon: Gauge,
        desc: 'Tingkat kematangan 13 domain HCM (skala 1–4) beserta gap menuju target. Menampilkan posisi saat ini vs aspirasi.',
        edit: 'PMO/Admin memperbarui realisasi kematangan lewat tombol "Update PMO".',
      },
    ],
  },
  {
    group: 'Eksekusi & Analisis',
    items: [
      {
        href: '/gantt', label: 'Gantt Chart Program', icon: GanttChartSquare,
        desc: 'Linimasa pelaksanaan seluruh program & key program. Sumber kebenaran progress eksekusi — status, health, dan progress sasaran dihitung otomatis dari progress key program yang terverifikasi di sini.',
        edit: 'Penanggung Jawab memperbarui di sini: PIC Pendukung mengajukan progress, PIC Utama memverifikasi (Admin dapat menjadi override).',
      },
      {
        href: '/graph', label: 'Knowledge Graph', icon: Share2,
        desc: 'Visualisasi keterhubungan antar entitas: perspektif, sasaran, indikator, unit/divisi, dan dokumen. Berguna untuk menelusuri keterkaitan strategi.',
      },
      {
        href: '/report', label: 'Board Pack / Laporan', icon: FileText,
        desc: 'Ringkasan eksekutif siap-presentasi untuk Direksi: capaian strategis, kematangan, dan program yang perlu perhatian. Dapat diekspor.',
      },
    ],
  },
  {
    group: 'Sistem',
    items: [
      {
        href: '/glossary', label: 'Glossary', icon: BookOpen,
        desc: 'Daftar istilah, singkatan, dan konsep yang dipakai di platform (Balanced Scorecard, IK, kematangan, peran pengguna, dll.).',
      },
      {
        href: '/users', label: 'Manajemen Pengguna', icon: UserCog,
        desc: 'Kelola akun pengguna, peran, dan unit. Hanya dapat diakses oleh Administrator.',
        edit: 'Khusus Administrator.',
      },
    ],
  },
]

// ── Peran pengguna & akses ───────────────────────────────────────────────────
const peran: { role: string; label: string; akses: string }[] = [
  { role: 'admin', label: 'Administrator', akses: 'Akses penuh: mengelola seluruh data eksekusi sekaligus akun pengguna, peran, dan unit.' },
  { role: 'pmo', label: 'PMO Human Capital', akses: 'Menginput & memperbarui realisasi indikator kinerja (IK), tingkat kematangan, serta data pendukung (dokumen & snapshot tren) lintas sasaran. Status, health & progress sasaran dihitung otomatis. Progress key program dikelola Penanggung Jawab, bukan PMO. Bukan PIC program.' },
  { role: 'viewer', label: 'Penanggung Jawab', akses: 'Mengajukan & menyetujui update kegiatan utama dan hasil pekerjaan pada program unitnya. Bila diberi Unit/Divisi, menjadi PIC kegiatan — Utama (memverifikasi/menyetujui laporan) atau Pendukung (mengajukan laporan + evidence), sesuai pemetaan PIC tiap sasaran. Tanpa unit, hanya dapat melihat data.' },
]

function RolePill({ role, label }: { role: string; label: string }) {
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadge[role] ?? 'bg-gray-100 text-gray-600'}`}>{roleLabel[role] ?? label}</span>
}

// ── Alur verifikasi laporan (status di Gantt) ────────────────────────────────
const statusFlow: { label: string; cls: string; note: string }[] = [
  { label: 'Belum Dikerjakan', cls: 'bg-gray-100 text-gray-600', note: 'Kondisi awal, belum ada pengajuan.' },
  { label: 'Diajukan', cls: 'bg-amber-50 text-amber-700', note: 'PIC Pendukung mengajukan progress + evidence.' },
  { label: 'Diverifikasi', cls: 'bg-bbgreen-light text-bbgreen-dark', note: 'PIC Utama menyetujui — baru dihitung ke progress.' },
]

// ── Matriks hak akses (aksi × peran) ─────────────────────────────────────────
type Akses = boolean | string
const aksesMatrix: { aksi: string; admin: Akses; pmo: Akses; pj: Akses }[] = [
  { aksi: 'Lihat seluruh data', admin: true, pmo: true, pj: true },
  { aksi: 'Update realisasi IK', admin: true, pmo: true, pj: false },
  { aksi: 'Update kematangan (Maturity)', admin: true, pmo: true, pj: false },
  { aksi: 'Ajukan progress + evidence (Gantt)', admin: true, pmo: false, pj: 'Pendukung' },
  { aksi: 'Verifikasi progress / evidence', admin: true, pmo: false, pj: 'Utama' },
  { aksi: 'Reset progress / hapus evidence', admin: true, pmo: false, pj: false },
  { aksi: 'Kelola pengguna & peran', admin: true, pmo: false, pj: false },
  { aksi: 'Ganti kata sandi sendiri', admin: true, pmo: true, pj: true },
]

function AksesCell({ v }: { v: Akses }) {
  if (v === true) return <Check size={15} className="mx-auto text-bbgreen" aria-label="Bisa" />
  if (v === false) return <Minus size={15} className="mx-auto text-bbfaint" aria-label="Tidak" />
  return <span className="mx-auto inline-block rounded bg-bbgreen-light/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-bbgreen-dark">{v}</span>
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
const faq: { q: string; a: string }[] = [
  { q: 'Saya sudah melapor progress, kenapa progress sasaran belum naik?', a: 'Progress hanya dihitung setelah laporan Diverifikasi oleh PIC Utama. Laporan yang masih berstatus "Diajukan" belum memengaruhi angka.' },
  { q: 'Kenapa saya tidak bisa mengajukan atau memverifikasi di Gantt?', a: 'Hanya pimpinan unit PIC yang berwenang: PIC Pendukung mengajukan, PIC Utama memverifikasi (Admin dapat menjadi override). PMO tidak mengelola progress key program.' },
  { q: 'Tipe dan ukuran file evidence?', a: 'PDF, Word, Excel, PowerPoint, gambar (PNG/JPG), atau ZIP — maksimal 15 MB per berkas.' },
  { q: 'Bagaimana mengganti kata sandi?', a: 'Klik menu profil di kanan atas → "Ganti kata sandi".' },
  { q: 'Salah input atau verifikasi — bagaimana mengulang?', a: 'Administrator dapat mereset progress Kegiatan Utama (konfirmasi ketik RESET) dan menghapus evidence (konfirmasi ketik DELETE).' },
  { q: 'Kenapa status & health tidak bisa diubah manual?', a: 'Status, health, dan progress sasaran dihitung otomatis dari progress key program yang terverifikasi — menjaga konsistensi dan objektivitas angka.' },
  { q: 'Saya butuh akun, atau ubah peran/unit.', a: 'Hubungi Administrator (Divisi Sumber Daya Manusia).' },
]

// ── Alur kerja singkat ───────────────────────────────────────────────────────
const langkah = [
  { t: 'Pahami strategi', d: 'Mulai dari HCM Strategy Map untuk melihat sasaran strategis per perspektif Balanced Scorecard.' },
  { t: 'Telusuri program', d: 'Klik sebuah sasaran untuk membuka detail: target indikator kinerja, key program, PIC, dan realisasi terkini.' },
  { t: 'Perbarui realisasi IK (PMO/Admin)', d: 'Di detail program, gunakan tombol "Update Realisasi IK" untuk mengisi realisasi indikator kinerja sesuai frekuensi (bulanan/triwulanan/semesteran/tahunan) per tahun.' },
  { t: 'Laporkan & verifikasi progress (Penanggung Jawab)', d: 'Progress key program dikelola di halaman Gantt: PIC Pendukung mengajukan progress + evidence, PIC Utama memverifikasi. Status, health, & progress sasaran dihitung otomatis dari hasil yang terverifikasi.' },
  { t: 'Pantau & laporkan', d: 'Lihat kematangan di Maturity & Gap, dan susun ringkasan untuk Direksi di Board Pack / Laporan.' },
]

// Pilar nilai untuk slide "Mengapa HCSP?"
const pilar: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: Target, t: 'Strategi → Eksekusi', d: 'Blueprint dipetakan ke Balanced Scorecard: sasaran, indikator kinerja, hingga key program.' },
  { icon: Database, t: 'Satu Sumber Kebenaran', d: 'Seluruh progress, realisasi, & status dalam satu tempat — bukan tersebar di Excel/PowerPoint.' },
  { icon: ShieldCheck, t: 'Akuntabel & Berbukti', d: 'Progress diajukan, diverifikasi, didukung evidence; status & health dihitung otomatis.' },
  { icon: LineChart, t: 'Visibilitas Pimpinan', d: 'Dashboard, Gantt, & Board Pack menampilkan mana on-track vs berisiko seketika.' },
]

export default function PanduanPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Panduan Aplikasi"
        subtitle="Pengenalan platform HCSP (Human Capital Strategic Planning) Grup Bank Jatim: fungsi tiap menu, alur kerja, dan pembagian peran pengguna."
      />

      {/* Slide: Mengapa HCSP? (ringkas, untuk presentasi; gradient mandiri agar tetap tampil saat dicetak) */}
      <section
        className="mb-6 overflow-hidden rounded-2xl p-6 text-white sm:p-8 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, rgba(240,184,0,0.18) 0%, transparent 42%),' +
            'radial-gradient(100% 60% at 100% 100%, rgba(255,255,255,0.10) 0%, transparent 50%),' +
            'linear-gradient(165deg, var(--bb-green) 0%, var(--bb-green-dark) 55%, var(--bb-green-deep) 100%)',
        }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          <Sparkles size={14} /> Mengapa HCSP?
        </div>
        <h2 className="mt-3 max-w-3xl font-display text-xl font-bold leading-snug sm:text-[1.6rem]">
          Memastikan Blueprint HCM 2026–2030 benar-benar dieksekusi, terukur, dan terbukti — bukan dokumen strategi yang tersimpan di rak.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/75">
          Tanpa alat ini, eksekusi strategi sulit dipantau: progress tersebar di Excel/PowerPoint, tidak ada satu sumber kebenaran,
          klaim &ldquo;selesai&rdquo; tanpa bukti, dan pimpinan tak punya gambaran cepat mana yang on-track atau berisiko.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pilar.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl bg-white/10 p-3.5">
              <Icon size={18} className="text-bbgold" />
              <div className="mt-2 font-display text-sm font-bold">{t}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-white/70">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-white/15 pt-4 text-sm leading-relaxed text-white/85">
          <span className="font-semibold text-white">Intinya:</span> HCSP mengubah strategi HCM dari rencana di atas kertas menjadi
          eksekusi yang terpantau, terukur, dan akuntabel — agar investasi pada Blueprint 2026–2030 menghasilkan dampak bisnis nyata.
        </p>
      </section>

      {/* Tentang */}
      <Card className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 font-display font-semibold text-bbink">
          <Compass size={18} className="text-bbgreen" /> Tentang aplikasi
        </h2>
        <p className="text-sm leading-relaxed text-bbmuted">
          HCSP adalah platform eksekusi <span className="font-medium text-bbink">Blueprint Human Capital Management 2026–2030</span> Grup Bank Jatim.
          Aplikasi memetakan strategi human capital dengan kerangka <span className="font-medium text-bbink">Balanced Scorecard</span> (4 perspektif),
          lalu memantau capaian <span className="font-medium text-bbink">indikator kinerja (IK)</span>, tingkat <span className="font-medium text-bbink">kematangan</span> 13 domain HCM,
          serta progress eksekusi program dalam satu tempat.
        </p>
      </Card>

      {/* Alur kerja */}
      <Card className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-bbink">
          <Activity size={18} className="text-bbgreen" /> Alur kerja singkat
        </h2>
        <ol className="space-y-3">
          {langkah.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bbgreen-light text-[12px] font-semibold tabular-nums text-bbgreen-dark">{i + 1}</span>
              <div className="text-sm leading-relaxed">
                <span className="font-medium text-bbink">{s.t}.</span>{' '}
                <span className="text-bbmuted">{s.d}</span>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Menu */}
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-bbink">
        <Target size={18} className="text-bbgreen" /> Penjelasan menu
      </h2>
      <div className="mb-6 space-y-5">
        {menuGroups.map((g) => (
          <div key={g.group}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-bbfaint">{g.group}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map(({ href, label, icon: Icon, desc, edit }) => (
                <Card key={href} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bbgreen-light text-bbgreen">
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <Link href={href} className="font-display font-semibold text-bbink hover:text-bbgreen hover:underline">{label}</Link>
                  </div>
                  <p className="text-sm leading-relaxed text-bbmuted">{desc}</p>
                  {edit && (
                    <p className="mt-auto flex items-start gap-1.5 rounded-lg bg-bbgreen-light/30 px-2.5 py-1.5 text-xs text-bbmuted">
                      <PencilLine size={13} className="mt-0.5 shrink-0 text-bbgreen" /> {edit}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Peran pengguna */}
      <Card className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-bbink">
          <ShieldCheck size={18} className="text-bbgreen" /> Peran pengguna &amp; akses
        </h2>
        <p className="mb-4 text-sm text-bbmuted">Hak akses ditentukan oleh peran. Administrator &amp; PMO mengelola data eksekusi platform; Penanggung Jawab mengajukan/menyetujui laporan kegiatan di unitnya.</p>
        <ul className="space-y-3">
          {peran.map((p) => (
            <li key={p.role} className="flex flex-col gap-1.5 border-b border-bbborder pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="shrink-0 sm:w-44"><RolePill role={p.role} label={p.label} /></span>
              <span className="text-sm leading-relaxed text-bbmuted">{p.akses}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg bg-bbgreen-light/30 px-3 py-2 text-xs text-bbmuted">
          <span className="font-semibold text-bbink">PMO ≠ Penanggung Jawab.</span> PMO mengelola data eksekusi keseluruhan platform; Penanggung Jawab hanya menangani alur laporan kegiatan di program unitnya.
        </p>
      </Card>

      {/* Alur verifikasi laporan */}
      <Card className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-bbink">
          <Workflow size={18} className="text-bbgreen" /> Alur verifikasi laporan
        </h2>
        <p className="mb-4 text-sm text-bbmuted">
          Setiap laporan progress &amp; evidence di halaman Gantt melewati siklus status berikut. Angka progress baru
          dihitung <span className="font-medium text-bbink">setelah Diverifikasi</span>.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {statusFlow.map((s, i) => (
            <div key={s.label} className="flex items-stretch gap-2">
              <div className="flex-1 rounded-lg border border-bbborder bg-white p-3">
                <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                <p className="mt-1.5 text-[11.5px] leading-snug text-bbmuted">{s.note}</p>
              </div>
              {i < statusFlow.length - 1 && (
                <ChevronRight size={16} className="my-auto hidden shrink-0 text-bbfaint sm:block" />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Dikembalikan:</span>
          <span>Bila PIC Utama menolak, status menjadi <span className="font-semibold">Dikembalikan</span> (disertai catatan) dan kembali ke PIC Pendukung untuk direvisi lalu diajukan ulang.</span>
        </p>
      </Card>

      {/* Matriks hak akses */}
      <Card className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-bbink">
          <ShieldCheck size={18} className="text-bbgreen" /> Matriks hak akses
        </h2>
        <p className="mb-4 text-sm text-bbmuted">Ringkasan siapa boleh melakukan apa. <span className="font-medium text-bbink">Pendukung/Utama</span> = peran PIC pada Penanggung Jawab berunit.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-bbborder text-left">
                <th className="py-2 pr-3 font-semibold text-bbink">Aksi</th>
                <th className="px-2 py-2 text-center font-semibold text-bbink">Administrator</th>
                <th className="px-2 py-2 text-center font-semibold text-bbink">PMO</th>
                <th className="px-2 py-2 text-center font-semibold text-bbink">Penanggung Jawab</th>
              </tr>
            </thead>
            <tbody>
              {aksesMatrix.map((r) => (
                <tr key={r.aksi} className="border-b border-bbborder/60 last:border-0">
                  <td className="py-2 pr-3 text-bbmuted">{r.aksi}</td>
                  <td className="px-2 py-2 text-center"><AksesCell v={r.admin} /></td>
                  <td className="px-2 py-2 text-center"><AksesCell v={r.pmo} /></td>
                  <td className="px-2 py-2 text-center"><AksesCell v={r.pj} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-bbink">
          <HelpCircle size={18} className="text-bbgreen" /> Pertanyaan umum (FAQ)
        </h2>
        <div className="mt-2 divide-y divide-bbborder/60">
          {faq.map((f) => (
            <details key={f.q} className="group py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-bbink">
                <span>{f.q}</span>
                <ChevronRight size={15} className="shrink-0 text-bbfaint transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-1.5 text-sm leading-relaxed text-bbmuted">{f.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <p className="text-sm text-bbmuted">
        Butuh definisi istilah? Buka <Link href="/glossary" className="font-medium text-bbgreen hover:underline">Glossary</Link>.
        Untuk menambah/ubah akun &amp; peran, hubungi Administrator.
      </p>
    </div>
  )
}

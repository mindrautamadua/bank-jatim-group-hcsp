'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

interface Term {
  istilah: string
  singkatan?: string
  definisi: string
}

interface Kategori {
  nama: string
  terms: Term[]
}

const GLOSSARY: Kategori[] = [
  {
    nama: 'Kerangka & Model',
    terms: [
      { istilah: 'HCSP', singkatan: 'HCSP', definisi: 'Platform eksekusi & monitoring Blueprint Human Capital Management Grup Bank Jatim 2026–2030.' },
      { istilah: 'Human Capital Management', singkatan: 'HCM', definisi: 'Pengelolaan sumber daya manusia secara strategis sebagai modal (capital) organisasi.' },
      { istilah: 'Blueprint HCM', definisi: 'Dokumen rencana strategis pengelolaan human capital Grup Bank Jatim periode 2026–2030 yang menjadi acuan seluruh sasaran & program.' },
      { istilah: 'Balanced Scorecard', singkatan: 'BSC', definisi: 'Kerangka manajemen kinerja yang menerjemahkan strategi ke dalam empat perspektif yang saling berimbang.' },
      { istilah: 'Strategy Map', definisi: 'Peta keterkaitan sebab-akibat antar sasaran strategis lintas perspektif BSC.' },
    ],
  },
  {
    nama: 'Perspektif BSC',
    terms: [
      { istilah: 'F · Finansial pada HCM', singkatan: 'F', definisi: 'Perspektif Finansial — dampak finansial dari pengelolaan human capital (lag indicator). Dipakai sebagai prefix kode sasaran strategis: F1, F2, dst.' },
      { istilah: 'KS · Key Stakeholder pada HCM', singkatan: 'KS', definisi: 'Perspektif Key Stakeholder — hasil yang dirasakan pemangku kepentingan utama (pegawai & organisasi). Dipakai sebagai prefix kode sasaran strategis: KS1, KS2, dst.' },
      { istilah: 'PBI · Proses Bisnis Internal pada HCM', singkatan: 'PBI', definisi: 'Perspektif Proses Bisnis Internal — efektivitas & kematangan proses inti HCM Strategic dan HCM Services. Dipakai sebagai prefix kode sasaran strategis: PBI1, PBI2, dst.' },
      { istilah: 'PP · Pembelajaran & Pertumbuhan pada HCM', singkatan: 'PP', definisi: 'Perspektif Pembelajaran & Pertumbuhan — kapabilitas intrinsik fungsi HCM: SDM tim, sistem, data, kebijakan & knowledge. Dipakai sebagai prefix kode sasaran strategis: PP1, PP2, dst.' },
    ],
  },
  {
    nama: 'Sasaran & Indikator',
    terms: [
      { istilah: 'Sasaran Strategis', definisi: 'Tujuan strategis yang ingin dicapai pada suatu perspektif BSC; diberi kode seperti F1, KS2.' },
      { istilah: 'Indikator Kinerja', singkatan: 'IK', definisi: 'Ukuran kuantitatif pencapaian sebuah sasaran strategis (key performance indicator).' },
      { istilah: 'Target', definisi: 'Nilai IK yang ingin dicapai pada tahun tertentu sepanjang 2026–2030.' },
      { istilah: 'Realisasi', definisi: 'Nilai IK yang benar-benar tercapai pada periode pelaporan.' },
      { istilah: 'Outcome / Lag Indicator', definisi: 'Indikator hasil atau dampak akhir (mis. pada perspektif Finansial); muncul ditandai “outcome”.' },
      { istilah: 'Lead Indicator', definisi: 'Indikator pendorong/proses yang memengaruhi tercapainya outcome.' },
      { istilah: 'Arah', definisi: 'Arah perbaikan IK: “naik” (makin tinggi makin baik) atau “turun” (makin rendah makin baik).' },
      { istilah: 'Trajectory', definisi: 'Lintasan target & realisasi IK dari tahun ke tahun.' },
      { istilah: 'Key Program', definisi: 'Program kunci yang dijalankan untuk mencapai sebuah sasaran strategis.' },
    ],
  },
  {
    nama: 'Pelaporan & Status',
    terms: [
      { istilah: 'Frekuensi / Sifat Input', definisi: 'Periode pelaporan realisasi IK: Bulanan, Triwulanan, Semesteran, atau Tahunan.' },
      { istilah: 'Year to Date', singkatan: 'YTD', definisi: 'Realisasi tahunan diambil dari nilai periode terisi terakhir pada tahun berjalan.' },
      { istilah: 'Health', definisi: 'Indikator kesehatan eksekusi: Sehat (hijau), Perlu perhatian (kuning), Kritis (merah).' },
      { istilah: 'Status', definisi: 'Tahap pelaksanaan sasaran: On Track, At Risk, Delayed, Completed, atau Not Started.' },
      { istilah: 'Progress', definisi: 'Persentase penyelesaian sasaran/program (0–100%).' },
      { istilah: 'Penanggung Jawab', singkatan: 'PIC', definisi: 'Unit yang bertanggung jawab: Utama (pemilik) dan Pendukung.' },
      { istilah: 'Sponsor', definisi: 'Pejabat/Direksi penanggung jawab tingkat tinggi atas sebuah sasaran.' },
    ],
  },
  {
    nama: 'Kematangan (Maturity)',
    terms: [
      { istilah: 'Maturity / Kematangan', definisi: 'Tingkat kematangan praktik HCM yang diukur pada skala 1–4.' },
      { istilah: 'Indeks Tingkat Kematangan', singkatan: 'ITK', definisi: 'Skor kematangan HCM per sub-domain, dasar penetapan target roadmap kematangan.' },
      { istilah: 'Baseline 2025', definisi: 'Hasil asesmen kematangan awal pada 2025 yang menjadi titik tolak pengukuran.' },
      { istilah: 'Gap', definisi: 'Selisih antara target dan baseline/realisasi kematangan yang harus ditutup.' },
      { istilah: 'Cluster', definisi: 'Pengelompokan domain HCM: HCM Strategic, HCM Services, dan HCM Information System (HCIS).' },
    ],
  },
  {
    nama: 'Peran Pengguna',
    terms: [
      { istilah: 'Admin', definisi: 'Akses penuh: mengelola data eksekusi dan pengguna.' },
      { istilah: 'PMO', singkatan: 'PMO', definisi: 'Project/Program Management Office: memperbarui status, realisasi, dan kegiatan program.' },
      { istilah: 'BOD', singkatan: 'BOD', definisi: 'Board of Directors (Direksi): akses hanya melihat (read-only).' },
      { istilah: 'Penanggung Jawab', definisi: 'Pengguna unit/divisi yang mengajukan & menyetujui update kegiatan utama dan hasil pekerjaan program unitnya (PIC Utama: memverifikasi/menyetujui; PIC Pendukung: mengajukan laporan + evidence). Tanpa unit, hanya dapat melihat data.' },
    ],
  },
]

function matches(t: Term, q: string) {
  const hay = `${t.istilah} ${t.singkatan ?? ''} ${t.definisi}`.toLowerCase()
  return hay.includes(q)
}

export default function Glossary() {
  const [q, setQ] = useState('')
  const [kategori, setKategori] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return GLOSSARY
      .filter((k) => !kategori || k.nama === kategori)
      .map((k) => ({ ...k, terms: query ? k.terms.filter((t) => matches(t, query)) : k.terms }))
      .filter((k) => k.terms.length > 0)
  }, [q, kategori])

  const total = filtered.reduce((n, k) => n + k.terms.length, 0)

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bbfaint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari istilah atau singkatan…"
            aria-label="Cari istilah"
            className="w-full rounded-lg border border-bbborder bg-bbcard py-2.5 pl-9 pr-3 text-sm text-bbink shadow-sm outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKategori(null)}
            className={`bb-press rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${!kategori ? 'border-bbgreen bg-bbgreen text-white' : 'border-bbborder bg-white text-bbmuted hover:border-bbgreen hover:text-bbgreen-dark'}`}
          >
            Semua
          </button>
          {GLOSSARY.map((k) => (
            <button
              key={k.nama}
              type="button"
              onClick={() => setKategori(k.nama)}
              className={`bb-press rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${kategori === k.nama ? 'border-bbgreen bg-bbgreen text-white' : 'border-bbborder bg-white text-bbmuted hover:border-bbgreen hover:text-bbgreen-dark'}`}
            >
              {k.nama}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-bbborder bg-white/50 px-6 py-12 text-center text-sm text-bbmuted">
          Tidak ada istilah yang cocok dengan “{q}”.
        </div>
      ) : (
        <div className="space-y-7">
          {filtered.map((k) => (
            <section key={k.nama}>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bbgreen-dark">
                {k.nama}
                <span className="rounded-full bg-bbgreen-light px-2 py-0.5 text-[11px] font-semibold text-bbgreen-dark">{k.terms.length}</span>
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {k.terms.map((t) => (
                  <div key={t.istilah} className="bb-card p-4">
                    <dt className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold text-bbink">{t.istilah}</span>
                      {t.singkatan && t.singkatan !== t.istilah && (
                        <span className="rounded-md bg-bbgreen-light px-1.5 py-0.5 font-mono text-[11px] font-bold text-bbgreen-dark">{t.singkatan}</span>
                      )}
                    </dt>
                    <dd className="text-[13px] leading-relaxed text-bbmuted">{t.definisi}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

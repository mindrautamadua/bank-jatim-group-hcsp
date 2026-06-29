# HCSP — Human Capital Strategic Program · Bank BPD Bali

**Strategy Execution Platform** untuk memonitor eksekusi *Blueprint HCM Bank BPD Bali 2026–2030*.
Bukan HCIS operasional (Core HR/Payroll/ESS/LMS) — melainkan kombinasi **Balanced Scorecard + PMO Portfolio + Maturity Management + Benefit/Impact Tracking** dalam satu aplikasi untuk level Direksi & PMO.

Sumber data: Blueprint SDM Bank BPD Bali (Bab 3 — Strategi & Roadmap, Lampiran 2 — Milestone Maturity, Lampiran 3 — Implementasi Program). PDF ada di [`docs/`](docs/).

## Arsitektur

- **Next.js 16** (App Router, Server Components) + **TypeScript**
- **PostgreSQL** (database `bank-bali-hcsp`) via `pg`
- **Tailwind CSS v4** + **Recharts** — tema brand Bank BPD Bali (hijau `#00814f`, emas `#ffcb00`)

## Model Data (Balanced Scorecard)

```
Perspektif (4: F / KS / PBI / PP)
  └── Sasaran Strategis (26 berkode)
        ├── Indikator Kinerja (IK) → Target & Realisasi per tahun 2026–2030
        ├── Penanggung Jawab (Utama / Pendukung)
        └── Key Program & cadence monitoring
Maturity Domain (13 sub-domain, 3 cluster) → target ITK per tahun (Lampiran 2)
Risk / Issue (operasional — diisi PMO)
```

Tabel: `perspektif`, `sasaran_strategis`, `sasaran_pic`, `indikator_kinerja`, `ik_target`,
`maturity_domain`, `maturity_target`, `risk`, `issue`. Skema di [`db/schema.sql`](db/schema.sql), data seed di [`scripts/seed.mjs`](scripts/seed.mjs).

## Halaman

| Route | Fungsi |
|---|---|
| `/` | Executive Dashboard — maturity roadmap resmi (3,42 → 3,96), portfolio per perspektif, beban PIC |
| `/strategy-map` | HCM Strategy Map — 4 perspektif BSC, 26 sasaran (clickable) |
| `/portfolio` | Program Portfolio — tabel + filter perspektif, status, health |
| `/portfolio/[kode]` | Program Master — IK, target/realisasi tahunan, penanggung jawab, key program |
| `/maturity` | Maturity & Gap — spider chart, gap analysis, tabel per cluster |

## Menjalankan

```bash
# 1. Konfigurasi koneksi DB
echo 'DATABASE_URL=postgresql://USER:PASS@HOST:PORT/bank-bali-hcsp' > .env.local

# 2. Buat skema & isi data
npm run db:reset        # = db:schema + db:seed

# 3. Jalankan
npm run dev             # http://localhost:3000
```

## Catatan data

Target & rencana = **real** dari Blueprint. Kolom *realisasi*, *health*, *progress*, serta tabel
*risk*/*issue* adalah lapisan **operasional** yang diisi PMO secara berkala (default: rencana awal).
Angka maturity overall/cluster memakai **rollup resmi Blueprint** (PBI.1 / PBI.1.a / PBI.1.b),
bukan rata-rata sederhana.

-- ============================================================
-- Bank Jatim Group - HCSP (multi-tenant)
-- PER-TENANT content schema. Run with search_path set to the target
-- tenant schema (see scripts/provision-tenant.mjs). Unqualified table
-- names resolve to the tenant schema; references to app_user are
-- qualified as public.app_user (the global users table).
-- Model: Balanced Scorecard (Blueprint HCM 2026-2030).
-- ============================================================

-- 1. Perspektif Balanced Scorecard
CREATE TABLE IF NOT EXISTS perspektif (
  id          SERIAL PRIMARY KEY,
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  deskripsi   TEXT,
  urutan      INT  NOT NULL DEFAULT 0,
  warna       TEXT
);

-- 2. Sasaran Strategis
CREATE TABLE IF NOT EXISTS sasaran_strategis (
  id            SERIAL PRIMARY KEY,
  kode          TEXT NOT NULL UNIQUE,
  nama          TEXT NOT NULL,
  perspektif_id INT  NOT NULL REFERENCES perspektif(id),
  jenis         TEXT,
  key_program   TEXT,
  cadence       TEXT,
  tahun_mulai   INT DEFAULT 2026,
  tahun_selesai INT DEFAULT 2030,
  sponsor       TEXT DEFAULT 'Direksi / Pemimpin Divisi SDM',
  status        TEXT NOT NULL DEFAULT 'On Track',
  health        TEXT NOT NULL DEFAULT 'green',
  progress      INT  NOT NULL DEFAULT 0,
  urutan        INT  NOT NULL DEFAULT 0
);

-- 3. Penanggung Jawab per sasaran
CREATE TABLE IF NOT EXISTS sasaran_pic (
  id           SERIAL PRIMARY KEY,
  sasaran_id   INT NOT NULL REFERENCES sasaran_strategis(id) ON DELETE CASCADE,
  peran        TEXT NOT NULL,
  unit         TEXT NOT NULL,
  urutan       INT  NOT NULL DEFAULT 0
);

-- 4. Indikator Kinerja
CREATE TABLE IF NOT EXISTS indikator_kinerja (
  id           SERIAL PRIMARY KEY,
  sasaran_id   INT NOT NULL REFERENCES sasaran_strategis(id) ON DELETE CASCADE,
  nama         TEXT NOT NULL,
  satuan       TEXT,
  arah         TEXT DEFAULT 'naik',
  urutan       INT  NOT NULL DEFAULT 0,
  frekuensi    TEXT NOT NULL DEFAULT 'tahunan'
);

-- 5. Target & Realisasi IK per tahun
CREATE TABLE IF NOT EXISTS ik_target (
  id           SERIAL PRIMARY KEY,
  ik_id        INT NOT NULL REFERENCES indikator_kinerja(id) ON DELETE CASCADE,
  tahun        INT NOT NULL,
  target       NUMERIC,
  realisasi    NUMERIC,
  UNIQUE (ik_id, tahun)
);

-- 5b. Realisasi IK per periode sub-tahunan
CREATE TABLE IF NOT EXISTS ik_realisasi (
  id           SERIAL PRIMARY KEY,
  ik_id        INT NOT NULL REFERENCES indikator_kinerja(id) ON DELETE CASCADE,
  tahun        INT NOT NULL,
  periode      TEXT NOT NULL,
  nilai        NUMERIC,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ik_id, tahun, periode)
);

-- 6. Domain Kematangan HCM
CREATE TABLE IF NOT EXISTS maturity_domain (
  id           SERIAL PRIMARY KEY,
  kode         TEXT UNIQUE,
  nama         TEXT NOT NULL,
  cluster      TEXT NOT NULL,
  baseline2025 NUMERIC,
  urutan       INT NOT NULL DEFAULT 0
);

-- 7. Target & Realisasi Kematangan per domain per tahun
CREATE TABLE IF NOT EXISTS maturity_target (
  id           SERIAL PRIMARY KEY,
  domain_id    INT NOT NULL REFERENCES maturity_domain(id) ON DELETE CASCADE,
  tahun        INT NOT NULL,
  target_itk   NUMERIC,
  realisasi    NUMERIC,
  UNIQUE (domain_id, tahun)
);

-- 8. Relasi antar sasaran (knowledge graph)
CREATE TABLE IF NOT EXISTS sasaran_relasi (
  id           SERIAL PRIMARY KEY,
  dari_kode    TEXT NOT NULL,
  ke_kode      TEXT NOT NULL,
  jenis        TEXT NOT NULL DEFAULT 'mendukung',
  UNIQUE (dari_kode, ke_kode, jenis)
);

-- 9. Kegiatan / Key Program per sasaran
CREATE TABLE IF NOT EXISTS kegiatan (
  id             SERIAL PRIMARY KEY,
  sasaran_kode   TEXT NOT NULL REFERENCES sasaran_strategis(kode) ON DELETE CASCADE,
  urutan         INT NOT NULL,
  program        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Belum Dikerjakan',
  progress       INT NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  pendukung_unit TEXT,
  UNIQUE (sasaran_kode, urutan)
);

-- 10. Evidence per hasil kegiatan (submit/verify workflow)
CREATE TABLE IF NOT EXISTS kegiatan_hasil_evidence (
  id                 SERIAL PRIMARY KEY,
  kegiatan_id        INT NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
  hasil_index        INT NOT NULL,
  hasil_teks         TEXT NOT NULL DEFAULT '',
  catatan            TEXT,
  evidence_key       TEXT NOT NULL,
  evidence_nama      TEXT NOT NULL,
  evidence_mime      TEXT,
  evidence_size      BIGINT NOT NULL DEFAULT 0,
  diupload_user_id   INT REFERENCES public.app_user(id) ON DELETE SET NULL,
  diupload_nama      TEXT,
  diupload_unit      TEXT,
  diupload_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status             TEXT NOT NULL DEFAULT 'Diajukan',
  verifikasi_user_id INT REFERENCES public.app_user(id) ON DELETE SET NULL,
  verifikasi_nama    TEXT,
  verifikasi_at      TIMESTAMPTZ,
  verifikasi_catatan TEXT
);

-- 11. Progress per rincian kegiatan (submit/verify workflow)
CREATE TABLE IF NOT EXISTS kegiatan_rincian_progress (
  id                 SERIAL PRIMARY KEY,
  kegiatan_id        INT NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
  rincian_index      INT NOT NULL,
  rincian_teks       TEXT NOT NULL DEFAULT '',
  progress           INT NOT NULL DEFAULT 0,
  catatan            TEXT,
  diajukan_user_id   INT REFERENCES public.app_user(id) ON DELETE SET NULL,
  diajukan_nama      TEXT,
  diajukan_unit      TEXT,
  diajukan_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status             TEXT NOT NULL DEFAULT 'Diajukan',
  verifikasi_user_id INT REFERENCES public.app_user(id) ON DELETE SET NULL,
  verifikasi_nama    TEXT,
  verifikasi_at      TIMESTAMPTZ,
  verifikasi_catatan TEXT,
  CONSTRAINT kegiatan_rincian_progress_progress_check CHECK (progress >= 0 AND progress <= 100)
);

-- 12. Anggaran per sasaran per tahun
CREATE TABLE IF NOT EXISTS anggaran (
  id           SERIAL PRIMARY KEY,
  sasaran_kode TEXT NOT NULL REFERENCES sasaran_strategis(kode) ON DELETE CASCADE,
  tahun        INT NOT NULL,
  rencana      NUMERIC,
  realisasi    NUMERIC,
  catatan      TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sasaran_kode, tahun)
);

-- 13. Benefit realization
CREATE TABLE IF NOT EXISTS benefit (
  id           SERIAL PRIMARY KEY,
  sasaran_kode TEXT NOT NULL REFERENCES sasaran_strategis(kode) ON DELETE CASCADE,
  nama         TEXT NOT NULL,
  jenis        TEXT NOT NULL DEFAULT 'Outcome',
  satuan       TEXT,
  baseline     NUMERIC,
  target       NUMERIC,
  actual       NUMERIC,
  arah         TEXT NOT NULL DEFAULT 'naik',
  target_tahun INT,
  catatan      TEXT,
  urutan       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Dokumen repository (stored as bytea)
CREATE TABLE IF NOT EXISTS dokumen (
  id           SERIAL PRIMARY KEY,
  nama         TEXT NOT NULL,
  jenis        TEXT NOT NULL DEFAULT 'Lainnya',
  sasaran_kode TEXT,
  filename     TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT NOT NULL DEFAULT 0,
  catatan      TEXT,
  content      BYTEA NOT NULL,
  uploaded_by  TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Governance: meetings
CREATE TABLE IF NOT EXISTS gov_meeting (
  id           SERIAL PRIMARY KEY,
  judul        TEXT NOT NULL,
  jenis        TEXT NOT NULL DEFAULT 'Steering Committee',
  tanggal      DATE,
  lokasi       TEXT,
  peserta      TEXT,
  agenda       TEXT,
  mom          TEXT,
  status       TEXT NOT NULL DEFAULT 'Scheduled',
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Governance: decisions
CREATE TABLE IF NOT EXISTS gov_decision (
  id           SERIAL PRIMARY KEY,
  meeting_id   INT REFERENCES gov_meeting(id) ON DELETE CASCADE,
  ringkasan    TEXT NOT NULL,
  sasaran_kode TEXT,
  tanggal      DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Governance: action items
CREATE TABLE IF NOT EXISTS gov_action (
  id           SERIAL PRIMARY KEY,
  meeting_id   INT REFERENCES gov_meeting(id) ON DELETE SET NULL,
  judul        TEXT NOT NULL,
  pic          TEXT,
  sasaran_kode TEXT,
  due_date     DATE,
  status       TEXT NOT NULL DEFAULT 'Open',
  catatan      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 18. Milestone (WBS)
CREATE TABLE IF NOT EXISTS milestone (
  id           SERIAL PRIMARY KEY,
  sasaran_kode TEXT NOT NULL REFERENCES sasaran_strategis(kode) ON DELETE CASCADE,
  judul        TEXT NOT NULL,
  deskripsi    TEXT,
  tahun        INT NOT NULL,
  triwulan     INT,
  status       TEXT NOT NULL DEFAULT 'Planned',
  progress     INT NOT NULL DEFAULT 0,
  urutan       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 19. Snapshot (periodic dashboard capture)
CREATE TABLE IF NOT EXISTS snapshot (
  id                SERIAL PRIMARY KEY,
  periode           TEXT NOT NULL,
  tanggal           DATE NOT NULL DEFAULT CURRENT_DATE,
  maturity_overall  NUMERIC,
  programs_total    INT,
  on_track          INT,
  delayed           INT,
  at_risk           INT,
  health_green      INT,
  health_yellow     INT,
  health_red        INT,
  avg_progress      INT,
  milestones_total  INT,
  milestones_done   INT,
  milestones_behind INT,
  benefits_total    INT,
  benefits_reached  INT,
  actions_open      INT,
  actions_overdue   INT,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Update log (operational audit; user_id -> global app_user)
CREATE TABLE IF NOT EXISTS update_log (
  id           SERIAL PRIMARY KEY,
  entitas      TEXT NOT NULL,
  ref_kode     TEXT,
  ringkasan    TEXT NOT NULL,
  user_id      INT REFERENCES public.app_user(id) ON DELETE SET NULL,
  user_nama    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (mirror of single-tenant schema)
CREATE INDEX IF NOT EXISTS idx_sasaran_perspektif ON sasaran_strategis(perspektif_id);
CREATE INDEX IF NOT EXISTS idx_ik_sasaran ON indikator_kinerja(sasaran_id);
CREATE INDEX IF NOT EXISTS idx_iktarget_ik ON ik_target(ik_id);
CREATE INDEX IF NOT EXISTS idx_ikreal_ik ON ik_realisasi(ik_id);
CREATE INDEX IF NOT EXISTS idx_mtarget_domain ON maturity_target(domain_id);
CREATE INDEX IF NOT EXISTS idx_relasi_dari ON sasaran_relasi(dari_kode);
CREATE INDEX IF NOT EXISTS idx_relasi_ke ON sasaran_relasi(ke_kode);
CREATE INDEX IF NOT EXISTS idx_kegiatan_sasaran ON kegiatan(sasaran_kode);
CREATE INDEX IF NOT EXISTS idx_hasil_evidence_keg ON kegiatan_hasil_evidence(kegiatan_id, hasil_index, diupload_at DESC);
CREATE INDEX IF NOT EXISTS idx_hasil_evidence_status ON kegiatan_hasil_evidence(status);
CREATE INDEX IF NOT EXISTS idx_rincian_progress_keg ON kegiatan_rincian_progress(kegiatan_id, rincian_index, diajukan_at DESC);
CREATE INDEX IF NOT EXISTS idx_rincian_progress_status ON kegiatan_rincian_progress(status);
CREATE INDEX IF NOT EXISTS idx_anggaran_sasaran ON anggaran(sasaran_kode);
CREATE INDEX IF NOT EXISTS idx_anggaran_tahun ON anggaran(tahun);
CREATE INDEX IF NOT EXISTS idx_benefit_jenis ON benefit(jenis);
CREATE INDEX IF NOT EXISTS idx_benefit_sasaran ON benefit(sasaran_kode);
CREATE INDEX IF NOT EXISTS idx_dokumen_jenis ON dokumen(jenis);
CREATE INDEX IF NOT EXISTS idx_dokumen_sasaran ON dokumen(sasaran_kode);
CREATE INDEX IF NOT EXISTS idx_dokumen_uploaded ON dokumen(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gov_action_meeting ON gov_action(meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_action_status ON gov_action(status);
CREATE INDEX IF NOT EXISTS idx_gov_decision_meeting ON gov_decision(meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_meeting_tanggal ON gov_meeting(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_sasaran ON milestone(sasaran_kode);
CREATE INDEX IF NOT EXISTS idx_milestone_tahun ON milestone(tahun);
CREATE INDEX IF NOT EXISTS idx_snapshot_tanggal ON snapshot(tanggal);
CREATE INDEX IF NOT EXISTS idx_updatelog_created ON update_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updatelog_ref ON update_log(ref_kode);

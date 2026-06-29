-- ============================================================
-- Bank Jatim Group - HCSP (multi-tenant)
-- GLOBAL schema (public): tenant registry + application users.
-- All HCSP content lives in per-tenant schemas (see tenant_schema.sql);
-- this file holds only what is shared across every bank.
-- ============================================================

-- 1. Tenant registry (one row per bank in the Bank Jatim group)
CREATE TABLE IF NOT EXISTS public.tenant (
  id          SERIAL PRIMARY KEY,
  kode        TEXT NOT NULL UNIQUE,            -- jatim | lampung | ntb_syariah | ntt | sultra | banten
  nama        TEXT NOT NULL,                   -- display name, e.g. "Bank Lampung"
  schema_name TEXT NOT NULL UNIQUE,            -- Postgres schema, e.g. "t_bank_lampung"
  is_group    BOOLEAN NOT NULL DEFAULT false,  -- true = holding/parent (Bank Jatim)
  urutan      INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Application users (authentication) — global across tenants.
--    tenant_id = home bank. NULL + role 'admin' => group-level admin who may
--    switch between all tenants (Bank Jatim holding HC).
CREATE TABLE IF NOT EXISTS public.app_user (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  nama          TEXT NOT NULL,
  jabatan       TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'pmo', 'bod', 'viewer')),
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  unit          TEXT,
  is_pimpinan   BOOLEAN NOT NULL DEFAULT false,
  tenant_id     INT REFERENCES public.tenant(id) ON DELETE SET NULL
);

-- One pimpinan per unit *within a tenant* (units are bank-scoped now).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pimpinan_per_unit
  ON public.app_user (tenant_id, unit)
  WHERE (is_pimpinan AND unit IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_app_user_tenant ON public.app_user (tenant_id);

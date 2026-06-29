import { Pool, type PoolClient } from 'pg'
import { resolveActiveSchema } from './tenant'

declare global {
  // eslint-disable-next-line no-var
  var _hcspPool: Pool | undefined
  // eslint-disable-next-line no-var
  var _hcspWarmed: boolean | undefined
}

// Multi-tenant routing designed for a TRANSACTION POOLER (e.g. pgbouncer in
// transaction mode / Supabase transaction pooler). Each tenant lives in its own
// Postgres schema, selected via search_path.
//
// Key constraint of transaction pooling: a server connection is only held for
// the duration of ONE transaction, so session-level state does NOT persist
// between statements. A bare `SET search_path` would land on a different backend
// than the following query. Therefore we set the path with `SET LOCAL` INSIDE
// the same transaction as the query — guaranteeing both run on one backend and
// that the setting auto-resets at COMMIT (no leakage to the next borrower).
//
// node-pg uses unnamed prepared statements (no cross-transaction named
// statements), so parameterized queries are transaction-pooler safe.
//
// `public` reads (auth, user-admin) need no SET: it is always in the default
// search_path, so global tenant/app_user tables resolve without a transaction.
const isDev = process.env.NODE_ENV !== 'production'

const pool =
  global._hcspPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // App pool is small; the transaction pooler multiplexes onto few backends.
    max: isDev ? 8 : 10,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  })
if (isDev) global._hcspPool = pool

// Pre-warm a couple of connections once (non-blocking).
if (!global._hcspWarmed) {
  global._hcspWarmed = true
  const n = isDev ? 3 : 2
  void Promise.allSettled(Array.from({ length: n }, () => pool.query('SELECT 1')))
}

// Run `fn` inside one transaction with search_path scoped to `schema` (or the
// default public path when schema is null).
async function inSchemaTx<T>(schema: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (schema) await client.query(`SET LOCAL search_path TO "${schema}", public`)
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    try { await client.query('ROLLBACK') } catch { /* abaikan kegagalan rollback */ }
    throw e
  } finally {
    client.release()
  }
}

// ---- Tenant-scoped access (routes to the active tenant's schema) ----------

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const schema = await resolveActiveSchema()
  return inSchemaTx(schema, async (c) => (await c.query(text, params)).rows as T[])
}

// Query terikat satu koneksi (dipakai di dalam withTransaction).
export type TxQuery = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>

// Jalankan beberapa statement dalam satu transaksi pada schema tenant aktif.
export async function withTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  const schema = await resolveActiveSchema()
  return inSchemaTx(schema, async (client) => {
    const q: TxQuery = async (text, params = []) => (await client.query(text, params)).rows
    return fn(q)
  })
}

// ---- Global access (always the `public` schema) ---------------------------
// Used by auth & user-admin: tenant + app_user are shared across all banks.
// public is in the default search_path, so no transaction/SET is needed.

export async function publicQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

export async function publicTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  return inSchemaTx(null, async (client) => {
    const q: TxQuery = async (text, params = []) => (await client.query(text, params)).rows
    return fn(q)
  })
}

import { Pool, type PoolClient } from 'pg'
import { resolveActiveSchema } from './tenant'

declare global {
  // eslint-disable-next-line no-var
  var _hcspPool: Pool | undefined
  // eslint-disable-next-line no-var
  var _hcspWarmed: boolean | undefined
}

// Multi-tenant routing on a SINGLE shared pool. Each tenant lives in its own
// Postgres schema, selected via search_path.
//
// The DB endpoint (:1301) is a SESSION/DIRECT connection — `SET search_path`
// persists for the life of a connection. So we set it ONCE per physical
// connection (tagged with __hcspPath) and only re-issue it when a reused
// connection needs a different schema. That keeps it at ~1 round trip per query
// (≈20ms) instead of wrapping every query in BEGIN/SET LOCAL/COMMIT (≈64ms,
// which made a 12-query dashboard take seconds).
//
// If you ever point DATABASE_URL at a TRANSACTION pooler (pgbouncer txn mode),
// per-connection state is unsafe — set DB_TX_POOLER=1 to switch to the
// transaction-scoped variant (slower, but correct under transaction pooling).
//
// Connections are kept warm (idle 0 in dev) and pre-warmed; opening one to this
// remote server is ~0.5s while a warm query is ~20ms.
const isDev = process.env.NODE_ENV !== 'production'
const TX_POOLER = process.env.DB_TX_POOLER === '1'

const pool =
  global._hcspPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Dev: satu server hidup terus → boleh banyak koneksi hangat.
    // Prod (serverless): tiap instance hanya melayani sedikit request; jaga
    // koneksi sedikit agar banyak instance tidak membanjiri server DB yang
    // lambat membuka koneksi.
    max: isDev ? 8 : 3,
    idleTimeoutMillis: isDev ? 0 : 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  })
if (isDev) global._hcspPool = pool

// Koneksi idle bisa diputus server/NAT saat instance serverless dibekukan.
// Tangani error klien idle agar tidak meng-crash proses (pool akan membuat
// koneksi baru saat dibutuhkan).
pool.on('error', (e) => { console.error('[db] idle client error:', e.message) })

function pathFor(schema: string | null): string {
  return schema ? `"${schema}", public` : 'public'
}

type TaggedClient = PoolClient & { __hcspPath?: string }

// Ensure the checked-out connection's search_path matches `schema`.
// Session/direct: set once per connection (cached). Transaction pooler: caller
// must use a transaction (see runTransaction); this no-ops there.
async function ensurePath(client: TaggedClient, schema: string | null) {
  if (TX_POOLER) return
  // schema null = akses global (auth/users). `public` selalu ada di search_path
  // default, jadi tak perlu SET — hemat satu round trip di jalur login.
  if (schema == null) return
  const want = pathFor(schema)
  if (client.__hcspPath !== want) {
    await client.query(`SET search_path TO ${want}`)
    client.__hcspPath = want
  }
}

async function withClient<T>(schema: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = (await pool.connect()) as TaggedClient
  try {
    await ensurePath(client, schema)
    return await fn(client)
  } finally {
    client.release()
  }
}

// Pre-warm the pool SEQUENTIALLY (non-blocking) at boot. This remote server is
// fine at ~50ms/connect one-at-a-time, but a burst of concurrent connects (e.g.
// a dashboard firing 12 parallel queries onto a cold pool) triggers a
// connection storm that can take tens of seconds. By establishing `target`
// connections up front, one by one, and keeping them warm (idle 0 in dev),
// later pages reuse warm connections and never storm.
async function prewarm(target: number) {
  const held: PoolClient[] = []
  try {
    for (let i = 0; i < target; i++) {
      const c = await pool.connect()
      try { await c.query('SELECT 1') } catch { /* abaikan */ }
      held.push(c)
    }
  } catch { /* abaikan kegagalan pemanasan */ } finally {
    held.forEach((c) => c.release())
  }
}
// Hanya pra-panaskan di DEV (server hidup terus). Di serverless, pra-panas
// per cold-start justru membuka banyak koneksi dan menahan request yang sedang
// memicu cold-start itu (mis. login terasa lambat). Di prod, koneksi dibuat
// sesuai kebutuhan saja.
if (isDev && !global._hcspWarmed) {
  global._hcspWarmed = true
  void prewarm(8)
}

// ---- Tenant-scoped access (routes to the active tenant's schema) ----------

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const schema = await resolveActiveSchema()
  return withClient(schema, async (c) => (await c.query(text, params)).rows as T[])
}

// Query terikat satu koneksi (dipakai di dalam withTransaction).
export type TxQuery = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>

async function runTransaction<T>(schema: string | null, fn: (q: TxQuery) => Promise<T>): Promise<T> {
  return withClient(schema, async (client) => {
    try {
      await client.query('BEGIN')
      // Under transaction pooling, scope the path to this transaction.
      if (TX_POOLER && schema) await client.query(`SET LOCAL search_path TO ${pathFor(schema)}`)
      const q: TxQuery = async (text, params = []) => (await client.query(text, params)).rows
      const result = await fn(q)
      await client.query('COMMIT')
      return result
    } catch (e) {
      try { await client.query('ROLLBACK') } catch { /* abaikan kegagalan rollback */ }
      throw e
    }
  })
}

// Jalankan beberapa statement dalam satu transaksi pada schema tenant aktif.
export async function withTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  const schema = await resolveActiveSchema()
  return runTransaction(schema, fn)
}

// ---- Global access (always the `public` schema) ---------------------------
// Used by auth & user-admin: tenant + app_user are shared across all banks.

export async function publicQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  return withClient(null, async (c) => (await c.query(text, params)).rows as T[])
}

export async function publicTransaction<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  return runTransaction(null, fn)
}

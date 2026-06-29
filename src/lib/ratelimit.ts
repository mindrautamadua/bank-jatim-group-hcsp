import 'server-only'

// Rate-limit login sederhana (in-memory, per proses). Cukup untuk deploy 1 instance.
// Untuk multi-instance/produksi besar: ganti store ke Redis/DB.
interface Entry { fails: number; first: number; lockUntil: number }

const store = new Map<string, Entry>()
const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000 // jendela penghitungan kegagalan
const LOCK_MS = 15 * 60 * 1000 // durasi kunci setelah melewati batas

function now() { return Date.now() }
const norm = (k: string) => k.trim().toLowerCase()

// Mengembalikan sisa menit kunci (0 = tidak terkunci).
export function loginLockMinutes(key: string): number {
  const e = store.get(norm(key))
  if (e && e.lockUntil > now()) return Math.ceil((e.lockUntil - now()) / 60000)
  return 0
}

export function recordLoginFail(key: string): void {
  const k = norm(key)
  const t = now()
  const e = store.get(k)
  if (!e || t - e.first > WINDOW_MS) {
    store.set(k, { fails: 1, first: t, lockUntil: 0 })
    return
  }
  e.fails += 1
  if (e.fails >= MAX_FAILS) e.lockUntil = t + LOCK_MS
}

export function clearLoginFails(key: string): void {
  store.delete(norm(key))
}

'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import { getMaturityDomains, upsertMaturityRealisasi, logUpdate } from '@/lib/queries'

export interface MaturityUpdateState {
  error?: string
  ok?: boolean
}

const TAHUN_VALID = new Set([2026, 2027, 2028, 2029, 2030])

// Otorisasi diverifikasi ulang di sini - jangan mengandalkan gating di halaman saja.
export async function updateMaturityAction(
  _prev: MaturityUpdateState,
  formData: FormData
): Promise<MaturityUpdateState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (!isEditor(user.role)) {
    return { error: 'Anda tidak memiliki akses untuk memperbarui data ini.' }
  }

  // Hanya izinkan realisasi untuk domain yang terdaftar; realisasi maturity skala 1-4.
  const domains = await getMaturityDomains()
  const validDomain = new Map(domains.map((d) => [d.id, d.nama]))

  // Validasi SEMUA sel dulu (tidak menulis sebagian lalu gagal di tengah).
  const pending: { domainId: number; tahun: number; realisasi: number | null }[] = []
  for (const [key, value] of formData.entries()) {
    const m = /^real_(\d+)_(\d+)$/.exec(key)
    if (!m) continue
    const domainId = Number(m[1])
    const tahun = Number(m[2])
    if (!validDomain.has(domainId)) continue
    if (!TAHUN_VALID.has(tahun)) continue

    const raw = String(value).trim().replace(',', '.')
    const realisasi = raw === '' ? null : Number(raw)
    if (realisasi !== null && (!Number.isFinite(realisasi) || realisasi < 1 || realisasi > 4)) {
      return { error: `Nilai "${validDomain.get(domainId)}" tahun ${tahun} harus dalam skala 1-4.` }
    }
    pending.push({ domainId, tahun, realisasi })
  }

  let terisi = 0
  const tahunSet = new Set<number>()
  try {
    for (const p of pending) {
      await upsertMaturityRealisasi(p.domainId, p.tahun, p.realisasi)
      if (p.realisasi !== null) {
        terisi++
        tahunSet.add(p.tahun)
      }
    }
    const periode = [...tahunSet].sort().join(', ') || '—'
    await logUpdate({
      entitas: 'maturity',
      ref_kode: null,
      ringkasan: `Realisasi kematangan diperbarui: ${terisi} nilai (tahun ${periode})`,
      user_id: user.id,
      user_nama: user.nama,
    })
  } catch (e) {
    console.error('[maturity-update] gagal menyimpan:', e)
    return { error: 'Gagal menyimpan ke database. Silakan coba lagi.' }
  }

  revalidatePath('/maturity')
  revalidatePath('/dashboard')
  return { ok: true }
}

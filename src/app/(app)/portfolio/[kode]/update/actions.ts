'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isEditor } from '@/lib/roles'
import {
  getSasaranByKode,
  getIKForSasaran,
  setIKFrekuensi,
  upsertIKPeriode,
  pruneIKPeriode,
  rollupIKRealisasiTahunan,
  logUpdate,
} from '@/lib/queries'
import { isValidFrekuensi, periodeUntuk, frekuensiLabel } from '@/lib/periode'

export interface PmoUpdateState {
  error?: string
  ok?: boolean
}

const TAHUN_VALID = [2026, 2027, 2028, 2029, 2030]

// Halaman ini HANYA mengelola realisasi Indikator Kinerja (outcome). Status, health
// & progress sasaran TIDAK lagi disetel di sini — keduanya bersumber tunggal dari
// progress terverifikasi Key Program (lihat recomputeSasaranStatus & lib/sasaran-health.ts).
// Otorisasi diverifikasi ulang di sini - jangan mengandalkan gating di halaman saja.
export async function updatePmoAction(
  kode: string,
  _prev: PmoUpdateState,
  formData: FormData
): Promise<PmoUpdateState> {
  const user = await getSession()
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  if (!isEditor(user.role)) {
    return { error: 'Anda tidak memiliki akses untuk memperbarui data ini.' }
  }

  const sasaran = await getSasaranByKode(kode)
  if (!sasaran) return { error: 'Sasaran strategis tidak ditemukan.' }

  const tahun = Number(formData.get('tahun'))
  if (!TAHUN_VALID.includes(tahun)) return { error: 'Tahun pelaporan tidak valid.' }

  const iks = await getIKForSasaran(sasaran.id)

  let realisasiTerisi = 0
  try {
    for (const ik of iks) {
      // Frekuensi pelaporan IK (boleh diubah PMO).
      const frekRaw = String(formData.get(`frek_${ik.id}`) ?? ik.frekuensi)
      const frekuensi = isValidFrekuensi(frekRaw) ? frekRaw : ik.frekuensi
      if (frekuensi !== ik.frekuensi) await setIKFrekuensi(ik.id, frekuensi)

      // Realisasi per periode untuk tahun terpilih.
      const periodeKeys = periodeUntuk(frekuensi).map((p) => p.key)
      for (const p of periodeUntuk(frekuensi)) {
        const field = formData.get(`real_${ik.id}_${p.key}`)
        if (field === null) continue
        const raw = String(field).trim().replace(',', '.')
        const nilai = raw === '' ? null : Number(raw)
        if (nilai !== null && !Number.isFinite(nilai)) continue
        await upsertIKPeriode(ik.id, tahun, p.key, nilai)
        if (nilai !== null) realisasiTerisi++
      }
      // Buang sisa periode frekuensi lama, lalu sinkronkan realisasi tahunan
      // (dibaca dashboard & detail) berbasis periode frekuensi aktif saja.
      await pruneIKPeriode(ik.id, tahun, periodeKeys)
      await rollupIKRealisasiTahunan(ik.id, tahun, periodeKeys)
    }

    const frekRingkas = iks.length
      ? frekuensiLabel(String(formData.get(`frek_${iks[0].id}`) ?? iks[0].frekuensi))
      : '-'
    await logUpdate({
      entitas: 'sasaran',
      ref_kode: sasaran.kode,
      ringkasan: `Realisasi IK ${tahun} (${frekRingkas}): ${realisasiTerisi} nilai diperbarui`,
      user_id: user.id,
      user_nama: user.nama,
    })
  } catch (e) {
    console.error('[pmo-update] gagal menyimpan:', e)
    return { error: 'Gagal menyimpan ke database. Silakan coba lagi.' }
  }

  revalidatePath(`/portfolio/${encodeURIComponent(kode)}`)
  revalidatePath('/portfolio')
  revalidatePath('/dashboard')
  return { ok: true }
}

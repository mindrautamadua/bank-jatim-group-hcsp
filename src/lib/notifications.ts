import { query } from './db'
import { getActionTracker } from './governance'
import { getAllMilestones, triwulanLabel } from './milestone'
import { listBenefits } from './benefit'

export type NotifSeverity = 'high' | 'medium' | 'info'
export interface NotificationItem {
  key: string
  kategori: string
  severity: NotifSeverity
  judul: string
  detail: string
  href: string
}

// Interval review (bulan) dari teks cadence Blueprint.
function cadenceMonths(c: string | null): number {
  if (!c) return 12
  const s = c.toLowerCase()
  if (/triwulan|tiga bulan|3 bulan|setiap 3|per 3/.test(s)) return 3
  if (/semester|2 kali setahun|dua kali setahun|per semester/.test(s)) return 6
  return 12
}

interface CadenceRow { kode: string; nama: string; cadence: string | null; last_ts: string | null }

// viewer: dipakai memfilter notifikasi yang spesifik per pengguna (mis. kegiatan
// yang menunggu verifikasi hanya untuk Penanggung Jawab Utama unit terkait / admin).
export async function getNotifications(
  viewer?: { unit: string | null; role: string } | null
): Promise<{ items: NotificationItem[]; count: number }> {
  const [actions, milestones, benefits, cadence] = await Promise.all([
    getActionTracker(),
    getAllMilestones(),
    listBenefits(),
    query<CadenceRow>(`
      SELECT s.kode, s.nama, s.cadence,
             (SELECT max(created_at) FROM update_log u WHERE u.ref_kode = s.kode) AS last_ts
      FROM sasaran_strategis s ORDER BY s.urutan
    `),
  ])

  const items: NotificationItem[] = []

  // A) Tindak lanjut governance yang terlambat
  for (const a of actions) {
    if (!a.overdue) continue
    items.push({
      key: `act-${a.id}`, kategori: 'Tindak Lanjut', severity: 'high',
      judul: a.judul,
      detail: `Terlambat${a.due_date ? `, jatuh tempo ${a.due_date}` : ''}${a.pic ? ` - ${a.pic}` : ''}`,
      href: a.meeting_id ? `/governance/${a.meeting_id}` : '/governance',
    })
  }

  // B) Milestone yang lewat jadwal & belum Done
  for (const m of milestones) {
    if (!m.behind) continue
    items.push({
      key: `ms-${m.id}`, kategori: 'Milestone', severity: 'high',
      judul: `${m.sasaran_kode} - ${m.judul}`,
      detail: `Terlambat dari target ${m.tahun}${m.triwulan ? ` ${triwulanLabel(m.triwulan)}` : ''} (progress ${m.progress}%)`,
      href: `/roadmap/${encodeURIComponent(m.sasaran_kode)}`,
    })
  }

  // C) Benefit yang belum diukur (punya target, actual kosong)
  for (const b of benefits) {
    if (b.actual !== null || b.target === null) continue
    items.push({
      key: `ben-${b.id}`, kategori: 'Benefit', severity: 'medium',
      judul: `${b.sasaran_kode} - ${b.nama}`,
      detail: `Belum ada realisasi${b.target_tahun ? ` (target ${b.target_tahun})` : ''}`,
      href: `/benefits/${encodeURIComponent(b.sasaran_kode)}`,
    })
  }

  // D) Program telat direview sesuai cadence (berbasis update_log terakhir)
  const now = Date.now()
  for (const c of cadence) {
    const months = cadenceMonths(c.cadence)
    if (!c.last_ts) {
      items.push({
        key: `cad-${c.kode}`, kategori: 'Review Program', severity: 'info',
        judul: `${c.kode} - belum ada pembaruan`,
        detail: `Ritme: ${c.cadence ?? 'berkala'}. Belum pernah diperbarui PMO.`,
        href: `/portfolio/${encodeURIComponent(c.kode)}`,
      })
      continue
    }
    const last = new Date(c.last_ts)
    const ageDays = (now - last.getTime()) / 86400000
    // Ambang berbasis kalender (tambah `months` bulan ke pembaruan terakhir),
    // bukan months*30 hari, agar batas triwulan/tahunan tidak melenceng berhari-hari.
    const due = new Date(last)
    due.setMonth(due.getMonth() + months)
    if (now > due.getTime()) {
      items.push({
        key: `cad-${c.kode}`, kategori: 'Review Program', severity: 'medium',
        judul: `${c.kode} - telat direview`,
        detail: `Ritme ${months} bulan; pembaruan terakhir ${Math.round(ageDays)} hari lalu.`,
        href: `/portfolio/${encodeURIComponent(c.kode)}`,
      })
    }
  }

  // E) Pengajuan kegiatan (progress rincian & evidence hasil) yang menunggu verifikasi —
  //    untuk unit Penanggung Jawab Utama (cocok) atau admin (oversight). Aksi verifikasi
  //    dilakukan di halaman Gantt (kartu "Menunggu Verifikasi").
  if (viewer && (viewer.role === 'admin' || viewer.unit)) {
    const isAdmin = viewer.role === 'admin'
    const pending = await query<{
      kind: string; id: number; sasaran_kode: string; program: string; oleh: string | null
    }>(
      `SELECT t.kind, t.id, t.sasaran_kode, t.program, t.oleh
       FROM (
         SELECT 'progress' AS kind, rp.id, k.sasaran_kode, k.program, rp.diajukan_nama AS oleh, rp.diajukan_at AS at
         FROM kegiatan_rincian_progress rp JOIN kegiatan k ON k.id = rp.kegiatan_id
         WHERE rp.status = 'Diajukan'
         UNION ALL
         SELECT 'evidence' AS kind, he.id, k.sasaran_kode, k.program, he.diupload_nama AS oleh, he.diupload_at AS at
         FROM kegiatan_hasil_evidence he JOIN kegiatan k ON k.id = he.kegiatan_id
         WHERE he.status = 'Diajukan'
       ) t
       JOIN sasaran_strategis s ON s.kode = t.sasaran_kode
       WHERE ($1 OR EXISTS (
         SELECT 1 FROM sasaran_pic p
         WHERE p.sasaran_id = s.id AND p.peran = 'Utama' AND p.unit = $2
       ))
       ORDER BY t.at`,
      [isAdmin, viewer.unit]
    )
    for (const p of pending) {
      items.push({
        key: `keg-${p.kind}-${p.id}`, kategori: 'Verifikasi Kegiatan', severity: 'medium',
        judul: `${p.sasaran_kode} - ${p.program}`,
        detail: `${p.kind === 'evidence' ? 'Evidence' : 'Progress'} menunggu verifikasi${p.oleh ? ` · diajukan ${p.oleh}` : ''}`,
        href: '/gantt',
      })
    }
  }

  const order: Record<NotifSeverity, number> = { high: 0, medium: 1, info: 2 }
  items.sort((a, b) => order[a.severity] - order[b.severity])
  const count = items.filter((i) => i.severity !== 'info').length
  return { items, count }
}

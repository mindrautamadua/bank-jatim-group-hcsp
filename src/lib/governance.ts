import { query } from './db'

export interface GovMeeting {
  id: number
  judul: string
  jenis: string
  tanggal: string | null
  lokasi: string | null
  peserta: string | null
  agenda: string | null
  mom: string | null
  status: string
  created_by: string | null
  created_at: string
}
export interface GovDecision {
  id: number
  meeting_id: number | null
  ringkasan: string
  sasaran_kode: string | null
  tanggal: string | null
}
export interface GovAction {
  id: number
  meeting_id: number | null
  judul: string
  pic: string | null
  sasaran_kode: string | null
  due_date: string | null
  status: string
  catatan: string | null
  overdue: boolean
}

export interface MeetingRow extends GovMeeting {
  decisions: number
  actions_open: number
  actions_overdue: number
}

export async function listMeetings(): Promise<MeetingRow[]> {
  return query<MeetingRow>(`
    SELECT m.id, m.judul, m.jenis, to_char(m.tanggal,'YYYY-MM-DD') AS tanggal, m.lokasi, m.peserta,
           m.agenda, m.mom, m.status, m.created_by, m.created_at,
           (SELECT count(*) FROM gov_decision d WHERE d.meeting_id = m.id)::int AS decisions,
           (SELECT count(*) FROM gov_action a WHERE a.meeting_id = m.id AND a.status <> 'Done')::int AS actions_open,
           (SELECT count(*) FROM gov_action a WHERE a.meeting_id = m.id AND a.status <> 'Done' AND a.due_date < current_date)::int AS actions_overdue
    FROM gov_meeting m
    ORDER BY m.tanggal DESC NULLS LAST, m.id DESC
  `)
}

export async function getMeeting(id: number): Promise<GovMeeting | null> {
  const rows = await query<GovMeeting>(`
    SELECT id, judul, jenis, to_char(tanggal,'YYYY-MM-DD') AS tanggal, lokasi, peserta, agenda, mom, status, created_by, created_at
    FROM gov_meeting WHERE id = $1
  `, [id])
  return rows[0] ?? null
}

export async function getDecisions(meetingId: number): Promise<GovDecision[]> {
  return query<GovDecision>(`
    SELECT id, meeting_id, ringkasan, sasaran_kode, to_char(tanggal,'YYYY-MM-DD') AS tanggal
    FROM gov_decision WHERE meeting_id = $1 ORDER BY id
  `, [meetingId])
}

export async function getActions(meetingId: number): Promise<GovAction[]> {
  return query<GovAction>(`
    SELECT id, meeting_id, judul, pic, sasaran_kode, to_char(due_date,'YYYY-MM-DD') AS due_date, status, catatan,
           (status <> 'Done' AND due_date IS NOT NULL AND due_date < current_date) AS overdue
    FROM gov_action WHERE meeting_id = $1
    ORDER BY CASE status WHEN 'Done' THEN 1 ELSE 0 END, due_date NULLS LAST, id
  `, [meetingId])
}

export interface ActionTrackerRow extends GovAction {
  meeting_judul: string | null
}

// Seluruh action lintas rapat (untuk tracker di halaman daftar).
export async function getActionTracker(): Promise<ActionTrackerRow[]> {
  return query<ActionTrackerRow>(`
    SELECT a.id, a.meeting_id, a.judul, a.pic, a.sasaran_kode, to_char(a.due_date,'YYYY-MM-DD') AS due_date,
           a.status, a.catatan,
           (a.status <> 'Done' AND a.due_date IS NOT NULL AND a.due_date < current_date) AS overdue,
           m.judul AS meeting_judul
    FROM gov_action a LEFT JOIN gov_meeting m ON m.id = a.meeting_id
    WHERE a.status <> 'Done'
    ORDER BY (a.status <> 'Done' AND a.due_date IS NOT NULL AND a.due_date < current_date) DESC,
             a.due_date NULLS LAST, a.id
  `)
}

export interface GovStats {
  meetings: number
  held: number
  decisions: number
  actionsOpen: number
  actionsOverdue: number
}
export async function getGovStats(): Promise<GovStats> {
  const [r] = await query<GovStats & Record<string, number>>(`
    SELECT
      (SELECT count(*) FROM gov_meeting)::int AS meetings,
      (SELECT count(*) FROM gov_meeting WHERE status='Held')::int AS held,
      (SELECT count(*) FROM gov_decision)::int AS decisions,
      (SELECT count(*) FROM gov_action WHERE status<>'Done')::int AS "actionsOpen",
      (SELECT count(*) FROM gov_action WHERE status<>'Done' AND due_date < current_date)::int AS "actionsOverdue"
  `)
  return r
}

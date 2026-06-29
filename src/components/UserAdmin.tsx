'use client'

import { useState, useTransition, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  createUserAction, updateUserAction, resetPasswordAction, toggleActiveAction, deleteUserAction, type UserState,
} from '@/app/(app)/users/actions'
import { ROLES, roleLabel, roleBadge } from '@/lib/users-constants'
import { UNITS } from '@/lib/kegiatan-constants'
import type { AppUser } from '@/lib/users'
import { UserPlus, Pencil, KeyRound, Power, Trash2, X, Check } from 'lucide-react'

const inp = 'rounded-lg border border-bbborder bg-white px-3 py-2 text-sm text-bbink outline-none transition-colors placeholder:text-bbfaint focus:border-bbgreen focus:ring-2 focus:ring-bbgreen/20'

export default function UserAdmin({ users, currentUserId }: { users: AppUser[]; currentUserId: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [resettingId, setResettingId] = useState<number | null>(null)

  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh() })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="bb-press inline-flex items-center gap-2 rounded-lg bg-bbgreen px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--bb-shadow-md)] hover:bg-bbgreen-dark">
            <UserPlus size={16} /> Tambah pengguna
          </button>
        )}
      </div>

      {showCreate && <CreateForm onDone={() => setShowCreate(false)} />}

      <div className="bb-card overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-bbborder bg-bbgreen-light/40 text-left text-xs uppercase tracking-wide text-bbmuted">
              <th className="px-4 py-3 font-semibold">Pengguna</th>
              <th className="px-4 py-3 font-semibold">Peran</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Status</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell">Login terakhir</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <RowGroup key={u.id} u={u} isSelf={u.id === currentUserId}
                editing={editingId === u.id} resetting={resettingId === u.id}
                onEdit={() => { setEditingId(editingId === u.id ? null : u.id); setResettingId(null) }}
                onReset={() => { setResettingId(resettingId === u.id ? null : u.id); setEditingId(null) }}
                onClose={() => { setEditingId(null); setResettingId(null) }}
                run={run} pending={pending}
              />
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(createUserAction, {})
  useEffect(() => { if (state.ok) onDone() }, [state.ok, onDone])
  return (
    <div className="bb-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-bbink"><UserPlus size={17} className="text-bbgreen" /> Pengguna baru</h2>
        <button onClick={onDone} className="bb-press text-bbmuted hover:text-bbink" aria-label="Tutup"><X size={18} /></button>
      </div>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Nama</span><input name="nama" required className={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Email</span><input name="email" type="email" required placeholder="nama@jatimgroup.co.id" className={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Jabatan</span><input name="jabatan" className={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-bbmuted">Peran</span><select name="role" defaultValue="viewer" className={inp}>{ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium text-bbmuted">Unit / Divisi <span className="text-bbfaint">(untuk peran Utama/Pendukung kegiatan)</span></span><select name="unit" defaultValue="" className={inp}><option value="">— Tidak ada —</option>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
        <label className="flex items-start gap-2 sm:col-span-2 text-sm text-bbink"><input type="checkbox" name="is_pimpinan" className="mt-0.5 h-4 w-4 rounded border-bbborder text-bbgreen focus:ring-bbgreen/30" /><span>Pimpinan unit <span className="text-bbfaint">(penanggung jawab; hanya pimpinan unit yang boleh ajukan/verifikasi. Wajib pilih unit.)</span></span></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium text-bbmuted">Kata sandi awal (min 8 karakter)</span><input name="password" type="text" required minLength={8} className={inp} /></label>
        {state.error && <p className="text-sm text-bbred sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" disabled={pending} className="bb-press rounded-lg bg-bbgreen px-4 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60">{pending ? 'Menyimpan...' : 'Buat pengguna'}</button>
          <button type="button" onClick={onDone} className="bb-press rounded-lg border border-bbborder px-4 py-2 text-sm font-medium text-bbmuted">Batal</button>
        </div>
      </form>
    </div>
  )
}

function RowGroup({ u, isSelf, editing, resetting, onEdit, onReset, onClose, run, pending }: {
  u: AppUser; isSelf: boolean; editing: boolean; resetting: boolean
  onEdit: () => void; onReset: () => void; onClose: () => void
  run: (fn: () => Promise<unknown>) => void; pending: boolean
}) {
  return (
    <>
      <tr className="border-b border-bbborder/60 last:border-0 hover:bg-bbgreen-light/15">
        <td className="px-4 py-3">
          <div className="font-medium text-bbink">{u.nama} {isSelf && <span className="text-[11px] text-bbmuted">(Anda)</span>}</div>
          <div className="text-xs text-bbmuted">{u.email}{u.jabatan ? ` · ${u.jabatan}` : ''}</div>
          {u.unit && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-bbfaint">
              {u.unit}
              {u.is_pimpinan && <span className="inline-flex items-center gap-0.5 rounded bg-bbgold/15 px-1.5 py-px font-semibold text-bbamber">Pimpinan</span>}
            </div>
          )}
        </td>
        <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadge[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{roleLabel[u.role] ?? u.role}</span></td>
        <td className="hidden px-4 py-3 sm:table-cell">
          <span className={`inline-flex items-center gap-1.5 text-xs ${u.is_active ? 'text-bbgreen-dark' : 'text-bbmuted'}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: u.is_active ? 'var(--bb-green)' : '#9aa8a3' }} />{u.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td className="hidden px-4 py-3 text-xs text-bbmuted lg:table-cell">{u.last_login_at ?? 'belum pernah'}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2.5">
            <button onClick={onEdit} className="bb-press text-bbmuted hover:text-bbgreen" title="Edit"><Pencil size={15} /></button>
            <button onClick={onReset} className="bb-press text-bbmuted hover:text-bbamber" title="Reset kata sandi"><KeyRound size={15} /></button>
            <button onClick={() => run(() => toggleActiveAction(u.id))} disabled={isSelf} className="bb-press text-bbmuted hover:text-bbink disabled:opacity-30" title={isSelf ? 'Tidak dapat menonaktifkan diri sendiri' : 'Aktif/Nonaktif'}><Power size={15} /></button>
            <button onClick={() => { if (!isSelf && confirm(`Hapus pengguna "${u.nama}"?`)) run(() => deleteUserAction(u.id)) }} disabled={isSelf} className="bb-press text-bbfaint hover:text-bbred disabled:opacity-30" title={isSelf ? 'Tidak dapat menghapus diri sendiri' : 'Hapus'}><Trash2 size={15} /></button>
          </div>
        </td>
      </tr>
      {editing && <tr><td colSpan={5} className="border-b border-bbborder/60 bg-bbbg px-4 py-3"><EditForm u={u} onClose={onClose} /></td></tr>}
      {resetting && <tr><td colSpan={5} className="border-b border-bbborder/60 bg-bbbg px-4 py-3"><ResetForm id={u.id} onClose={onClose} /></td></tr>}
    </>
  )
}

function EditForm({ u, onClose }: { u: AppUser; onClose: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(updateUserAction.bind(null, u.id), {})
  useEffect(() => { if (state.ok) onClose() }, [state.ok, onClose])
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Nama</span><input name="nama" defaultValue={u.nama} required className={inp} /></label>
      <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Jabatan</span><input name="jabatan" defaultValue={u.jabatan ?? ''} className={inp} /></label>
      <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Unit / Divisi</span><select name="unit" defaultValue={u.unit ?? ''} className={inp}><option value="">— Tidak ada —</option>{UNITS.map((un) => <option key={un} value={un}>{un}</option>)}</select></label>
      <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Peran</span><select name="role" defaultValue={u.role} className={inp}>{ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></label>
      <label className="flex items-center gap-2 pb-2 text-sm text-bbink"><input type="checkbox" name="is_pimpinan" defaultChecked={u.is_pimpinan} className="h-4 w-4 rounded border-bbborder text-bbgreen focus:ring-bbgreen/30" /> Pimpinan unit</label>
      <button type="submit" disabled={pending} className="bb-press inline-flex items-center gap-1 rounded-lg bg-bbgreen px-3 py-2 text-sm font-semibold text-white hover:bg-bbgreen-dark disabled:opacity-60"><Check size={14} /> Simpan</button>
      <button type="button" onClick={onClose} className="bb-press rounded-lg border border-bbborder px-3 py-2 text-sm text-bbmuted">Batal</button>
      {state.error && <p className="w-full text-sm text-bbred">{state.error}</p>}
    </form>
  )
}

function ResetForm({ id, onClose }: { id: number; onClose: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(resetPasswordAction.bind(null, id), {})
  useEffect(() => { if (state.ok) onClose() }, [state.ok, onClose])
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1"><span className="text-xs text-bbmuted">Kata sandi baru (min 8 karakter)</span><input name="password" type="text" required minLength={8} placeholder="kata sandi baru" className={`${inp} w-64`} /></label>
      <button type="submit" disabled={pending} className="bb-press inline-flex items-center gap-1 rounded-lg bg-bbamber px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"><KeyRound size={14} /> Reset</button>
      <button type="button" onClick={onClose} className="bb-press rounded-lg border border-bbborder px-3 py-2 text-sm text-bbmuted">Batal</button>
      {state.error && <p className="w-full text-sm text-bbred">{state.error}</p>}
    </form>
  )
}

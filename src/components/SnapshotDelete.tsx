'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSnapshotAction } from '@/app/(app)/trends/actions'
import { Trash2 } from 'lucide-react'

export default function SnapshotDelete({ id, periode }: { id: number; periode: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => { if (confirm(`Hapus snapshot ${periode}?`)) start(async () => { await deleteSnapshotAction(id); router.refresh() }) }}
      className="bb-press text-bbfaint hover:text-bbred disabled:opacity-50"
      aria-label="Hapus snapshot"
    >
      <Trash2 size={15} />
    </button>
  )
}

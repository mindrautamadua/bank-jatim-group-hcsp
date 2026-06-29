'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDocumentAction } from '@/app/(app)/documents/actions'
import { Trash2 } from 'lucide-react'

export default function DocDeleteButton({ id, nama }: { id: number; nama: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm(`Hapus dokumen "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return
        start(async () => { await deleteDocumentAction(id); router.refresh() })
      }}
      className="bb-press text-bbfaint transition-colors hover:text-bbred disabled:opacity-50"
      aria-label="Hapus dokumen"
      title="Hapus"
    >
      <Trash2 size={15} />
    </button>
  )
}

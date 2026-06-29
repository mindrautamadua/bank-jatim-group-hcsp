import type { ReactNode } from 'react'

// Slot @modal menampung intercepting route (..)portfolio/[kode] sebagai overlay
// di atas Gantt — klik "Buka detail program" membuka modal, bukan pindah halaman.
export default function GanttLayout({
  children,
  modal,
}: {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

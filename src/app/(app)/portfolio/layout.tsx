import type { ReactNode } from 'react'

// Slot @modal menampung intercepting route (.)[kode] sebagai overlay di atas list.
export default function PortfolioLayout({
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

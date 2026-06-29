import type { ReactNode } from 'react'

export default function BudgetLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

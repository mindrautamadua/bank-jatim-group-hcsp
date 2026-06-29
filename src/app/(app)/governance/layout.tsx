import type { ReactNode } from 'react'

export default function GovernanceLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

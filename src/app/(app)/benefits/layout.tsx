import type { ReactNode } from 'react'

export default function BenefitsLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

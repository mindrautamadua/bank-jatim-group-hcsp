import type { ReactNode } from 'react'

export default function RoadmapLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

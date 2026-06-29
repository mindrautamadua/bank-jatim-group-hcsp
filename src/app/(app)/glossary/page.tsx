import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui'
import Glossary from '@/components/Glossary'

export const metadata: Metadata = {
  title: 'Glossary',
}

export default function GlossaryPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Glossary"
        subtitle="Daftar istilah, singkatan, dan konsep yang digunakan dalam platform HCSP — kerangka Balanced Scorecard, indikator kinerja, kematangan, hingga peran pengguna."
      />
      <Glossary />
    </div>
  )
}

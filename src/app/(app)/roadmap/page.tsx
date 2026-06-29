import { redirect } from 'next/navigation'

// Halaman Roadmap & Milestone dinonaktifkan; detail roadmap (/roadmap/[kode]) tetap aktif.
export default function RoadmapPage() {
  redirect('/dashboard')
}

import { redirect } from 'next/navigation'

// Halaman daftar Program Portfolio dinonaktifkan; detail program (/portfolio/[kode]) tetap aktif.
export default function Portfolio() {
  redirect('/dashboard')
}

'use server'

import { revalidatePath } from 'next/cache'
import { setActiveTenant } from '@/lib/auth'

// Pindah bank aktif (hanya pengguna level-grup). Mengembalikan true bila berhasil.
export async function switchTenantAction(schema: string): Promise<boolean> {
  const ok = await setActiveTenant(schema)
  if (ok) revalidatePath('/', 'layout')
  return ok
}

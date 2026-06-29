import { getSession } from '@/lib/auth'
import { getNotifications } from '@/lib/notifications'

export async function GET() {
  const user = await getSession()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { items, count } = await getNotifications({ unit: user.unit, role: user.role })
  return Response.json(
    { count, items: items.slice(0, 8) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}

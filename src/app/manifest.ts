import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'HCSP — Human Capital Strategic Planning · Bank Jatim Group',
    short_name: 'HCSP',
    description:
      'Platform eksekusi strategi human capital Grup Bank Jatim untuk memantau Blueprint HCM 2026–2030: program strategis, kematangan, dan dampak bisnis.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#6b0a10',
    theme_color: '#6b0a10',
    lang: 'id',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

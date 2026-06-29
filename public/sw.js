// Service worker HCSP — fokus installability + offline shell.
// PENTING (aplikasi perbankan): JANGAN meng-cache HTML/JSON ter-autentikasi.
// Hanya aset statis non-sensitif (build assets, ikon) dan halaman /offline.
const VERSION = 'hcsp-v1'
const STATIC_CACHE = `${VERSION}-static`
const PRECACHE = ['/offline', '/icon-192x192.png', '/icon-512x512.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Aset statis & immutable yang aman di-cache (di-hash oleh Next, bukan data sensitif).
function isCacheableStatic(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|ico)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigasi halaman: network-first, fallback ke /offline saat luring.
  // Respons TIDAK di-cache agar konten ter-autentikasi tidak tersimpan.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline')))
    return
  }

  // Aset statis: cache-first dengan pembaruan latar belakang.
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
  // Selain itu (API/data/route ter-autentikasi): biarkan lewat tanpa cache.
})

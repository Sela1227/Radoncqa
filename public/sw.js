/* RadOncQA Service Worker — V1.0.0
 * 鐵律（CLAUDE.md P3）：
 * 1. 只處理 GET；其餘一律放行（未來授權 API 的 POST 不可被攔）
 * 2. 外部域名一律放行（不快取、不攔截）
 * 3. 快取名含版本號，升版即淘汰舊快取（版本與 package.json / App.tsx 同步）
 * 策略：導覽請求 network-first（部署更新即時生效，斷網退回快取殼）；
 *       靜態資產 cache-first（Vite 雜湊檔名不可變，命中即回）。
 */
const CACHE = 'radoncqa-v1.1.0'
const SHELL = ['/']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return // 鐵律 1
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // 鐵律 2

  if (req.mode === 'navigate') {
    // 導覽：network-first，斷網退快取殼
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // 資產：cache-first，未命中走網路並回填
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

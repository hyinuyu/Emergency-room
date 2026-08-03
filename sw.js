const CACHE = 'gumi-er-v4';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 저장된 걸 즉시 주고, 뒤에서 새 버전을 받아 캐시 갱신 (다음 실행 때 최신)
function staleWhileRevalidate(req) {
  return caches.open(CACHE).then(cache =>
    cache.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => null);
      // 캐시가 있으면 기다리지 않고 바로 반환 (빠름!)
      return cached || network.then(r => r || Response.error());
    })
  );
}

self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (e.request.method !== 'GET') return;

  // 1) 데이터·API·외부 서비스는 서비스워커가 건드리지 않음 (항상 최신)
  if (url.includes('.vercel.app') ||
      url.includes('apis.data.go.kr') ||
      url.includes('raw.githubusercontent.com') ||
      url.includes('allorigins.win') ||
      url.includes('corsproxy.io') ||
      url.includes('codetabs.com') ||
      url.includes('cors.workers.dev') ||
      url.includes('googletagmanager.com') ||
      url.includes('google-analytics.com') ||
      url.includes('firestore.googleapis.com') ||
      url.includes('firebaseio.com') ||
      url.includes('version.txt')) {
    return;
  }

  // 2) 폰트는 캐시해서 재방문시 즉시 표시
  if (url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('jsdelivr.net')) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // 3) 우리 사이트 파일: 저장된 것 즉시 표시 + 백그라운드 갱신
  if (url.indexOf(self.location.origin) === 0) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }
});

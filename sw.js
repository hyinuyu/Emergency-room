const CACHE = 'gumi-er-v2';
const ASSETS = ['./'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

// 예전 캐시(v1) 정리
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // 1) 공공데이터 API·외부 CDN 요청은 서비스워커가 절대 건드리지 않음
  //    (캐시에 없는 걸 반환해서 "불러오기 실패"가 뜨던 원인)
  if (url.includes('apis.data.go.kr') ||
      url.includes('googleapis.com') ||
      url.includes('googletagmanager.com') ||
      url.includes('gstatic.com') ||
      url.includes('jsdelivr.net') ||
      url.includes('cloudflare.com') ||
      url.includes('firebaseio.com') ||
      url.includes('allorigins.win') ||
      url.includes('corsproxy.io')) {
    return; // 브라우저가 알아서 처리하게 둠
  }

  // 2) GET이 아닌 요청은 통과
  if (e.request.method !== 'GET') return;

  // 3) 페이지/정적파일: 네트워크 우선, 실패시 캐시
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || Response.error()))
  );
});

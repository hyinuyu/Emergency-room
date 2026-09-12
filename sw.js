// 구미차병원 응급실 — 서비스워커
// 정적 파일은 즉시 표시 + 백그라운드 갱신 / 실시간 데이터는 항상 네트워크
const CACHE='er-shell-v5';
const SHELL=['./','./index.html','./manifest.json'];

// 서비스워커가 건드리지 않을 주소 (항상 최신이어야 하는 것들)
const BYPASS=['apis.data.go.kr','googletagmanager.com','google-analytics.com','firestore.googleapis.com'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const {request}=e;
  if(request.method!=='GET')return;
  if(BYPASS.some(d=>request.url.includes(d)))return;

  e.respondWith(
    caches.open(CACHE).then(cache=>
      cache.match(request).then(hit=>{
        const net=fetch(request).then(res=>{
          if(res&&res.ok&&res.type==='basic')cache.put(request,res.clone()).catch(()=>{});
          return res;
        }).catch(()=>null);
        return hit||net.then(r=>r||Response.error());
      })
    )
  );
});

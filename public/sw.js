const CACHE='workflowos-shell-v1';
const OFFLINE='/offline.html';
const SAFE_ASSETS=[OFFLINE,'/manifest.webmanifest','/icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SAFE_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;

  // Never cache API, auth, or authenticated workspace data.
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/login')) return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match(OFFLINE)));
    return;
  }

  if(SAFE_ASSETS.includes(url.pathname)){
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
  }
});

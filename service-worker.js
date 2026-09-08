'use strict';

function openDB(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open('MiDiaDB',1);
    r.onupgradeneeded=e=>e.target.result.createObjectStore('kv');
    r.onsuccess=e=>res(e.target.result);
    r.onerror=rej;
  });
}
async function dbGet(k){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('kv','readonly');
    const req=tx.objectStore('kv').get(k);
    req.onsuccess=e=>res(e.target.result);
    req.onerror=rej;
  });
}
async function dbSet(k,v){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('kv','readwrite');
    tx.objectStore('kv').put(v,k);
    tx.oncomplete=res;
    tx.onerror=rej;
  });
}

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

self.addEventListener('periodicsync',event=>{
  if(event.tag==='midia-reminder') event.waitUntil(checkAndNotify());
});

async function checkAndNotify(){
  const cfg=await dbGet('cfg');
  if(!cfg) return;
  const now=new Date();
  const [h,m]=cfg.notifTime.split(':').map(Number);
  const today=now.toDateString();
  const cur=now.getHours()*60+now.getMinutes();
  const tgt=h*60+m;
  if(cur<tgt||cur>=tgt+30||cfg.lastNotifDay===today) return;
  if(!cfg.pendingCount) return;
  await self.registration.showNotification('Mi Día — Pendientes de hoy',{
    body: cfg.pendingText,
    tag:'midia-daily',
    renotify:true,
    icon:'./icons/icon-192.png',
  });
  await dbSet('cfg',{...cfg,lastNotifDay:today});
}

self.addEventListener('message',async event=>{
  if(event.data&&event.data.type==='CFG') await dbSet('cfg',event.data.payload);
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cls=>{
    for(const c of cls) if(c.focus) return c.focus();
    return clients.openWindow(self.location.origin);
  }));
});

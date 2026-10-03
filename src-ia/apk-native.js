/* ===== Mi Día · integración Android (va DESPUÉS del script principal) ===== */
(function(){
const N=window.MiDiaNative;if(!N)return;
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function at(ds,hm){const [h,m]=(hm||"09:00").split(":").map(Number);const d=new Date(ds+"T00:00:00");d.setHours(h||0,m||0,0,0);return d.getTime()}
function notif(){const n=S.settings&&S.settings.notif||{};if(!n.summaryTime)n.summaryTime="08:30";return n}
/* ---------- avisos programados (AlarmManager) ---------- */
function buildAlarms(){
  const n=notif(),now=Date.now(),out=[],today=ymd(new Date()),lim=new Date();lim.setDate(lim.getDate()+45);const limS=ymd(lim);
  if(!n.push)return out;
  if(n.taskReminders!==false){
    S.taskCats.forEach(c=>(S.tasks[c.id]||[]).forEach(t=>{if(t.done||!t.dueDate||t.dueDate>limS)return;
      const w=at(t.dueDate,t.dueTime||"09:00");if(w>now)out.push({id:"t"+t.id,at:w,title:`${c.emoji} ${t.text}`,body:t.dueTime?`Vence hoy a las ${t.dueTime}`:"Vence hoy",tab:"tareas"});
      if(t.dueTime){const pre=w-30*60000;if(pre>now)out.push({id:"tp"+t.id,at:pre,title:`⏰ En 30 min: ${t.text}`,body:`${c.name} · a las ${t.dueTime}`,tab:"tareas"})}}));
    (S.events||[]).forEach(ev=>{let d=ev.date;if(!d)return;
      if(ev.recurring){const md=d.slice(5);const y=new Date().getFullYear();d=`${y}-${md}`;if(at(d,ev.time)<=now)d=`${y+1}-${md}`}
      if(d>limS)return;const w=at(d,ev.time||"09:00");
      if(w>now)out.push({id:"e"+ev.id+d,at:w,title:`${ev.recurring?"🔁":"📅"} ${ev.title}`,body:ev.time?`Hoy a las ${ev.time}`:"Hoy",tab:"calendario"});
      if(ev.time){const pre=w-60*60000;if(pre>now)out.push({id:"ep"+ev.id+d,at:pre,title:`⏰ En 1 hora: ${ev.title}`,body:`A las ${ev.time}`,tab:"calendario"})}
      if(ev.recurring){const eve=at(d,"20:00")-864e5;if(eve>now)out.push({id:"ev"+ev.id+d,at:eve,title:`🔁 Mañana: ${ev.title}`,body:"Que no se te pase 😉",tab:"calendario"})}});
  }
  if(n.dailySummary){
    for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()+i);const ds=ymd(d);const w=at(ds,n.summaryTime);if(w<=now)continue;
      let pend=0,due=0,late=0;S.taskCats.forEach(c=>(S.tasks[c.id]||[]).forEach(t=>{if(t.done)return;pend++;if(t.dueDate===ds)due++;else if(t.dueDate&&t.dueDate<ds)late++}));
      const evs=(S.events||[]).filter(e=>(e.recurring?e.date.slice(5)===ds.slice(5):(e.date<=ds&&(e.endDate||e.date)>=ds)));
      const parts=[];if(due)parts.push(`${due} tarea${due>1?"s":""} para hoy`);if(late)parts.push(`${late} atrasada${late>1?"s":""}`);if(evs.length)parts.push(evs.map(e=>e.title).slice(0,2).join(", "));
      out.push({id:"sum"+ds,at:w,title:"☀️ Buenos días",body:parts.length?parts.join(" · "):`${pend} tarea${pend===1?"":"s"} pendiente${pend===1?"":"s"}. ¡A por el día!`,tab:"tareas"});
    }
  }
  return out.sort((a,b)=>a.at-b.at).slice(0,120);
}
/* ---------- widget ---------- */
function widgetData(){
  const today=ymd(new Date()),lines=[];let pend=0;
  const all=[];S.taskCats.forEach(c=>(S.tasks[c.id]||[]).forEach(t=>{if(t.done)return;pend++;all.push({c,t})}));
  all.sort((a,b)=>{const da=a.t.dueDate||"9999",db=b.t.dueDate||"9999";return da<db?-1:da>db?1:0});
  all.slice(0,6).forEach(({c,t})=>{let s=`${c.emoji} ${t.text}`;if(t.dueDate){s+=t.dueDate<today?"  ⚠️":t.dueDate===today?"  · hoy":"  · "+fmtDueDate(t.dueDate)}lines.push(s)});
  let next=null;(S.events||[]).forEach(e=>{let d=e.date;if(e.recurring){const y=new Date().getFullYear();d=`${y}-${e.date.slice(5)}`;if(d<today)d=`${y+1}-${e.date.slice(5)}`}
    if((e.endDate||d)>=today&&(!next||d<next.d))next={d,t:e.title,h:e.time}});
  const spent=(S.expenses||[]).filter(e=>e.date===today).reduce((a,e)=>a+e.amount,0);
  return {pend,lines,next:next?`${next.d===today?"Hoy":fmtDueDate(next.d)}${next.h?" "+next.h:""} · ${next.t}`:"",spent:spent?fmtMoney(spent):""};
}
let syncT=null,lastA="",lastW="";
function syncNative(){clearTimeout(syncT);syncT=setTimeout(()=>{
  try{const a=JSON.stringify(buildAlarms());if(a!==lastA){lastA=a;N.scheduleAlarms(a)}}catch(e){console.error(e)}
  try{const w=JSON.stringify(widgetData());if(w!==lastW){lastW=w;N.syncWidget(w)}}catch(e){console.error(e)}
},800)}
window.__mdSync=syncNative;
const _save=save;save=function(){const r=_save.apply(this,arguments);syncNative();return r};
/* ---------- barras del sistema con el color del tema ---------- */
function setBars(){try{const dark=document.documentElement.getAttribute("data-theme")==="dark"||(document.documentElement.getAttribute("data-theme")!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);N.setBars(dark?"#08080B":"#F4F6F9",!dark)}catch(e){}}
const _app=applyAppearance;applyAppearance=function(){const r=_app.apply(this,arguments);setBars();return r};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",setBars);
/* ---------- ajustes de notificaciones reales ---------- */
window.__mdNotifPerm=function(ok){const n=notif();if(ok){n.push=true;if(n.taskReminders===undefined)n.taskReminders=true;save();toast("🔔 Notificaciones activadas")}else{n.push=false;save();toast("Permiso de notificaciones denegado")}if(S.activeTab==="mas")renderMas()};
masNotifHTML=function(){
  const n=notif();let allowed=true;try{allowed=N.notificationsAllowed()}catch(e){}
  const tg=(key,ico,title,sub)=>`<div class="mas-toggle-row"><div class="mas-toggle-ico">${ico}</div><div class="mas-toggle-body"><div class="mas-toggle-title">${title}</div><div class="mas-toggle-sub">${sub}</div></div><div class="mas-switch${n[key]?" on":""}" data-masnotif="${key}"><div class="mas-switch-knob"></div></div></div>`;
  const cnt=n.push?buildAlarms().length:0;
  return `${masSubHdr("Notificaciones","Avisos en tu móvil, aunque la app esté cerrada")}
  ${n.push&&!allowed?`<div class="mas-warn-box" style="margin-bottom:14px">⚠️ Android tiene bloqueadas las notificaciones de Mi Día. <b data-mdperm style="text-decoration:underline">Permitir</b></div>`:""}
  ${tg("push","🔔","Notificaciones","Actívalas para recibir avisos en el móvil")}
  ${n.push?`${tg("taskReminders","⏰","Tareas y recordatorios","Al vencer una tarea (y 30 min antes si tiene hora), el día de cada recordatorio y la víspera de los anuales")}
  ${tg("dailySummary","☀️","Resumen de buenos días","Lo que tienes para hoy, cada mañana")}
  ${n.dailySummary?`<div class="mas-toggle-row"><div class="mas-toggle-ico">🕗</div><div class="mas-toggle-body"><div class="mas-toggle-title">Hora del resumen</div></div><input type="time" id="mdSumTime" value="${n.summaryTime}" class="field-input" style="width:110px;margin:0"></div>`:""}
  <div style="display:flex;gap:8px;margin-top:12px"><button class="sheet-btn secondary" style="margin:0" data-mdtest>Probar notificación</button></div>
  <div style="font-size:11.5px;color:var(--text-2);margin-top:12px;line-height:1.5">Hay ${cnt} aviso${cnt===1?"":"s"} programado${cnt===1?"":"s"} para las próximas semanas. Si no te llegan, revisa en Ajustes de Android → Apps → Mi Día → Batería → «Sin restricciones».</div>`:""}
  <div style="font-size:11.5px;color:var(--text-2);margin-top:12px;line-height:1.5">📱 Widget: mantén pulsada la pantalla de inicio → Widgets → Mi Día.</div>`;
};
toggleMasNotif=async function(key){
  const n=notif();
  if(key==="push"&&!n.push){let ok=false;try{ok=N.notificationsAllowed()}catch(e){}if(ok)return window.__mdNotifPerm(true);try{N.requestNotifPermission()}catch(e){}return}
  n[key]=!n[key];save();renderMas();
};
const _rm=renderMas;renderMas=function(){const r=_rm.apply(this,arguments);if(_masPage==="notif"){const el=document.getElementById("masBody");
  const t=el.querySelector("[data-mdtest]");t&&t.addEventListener("click",()=>{try{N.testNotification()}catch(e){}});
  const p=el.querySelector("[data-mdperm]");p&&p.addEventListener("click",()=>{try{N.requestNotifPermission()}catch(e){}});
  const st=el.querySelector("#mdSumTime");st&&st.addEventListener("change",()=>{notif().summaryTime=st.value||"08:30";save()})}return r};
/* ---------- botón atrás de Android ---------- */
window.__mdBack=function(){
  const cv=document.getElementById("clView");if(cv&&!cv.hidden){clCloseChat();return true}
  const vc=document.getElementById("vConfirm");if(vc&&vc.style.display==="flex"){vc.style.display="none";return true}
  const ovs=[...document.querySelectorAll(".overlay:not([hidden])")];if(ovs.length){const o=ovs[ovs.length-1];if(o.id==="aiCmdOverlay"&&typeof closeAiSmart==="function")closeAiSmart();else if(o.id==="sumOverlay"){try{clearSumCountdowns()}catch(e){}o.setAttribute("hidden","")}else o.setAttribute("hidden","");return true}
  const ae=document.activeElement;if(ae&&(ae.tagName==="INPUT"||ae.tagName==="TEXTAREA")){ae.blur();return true}
  if(S.activeTab==="mas"&&_masPage){_masPage=null;renderMas();return true}
  if(S.activeTab!=="tareas"){setTab("tareas",-1);return true}
  return false;
};
/* ---------- accesos desde el widget / atajos ---------- */
window.__mdOpen=function(what){
  try{if(what==="chat")clOpenChat();else if(what==="scan")clScanTicket();else if(what==="voice"){clOpenChat();setTimeout(()=>{const m=document.getElementById("clMic");m&&!m.hidden&&m.click()},350)}
  else if(what==="add"){setTab("tareas");setTimeout(()=>{const i=document.getElementById("taskInput");i&&i.focus()},250)}
  else if(what==="calendario"||what==="gastos"||what==="tareas")setTab(what)}catch(e){console.error(e)}
};
document.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>{setBars();syncNative();try{N.ready()}catch(e){}},300)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){try{typeof maybePurge==="function"&&maybePurge()}catch(e){}syncNative()}});
})();

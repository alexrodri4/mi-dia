/* ================= Claude (IA) para Mi Día =================
   Funciona igual en el artefacto (capacidad `sample`) y en la APK
   (puente nativo con tu clave de API, ver apk-shim).               */
(function(){
const NATIVE=!!window.MiDiaNative;
let _sampleP=null;
function clSample(){
  if(!_sampleP)_sampleP=(async()=>{try{return window.claude&&window.claude.use?await window.claude.use("sample"):null}catch(e){return null}})();
  return _sampleP;
}
function clHasKey(){if(!NATIVE)return true;try{return !!MiDiaNative.hasApiKey()}catch(e){return false}}
const CL_ERR={
  not_granted:NATIVE?"Añade tu clave de API de Claude en Más → Claude (IA).":"No has dado permiso para que esta página use Claude.",
  sampling_disabled:NATIVE?"Tu cuenta de API no tiene saldo. Añádelo en platform.claude.com → Billing.":"Claude no está disponible para tu cuenta ahora mismo.",
  not_declared:"Esta función no está disponible aquí.",
  capability_disabled:"Esta función no está disponible en este dispositivo.",
  capability_removed:"Esta función no está disponible en esta versión.",
  images_unavailable:"Aquí no se pueden enviar fotos a Claude.",
  image_rejected:"No he podido leer esa imagen. Prueba con otra foto.",
  rate_limited:"Demasiadas peticiones seguidas. Espera un momento.",
  session_expired:"Tu sesión ha caducado. Vuelve a entrar.",
  refused:"Claude no ha podido procesar eso. Prueba a reformularlo.",
  empty_completion:"Claude no ha devuelto respuesta. Prueba otra vez.",
  invalid_json:"No he podido interpretar la respuesta. Prueba otra vez.",
  prompt_too_large:"Hay demasiados datos para enviar de una vez.",
  upstream_error:NATIVE?"Sin conexión o Claude está saturado. Prueba en un momento.":"Problema de conexión con Claude. Inténtalo de nuevo."
};
function clErrText(e){const c=e&&e.code;return CL_ERR[c]||(e&&e.message)||"Ha ocurrido un problema. Inténtalo de nuevo."}
window.clErrText=clErrText;
/* Mensajes de error del Asistente Mágico existente, adaptados a la APK */
try{if(NATIVE&&typeof AI_SMART_ERROR_COPY==="object"){Object.keys(CL_ERR).forEach(k=>{AI_SMART_ERROR_COPY[k]=CL_ERR[k]});AI_SMART_ERROR_COPY.not_declared=CL_ERR.not_granted}}catch(e){}

/* ---------- utilidades ---------- */
function ymdOf(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function addD(ds,n){const d=new Date(ds+"T12:00:00");d.setDate(d.getDate()+n);return ymdOf(d)}
function md(t){
  const lines=esc(String(t||"")).split("\n");let out="",inL=false;
  lines.forEach(l=>{l=l.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");const m=l.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/);
    if(m){if(!inL){out+="<ul>";inL=true}out+=`<li>${m[1]}</li>`}else{if(inL){out+="</ul>";inL=false}if(l.trim())out+=`<p>${l.replace(/^#+\s*/,"")}</p>`}});
  if(inL)out+="</ul>";return out;
}
function sumAmt(a){return Math.round(a.reduce((x,e)=>x+(+e.amount||0),0)*100)/100}
function catName(id,list){const c=list.find(c=>c.id===id);return c?c.name:id}
function nextOccurrence(ev,from){
  if(!ev.recurring)return ev.date;
  const mmdd=ev.date.slice(5);let y=+from.slice(0,4);let d=`${y}-${mmdd}`;if(d<from)d=`${y+1}-${mmdd}`;return d;
}
/* ---------- contexto de datos para Claude ---------- */
function clContext(){
  const t=todayStr(),ym=t.slice(0,7),prevYm=shiftMonth(ym,-1);
  const pend=[];
  S.taskCats.forEach(c=>(S.tasks[c.id]||[]).forEach(x=>{if(x.done)return;
    const o={cat:c.name,tarea:x.text};if(x.dueDate)o.fecha=x.dueDate;if(x.dueTime)o.hora=x.dueTime;if(x.recurring)o.recurrente=true;if(x.priority)o.prioridad=x.priority;
    if(x.notes)o.notas=String(x.notes).slice(0,80);const st=(x.subtasks||[]).filter(s=>!s.done).map(s=>s.text).slice(0,6);if(st.length)o.subtareas=st;pend.push(o)}));
  const lim=addD(t,60),evs=[];
  (S.events||[]).forEach(ev=>{const d=nextOccurrence(ev,t);const end=ev.endDate||d;if(end<t||d>lim)return;
    const o={titulo:ev.title,fecha:d};if(ev.time)o.hora=ev.time;if(ev.endDate&&!ev.recurring)o.hasta=ev.endDate;if(ev.recurring)o.anual=true;evs.push(o)});
  evs.sort((a,b)=>a.fecha<b.fecha?-1:1);
  const exps=monthExpenses(ym),incs=monthIncomes(ym),byCat={};
  exps.forEach(e=>{const n=catName(e.catId,EXPENSE_CATS);byCat[n]=Math.round(((byCat[n]||0)+e.amount)*100)/100});
  const lastExp=[...(S.expenses||[])].sort((a,b)=>(a.date<b.date?1:-1)).slice(0,25).map(e=>({fecha:e.date,importe:e.amount,cat:catName(e.catId,EXPENSE_CATS),desc:e.desc}));
  const done7=collectCompleted(7);
  return {hoy:t,dia_semana:new Date().toLocaleDateString("es-ES",{weekday:"long"}),hora:new Date().toTimeString().slice(0,5),
    racha_dias_completando:computeStreak(),
    tareas_pendientes:pend.slice(0,90),tareas_completadas_ultimos_7_dias:done7.slice(0,25).map(x=>x.text),num_completadas_7_dias:done7.length,
    recordatorios_proximos_60_dias:evs.slice(0,40),
    gastos:{mes_actual:ym,total_mes:sumAmt(exps),por_categoria_mes:byCat,total_mes_anterior:sumAmt(monthExpenses(prevYm)),media_3_meses:avgExpenseLastN(ym,3),ultimos:lastExp},
    ingresos:{total_mes:sumAmt(incs),total_mes_anterior:sumAmt(monthIncomes(prevYm))},
    saldo_actual:typeof currentBalance==="function"?currentBalance():null};
}
function clActionSpec(){
  return `Categorías de TAREAS (usa el id tal cual si encaja; si no, propone una nueva):
${S.taskCats.map(e=>`- "${e.name}" (id: "${e.id}")`).join("\n")}
Categorías de GASTOS (elige siempre una por id): ${EXPENSE_CATS.map(e=>`"${e.id}"=${e.name}`).join(", ")}
Categorías de INGRESOS (elige una por id): ${INCOME_CATS.map(e=>`"${e.id}"=${e.name}`).join(", ")}
Formas exactas de cada acción:
- Crear tarea: {"type":"task","categoryId":"<id o null>","newCategoryName":"<solo si null>","newCategoryEmoji":"<emoji solo si null>","text":"<título corto>","notes":"","dueDate":"<YYYY-MM-DD o null>","recurring":false,"subtasks":[{"text":"..."}]}
- Crear recordatorio de calendario: {"type":"event","title":"...","date":"YYYY-MM-DD","endDate":null,"time":"<HH:MM o null>","recurring":<true si se repite cada año>}
- Apuntar gasto: {"type":"expense","categoryId":"<id>","amount":<número>,"desc":"...","date":"<YYYY-MM-DD o null=hoy>"}
- Apuntar ingreso: {"type":"income","categoryId":"<id>","amount":<número>,"desc":"...","date":"<YYYY-MM-DD o null=hoy>"}
- Marcar tarea hecha: {"type":"done","query":"<texto para buscarla>"}
- Borrar tarea: {"type":"delete_task","query":"..."}
- Borrar gasto: {"type":"delete_expense","query":"..."}`;
}

/* ---------- ampliar el Asistente Mágico: ingresos y gastos con fecha ---------- */
const _prev=buildAiSmartPreview,_apply=applyOneSmartAction;
buildAiSmartPreview=function(e){
  if(e&&e.type==="income"){const a=Number(e.amount);if(!a||a<=0)return null;const c=INCOME_CATS.find(c=>c.id===e.categoryId)||INCOME_CATS[0];
    return `<b>💰 Nuevo ingreso</b><br>${fmtMoney(a)} — ${esc(e.desc||c.name)}<br><span style="font-size:12px;color:var(--text-2)">${c.emoji} ${esc(c.name)}${e.date&&e.date!==todayStr()?" · 📅 "+fmtDueDate(e.date):""}</span>`}
  const h=_prev(e);
  if(h&&e&&e.type==="expense"&&e.date&&e.date!==todayStr())return h.replace(/<\/span>$/,` · 📅 ${fmtDueDate(e.date)}</span>`);
  return h;
};
applyOneSmartAction=function(e){
  if(e&&e.type==="income"){const c=INCOME_CATS.find(c=>c.id===e.categoryId)||INCOME_CATS[0],d=/^\d{4}-\d\d-\d\d$/.test(e.date||"")?e.date:todayStr();
    S.incomes||(S.incomes=[]);S.incomes.push({id:Date.now()+"_"+Math.floor(1e3*Math.random())+"_i",catId:c.id,amount:Math.round(Number(e.amount)*100)/100,desc:e.desc||c.name,date:d,at:d===todayStr()?Date.now():new Date(d+"T12:00:00").getTime()});
    return {ok:true,msg:`💰 Ingreso de ${fmtMoney(Number(e.amount))} añadido`,tab:"gastos"}}
  const r=_apply(e);
  if(r&&r.ok&&e&&e.type==="expense"&&Array.isArray(S.expenses)&&/^\d{4}-\d\d-\d\d$/.test(e.date||"")&&e.date!==todayStr()){const x=S.expenses[S.expenses.length-1];if(x){x.date=e.date;x.at=new Date(e.date+"T12:00:00").getTime()}}
  return r;
};
function clAfterApply(results){
  const ok=results.filter(r=>r.ok);if(!ok.length)return;
  save();const tabs=new Set(ok.map(r=>r.tab).filter(Boolean));
  if(tabs.has("tareas")){renderCatNav();renderTareas()}
  if(tabs.has("gastos")||S.activeTab==="gastos")renderGastos();
  if(tabs.has("calendario")||S.activeTab==="calendario")renderCalendario();
  if(S.activeTab==="mas")renderMas();
}

/* ================= CHAT ================= */
const chat={msgs:[],busy:false,err:"",ctl:null,listening:false,rec:null};
function chatRules(){
  return `Eres Claude, el asistente integrado en «Mi Día», la app de organización personal de Alex (tareas por categorías con subtareas y fechas límite, recordatorios de calendario —algunos anuales— y control de gastos e ingresos en euros).
Responde en español de España, tono cercano y directo, breve (normalmente menos de 120 palabras; más solo si pide un plan). Usa **negrita** para lo clave y listas cortas con "- " cuando ayuden. Basa todo en los DATOS de abajo; no inventes tareas ni cifras. Si faltan datos, dilo.
Puedes analizar sus gastos (comparar meses, categorías, dónde ahorrar), priorizar y planificar tareas, organizarle el día o la semana, dividir tareas en subtareas y recordarle lo que tiene.
PUEDES HACER COSAS EN LA APP: si pide crear, apuntar, completar, borrar, planificar u organizar algo —o acepta una propuesta tuya— propón las acciones concretas en "acciones"; el usuario verá una tarjeta y las confirmará con un botón. Nunca digas que no puedes hacerlo. Para planificar la semana, crea tareas con dueDate repartidas en días concretos.
FORMATO OBLIGATORIO: responde SOLO con un objeto JSON {"respuesta":"<tu mensaje>","acciones":[ ... ]} (acciones = [] si no hay nada que hacer en la app).
${clActionSpec()}
DATOS DEL USUARIO (JSON):
${JSON.stringify(clContext())}`;
}
function chatHTML(){
  return `<div class="cl-head"><span class="cl-logo">✦</span><div><h2>Claude</h2><div class="sub">Tu asistente de Mi Día${NATIVE?clUsageLine():""}</div></div><div class="sp"></div>
    <button class="cl-sbtn" data-cl="new" ${chat.msgs.length?"":"hidden"}>Nuevo</button><button class="cl-sbtn" data-cl="close">Cerrar</button></div>
  <div class="cl-list" id="clList"></div>
  <div class="cl-chips" id="clChips">${["¿Qué tengo hoy?","Organízame la semana","Analiza mis gastos del mes","¿En qué puedo ahorrar?","¿Qué tareas llevo atrasadas?","Divide mi tarea más grande en pasos"].map(q=>`<button class="cl-chip" data-clq="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <div class="cl-bar"><button class="cl-rbtn cl-mic" id="clMic" title="Dictar" aria-label="Dictar">🎤</button><textarea id="clInput" rows="1" placeholder="Escribe a Claude…"></textarea><button class="cl-rbtn cl-send" id="clSend" aria-label="Enviar">➤</button></div>`;
}
function clOpenChat(prompt){
  let v=document.getElementById("clView");
  if(!v){v=document.createElement("div");v.id="clView";v.className="cl-view";v.setAttribute("role","dialog");v.setAttribute("aria-label","Claude");document.body.appendChild(v)}
  v.innerHTML=chatHTML();v.hidden=false;
  v.querySelector('[data-cl="close"]').onclick=clCloseChat;
  v.querySelector('[data-cl="new"]').onclick=()=>{if(chat.ctl)try{chat.ctl.abort()}catch(e){}chat.msgs=[];chat.err="";chat.busy=false;clOpenChat()};
  v.querySelectorAll("[data-clq]").forEach(b=>b.onclick=()=>clSend(b.dataset.clq));
  const inp=v.querySelector("#clInput");
  inp.addEventListener("input",()=>{inp.style.height="auto";inp.style.height=Math.min(120,inp.scrollHeight)+"px"});
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();clSend(inp.value)}});
  v.querySelector("#clSend").onclick=()=>clSend(inp.value);
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const mic=v.querySelector("#clMic");
  if(!SR)mic.hidden=true;else mic.onclick=clMic;
  clRender();
  if(prompt)clSend(prompt);
}
function clCloseChat(){if(chat.rec)try{chat.rec.abort()}catch(e){}const v=document.getElementById("clView");if(v){v.hidden=true;v.innerHTML=""}}
window.clOpenChat=clOpenChat;window.clCloseChat=clCloseChat;
function clMic(){
  const mic=document.getElementById("clMic"),inp=document.getElementById("clInput");
  if(chat.rec){try{chat.rec.stop()}catch(e){}return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
  const r=new SR();chat.rec=r;r.lang="es-ES";r.interimResults=true;r.continuous=false;const base=inp.value?inp.value.trim()+" ":"";
  r.onresult=e=>{let t="";for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;inp.value=base+t.trim()};
  r.onerror=e=>{if(e&&(e.error==="not-allowed"||e.error==="service-not-allowed"))toast("Necesito permiso de micrófono")};
  r.onend=()=>{chat.rec=null;mic.classList.remove("on");if(inp.value.trim()&&inp.value.trim()!==base.trim())clSend(inp.value)};
  mic.classList.add("on");try{r.start()}catch(e){chat.rec=null;mic.classList.remove("on")}
}
function clActCard(m,mi){
  const acts=m.acciones||[];const st=m._ran?"ran":m._cancel?"cancel":"";
  const rows=acts.map((a,i)=>{const h=buildAiSmartPreview(a);if(!h)return "";
    return st?`<div style="padding:6px 0;${i?"border-top:1px solid var(--border)":""}">${h}</div>`:`<label><input type="checkbox" data-clc="${mi}:${i}" ${a._off?"":"checked"}><span>${h}</span></label>`}).join("");
  if(!rows)return "";
  return `<div class="cl-msg bot"><div class="cl-act ${st}"><div class="eb">${st==="ran"?"✓ Hecho en la app":st==="cancel"?"Cancelado":"Confirma para hacerlo en la app"}</div>${rows}
    ${st?(m._ran&&m._ran.err?`<div style="font-size:12px;color:var(--danger);margin-top:6px">${esc(m._ran.err)}</div>`:""):`<div class="row"><button class="cl-ok" data-clrun="${mi}">Confirmar</button><button class="cl-no" data-clcancel="${mi}">Cancelar</button></div>`}</div></div>`;
}
function clRender(){
  const list=document.getElementById("clList");if(!list)return;
  let h="";
  if(NATIVE&&!clHasKey())h+=`<div class="cl-msg bot"><div class="cl-b">Para hablar conmigo necesitas pegar tu clave de API en <b>Más → Claude (IA)</b>.</div></div>`;
  else if(!chat.msgs.length)h+=`<div class="cl-msg bot"><div class="cl-b"><p>¡Hola! Tengo delante tus tareas, recordatorios y gastos.</p><p>Pregúntame lo que quieras o pídeme que organice, apunte o planifique algo por ti.</p></div></div>`;
  chat.msgs.forEach((m,mi)=>{
    if(m.role==="user"){h+=`<div class="cl-msg me"><div class="cl-b">${esc(m.text)}</div></div>`;return}
    if(m.text)h+=`<div class="cl-msg bot"><div class="cl-b">${md(m.text)}</div></div>`;
    if(m.acciones&&m.acciones.length)h+=clActCard(m,mi);
  });
  if(chat.busy)h+=`<div class="cl-msg bot"><div class="cl-b cl-dots"><i></i><i></i><i></i></div></div>`;
  if(chat.err)h+=`<div class="cl-err">${esc(chat.err)}</div>`;
  list.innerHTML=h;list.scrollTop=list.scrollHeight;
  list.querySelectorAll("[data-clc]").forEach(c=>c.onchange=()=>{const[mi,i]=c.dataset.clc.split(":").map(Number);chat.msgs[mi].acciones[i]._off=!c.checked});
  list.querySelectorAll("[data-clrun]").forEach(b=>b.onclick=()=>clRun(+b.dataset.clrun));
  list.querySelectorAll("[data-clcancel]").forEach(b=>b.onclick=()=>{chat.msgs[+b.dataset.clcancel]._cancel=true;clRender()});
  const chips=document.getElementById("clChips");if(chips)chips.hidden=chat.busy||(NATIVE&&!clHasKey());
  const nb=document.querySelector('#clView [data-cl="new"]');if(nb)nb.hidden=!chat.msgs.length;
}
function clRun(mi){
  const m=chat.msgs[mi];if(!m||m._ran||m._cancel)return;
  const sel=(m.acciones||[]).filter(a=>!a._off&&buildAiSmartPreview(a));
  if(!sel.length){toast("Selecciona al menos una acción");return}
  const res=sel.map(a=>{try{return applyOneSmartAction(a)}catch(e){return {ok:false,msg:"⚠️ Error al ejecutar"}}});
  clAfterApply(res);
  const bad=res.filter(r=>!r.ok);m._ran={ok:res.length-bad.length,err:bad.map(r=>r.msg).join(" ")};
  clRender();toast(bad.length===res.length?bad[0].msg:res.length===1?res[0].msg:`✅ ${res.length-bad.length} de ${res.length} acciones hechas`);
}
function clTurns(){
  const turns=[{role:"user",content:chatRules()},{role:"assistant",content:'{"respuesta":"Entendido, tengo tus datos.","acciones":[]}'}];
  chat.msgs.slice(-14).forEach(m=>{
    if(m.role==="user")turns.push({role:"user",content:m.text});
    else{let note="";if(m.acciones&&m.acciones.length){const d=m.acciones.map(a=>a.type+": "+(a.text||a.title||a.desc||a.query||"")).join("; ");
        note=m._ran?` [El usuario CONFIRMÓ y se ejecutaron: ${d}]`:m._cancel?` [El usuario canceló: ${d}]`:` [Propuesto, sin confirmar: ${d}]`}
      turns.push({role:"assistant",content:JSON.stringify({respuesta:m.text||"",acciones:[]})+note})}
  });
  return turns;
}
async function clSend(text){
  text=String(text||"").trim();if(!text||chat.busy)return;
  const inp=document.getElementById("clInput");if(inp){inp.value="";inp.style.height=""}
  if(NATIVE&&!clHasKey()){toast("Primero añade tu clave de API");return}
  chat.msgs.push({role:"user",text});chat.err="";chat.busy=true;clRender();
  const sample=await clSample();
  if(!sample){chat.busy=false;chat.err=CL_ERR.not_declared;chat.msgs.pop();clRender();return}
  chat.ctl=new AbortController();
  try{
    const r=await sample.json(clTurns(),{modelTier:"default",cache:false,signal:chat.ctl.signal});
    const o=Array.isArray(r)?{respuesta:"",acciones:r}:(r&&typeof r==="object"?r:{respuesta:String(r)});
    const acts=(Array.isArray(o.acciones)?o.acciones:[]).filter(a=>a&&typeof a==="object"&&a.type&&buildAiSmartPreview(a));
    chat.msgs.push({role:"assistant",text:String(o.respuesta||o.respuesta_texto||o.texto||(acts.length?"Esto es lo que haría:":"")),acciones:acts});
  }catch(e){
    if(e&&e.code==="cancelled"){chat.busy=false;return}
    if(e&&e.code==="invalid_json"&&e.text){chat.msgs.push({role:"assistant",text:e.text,acciones:[]})}
    else{chat.err=clErrText(e);chat.msgs.pop()}
  }
  chat.busy=false;chat.ctl=null;clRender();if(NATIVE)clRefreshUsage();
}

/* ================= INFORME SEMANAL ================= */
async function clWeekReport(btn){
  const out=document.getElementById("clReport");if(!out)return;
  if(NATIVE&&!clHasKey()){toast("Primero añade tu clave de API");return}
  const sample=await clSample();if(!sample){out.innerHTML=`<div class="cl-err">${CL_ERR.not_declared}</div>`;return}
  btn&&(btn.disabled=true);out.innerHTML=`<div class="cl-dots"><i></i><i></i><i></i></div>`;
  const t=todayStr(),from=addD(t,-6),pfrom=addD(t,-13),pto=addD(t,-7);
  const inR=(a,b)=>(S.expenses||[]).filter(e=>e.date>=a&&e.date<=b);
  const data={semana:`${from} a ${t}`,tareas_completadas:collectCompleted(7).map(x=>x.text).slice(0,40),
    gastos_semana:sumAmt(inR(from,t)),gastos_semana_anterior:sumAmt(inR(pfrom,pto)),
    detalle_gastos:inR(from,t).map(e=>({fecha:e.date,importe:e.amount,cat:catName(e.catId,EXPENSE_CATS),desc:e.desc})).slice(0,40),
    ...clContext()};
  const prompt=`Eres el asistente de la app «Mi Día». Hazle a Alex el informe de su semana (tareas, recordatorios y dinero) con estos datos. Exactamente cuatro líneas con este formato, en español de España, tono cercano y concreto con cifras reales:
**Bien:** …
**A mejorar:** …
**Dinero:** … (compara con la semana anterior)
**Consejo:** … (una acción concreta para la próxima semana)
Sin nada más.
DATOS: ${JSON.stringify(data)}`;
  try{
    const r=await sample(prompt,{modelTier:"default",cache:false});
    S.aiReport={at:Date.now(),text:r.text};save();out.innerHTML=clReportHTML();
  }catch(e){out.innerHTML=`<div class="cl-err">${esc(clErrText(e))}</div>`}
  btn&&(btn.disabled=false);if(NATIVE)clRefreshUsage();
}
function clReportHTML(){
  const r=S.aiReport;if(!r)return `<div class="d">Pulsa «Generar» y Claude repasa tu semana: lo que has hecho, lo pendiente y en qué se ha ido el dinero.</div>`;
  return `<div class="cl-report">${md(r.text)}</div><div class="d" style="margin-top:4px">Generado el ${new Date(r.at).toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>`;
}

/* ================= ESCANEAR TICKET ================= */
let _scanInput=null;
async function clScanTicket(){
  if(NATIVE&&!clHasKey()){toast("Primero añade tu clave de API en Más → Claude (IA)");return}
  const sample=await clSample();if(!sample){toast(CL_ERR.not_declared);return}
  let lim=null;try{lim=await sample.limits()}catch(e){}
  if(!lim||!lim.images){toast(CL_ERR.images_unavailable);return}
  if(!_scanInput){_scanInput=document.createElement("input");_scanInput.type="file";_scanInput.accept="image/*";_scanInput.style.display="none";document.body.appendChild(_scanInput);
    _scanInput.addEventListener("change",()=>{const f=_scanInput.files&&_scanInput.files[0];_scanInput.value="";if(f)clScanFile(f)})}
  _scanInput.click();
}
window.clScanTicket=clScanTicket;
async function clScanFile(f){
  const ov=document.getElementById("clScanOverlay")||(()=>{const o=document.createElement("div");o.className="overlay";o.id="clScanOverlay";o.hidden=true;o.innerHTML='<div class="sheet"></div>';document.body.appendChild(o);return o})();
  const sh=ov.querySelector(".sheet");const url=URL.createObjectURL(f);const ctl=new AbortController();
  sh.innerHTML=`<div class="sheet-title">🧾 Leyendo el ticket…</div><div class="cl-scan"><img src="${url}" alt=""><div class="ln"></div><div class="tag">Claude está leyendo el importe</div></div><button class="sheet-btn secondary" id="clScanCancel">Cancelar</button>`;
  ov.hidden=false;sh.querySelector("#clScanCancel").onclick=()=>{ctl.abort();ov.hidden=true;URL.revokeObjectURL(url)};
  const sample=await clSample();
  const prompt=`La imagen es un ticket, factura o recibo de compra (en España, euros). Extrae el gasto para apuntarlo en la app. Responde SOLO con este JSON:
{"amount":<importe TOTAL pagado, número con punto decimal>,"desc":"<comercio o concepto breve, máx 40 caracteres, p. ej. 'Mercadona' o 'Gasolina Repsol'>","categoryId":"<uno de: ${EXPENSE_CATS.map(c=>c.id).join(", ")}>","date":"<YYYY-MM-DD del ticket, o null si no se ve>","legible":<true|false>}
Categorías: ${EXPENSE_CATS.map(c=>`${c.id}=${c.name}`).join(", ")}. Hoy es ${todayStr()}.`;
  try{
    const r=await sample.json(prompt,{images:f,modelTier:"default",cache:false,signal:ctl.signal});
    ov.hidden=true;URL.revokeObjectURL(url);
    const amt=Number(r&&r.amount);
    if(!r||r.legible===false||!amt||amt<=0){toast("🤔 No he podido leer el importe. Prueba con una foto más nítida.");return}
    openAddGasto();
    const cat=EXPENSE_CATS.find(c=>c.id===r.categoryId);if(cat){gastoCat=cat.id;renderGastoCatPicker()}
    document.getElementById("gastoAmount").value=Math.round(amt*100)/100;
    document.getElementById("gastoDesc").value=String(r.desc||"").slice(0,100);
    if(/^\d{4}-\d\d-\d\d$/.test(r.date||"")&&r.date<=todayStr())document.getElementById("gastoDate").value=r.date;
    document.querySelector("#gastoOverlay .sheet-title").textContent="🧾 Revisa el ticket y guarda";
    if(NATIVE)clRefreshUsage();
  }catch(e){
    if(e&&e.code==="cancelled")return;
    ov.hidden=true;URL.revokeObjectURL(url);toast("⚠️ "+clErrText(e));
  }
}

/* ================= AJUSTES / USO (solo APK) ================= */
function clUsage(){try{return JSON.parse(MiDiaNative.usageJson()||"{}")}catch(e){return {}}}
function clUsageLine(){const u=clUsage();return u.calls?` · ${u.calls} consulta${u.calls===1?"":"s"} este mes`:""}
function clRefreshUsage(){if(S.activeTab==="mas"&&_masPage==="claude")renderMas()}
function fmtEur(v){return (Math.abs(v)<0.1?v.toFixed(3):v.toFixed(2)).replace(".",",")+" €"}
function clKeyCard(){
  if(!NATIVE)return `<div class="cl-card"><div style="display:flex;align-items:center;gap:10px"><h4 style="flex:1;margin:0">Cuenta de Claude</h4><span class="cl-pill">Activo</span></div>
    <div class="d" style="margin-top:6px">Aquí Claude usa tu cuenta de claude.ai: la primera vez te pedirá permiso. En la app de Android usa tu clave de API.</div></div>`;
  const has=clHasKey();let hint="";try{hint=MiDiaNative.apiKeyHint()}catch(e){}
  const u=clUsage(),bud=+(u.budget||5),spent=(+u.costUsd||0)*0.86,pct=bud?Math.min(100,spent/bud*100):0,col=pct>=90?"#E53E3E":pct>=70?"#D97706":"#16A34A";
  return `<div class="cl-card"><div style="display:flex;align-items:center;gap:10px"><h4 style="flex:1;margin:0">Clave de API</h4><span class="cl-pill ${has?"":"off"}">${has?"Activa":"Sin clave"}</span></div>
    ${has?`<div class="d" style="margin-top:4px">Guardada solo en este móvil · <span style="font-variant-numeric:tabular-nums">${esc(hint)}</span></div>
      <div class="cl-bar2"><i style="width:${Math.max(pct,spent>0?1.5:0)}%;background:${col}"></i></div>
      <div class="cl-u3"><div><b>${fmtEur(spent)}</b><span>gastado este mes</span></div><div><b>${u.calls||0}</b><span>consultas</span></div><div><b>${fmtEur(bud)}</b><span>presupuesto</span></div></div>
      <div class="cl-row"><button class="cl-btn" data-clk="test">Probar</button><button class="cl-btn" data-clk="budget">Presupuesto</button><button class="cl-btn dan" data-clk="del">Borrar clave</button></div>
      <div id="clKeyMsg" class="d" style="margin-top:6px"></div>`
    :`<div class="d" style="margin:6px 0 10px">Crea una clave en <b>platform.claude.com → API keys</b>, cópiala y pégala aquí. Las consultas se cobran de tu saldo de API (unos céntimos al mes con un uso normal).</div>
      <input class="field-input" id="clKeyInput" type="password" autocomplete="off" placeholder="sk-ant-…" style="margin-bottom:8px">
      <div class="cl-row" style="margin-top:0"><button class="cl-btn pri" data-clk="save">Guardar clave</button><button class="cl-btn" data-clk="console">Abrir platform.claude.com</button></div>
      <div id="clKeyMsg" class="d" style="margin-top:6px"></div>`}
    <div class="d" style="margin-top:8px;font-size:11px">El coste es aproximado (tokens × precio oficial, 1 $ ≈ 0,86 €). Anthropic no deja consultar el saldo real desde una app.</div></div>`;
}
function masClaudeHTML(){
  return `${masSubHdr("Claude (IA)","Tu asistente inteligente dentro de Mi Día")}
  <div class="cl-grid">
    <button class="cl-tile" data-clo="chat"><span class="e">💬</span><b>Chatear con Claude</b><span>Pregúntale, pídele que organice o apunte cosas</span></button>
    <button class="cl-tile" data-clo="scan"><span class="e">🧾</span><b>Escanear ticket</b><span>Foto del ticket → gasto apuntado</span></button>
    <button class="cl-tile" data-clo="plan"><span class="e">🗓️</span><b>Organízame la semana</b><span>Reparte tus pendientes por días</span></button>
    <button class="cl-tile" data-clo="money"><span class="e">📊</span><b>Analiza mis gastos</b><span>Comparativa y dónde ahorrar</span></button>
  </div>
  <div class="cl-card"><div style="display:flex;align-items:center;gap:10px"><h4 style="flex:1;margin:0">📋 Informe de tu semana</h4><button class="cl-btn pri" data-clo="report">${S.aiReport?"Actualizar":"Generar"}</button></div><div id="clReport">${clReportHTML()}</div></div>
  <div class="cl-card"><h4>🎙️ Voz</h4><div class="d">Arrastra hacia abajo el logo de arriba a la izquierda (o el botón central) y habla: «apunta 12 € de gasolina», «recuérdame el cumpleaños de Belén el 3 de marzo cada año», «tacha comprar leche». También puedes dictar en el chat con el 🎤.</div></div>
  ${clKeyCard()}`;
}
function bindMasClaude(el){
  el.querySelectorAll("[data-clo]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.clo;
    if(k==="chat")clOpenChat();else if(k==="scan")clScanTicket();else if(k==="plan")clOpenChat("Organízame la semana: reparte mis tareas pendientes por días y propónmelo.");
    else if(k==="money")clOpenChat("Analiza mis gastos de este mes comparados con el anterior y dime en qué puedo ahorrar.");else if(k==="report")clWeekReport(b)}));
  el.querySelectorAll("[data-clk]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.clk,msg=el.querySelector("#clKeyMsg");
    if(k==="save"){const v=(el.querySelector("#clKeyInput").value||"").trim();if(!/^sk-ant-/.test(v)){msg.textContent="Esa clave no parece válida (empieza por sk-ant-).";return}
      MiDiaNative.setApiKey(v);msg.textContent="Comprobando…";renderMas();clTestKey()}
    else if(k==="del"){showConfirm("¿Borrar la clave de API de este móvil?",()=>{MiDiaNative.clearApiKey();renderMas()})}
    else if(k==="test"){msg.textContent="Comprobando…";clTestKey()}
    else if(k==="console"){try{MiDiaNative.openUrl("https://platform.claude.com/settings/keys")}catch(e){}}
    else if(k==="budget"){const u=clUsage();msg.innerHTML=`<div class="cl-row" style="margin-top:4px"><input class="field-input" id="clBudIn" type="number" inputmode="decimal" min="1" step="1" value="${+(u.budget||5)}" style="margin:0;width:110px"><span>€ al mes</span><button class="cl-btn pri" id="clBudOk">Guardar</button></div>`;
      msg.querySelector("#clBudOk").onclick=()=>{const n=parseFloat(String(msg.querySelector("#clBudIn").value).replace(",","."));if(n>0){MiDiaNative.setBudget(n);renderMas()}}}
  }));
}
async function clTestKey(){
  const sample=await clSample();const set=t=>{const m=document.getElementById("clKeyMsg");if(m)m.innerHTML=t};
  try{await sample("Responde solo: OK",{modelTier:"quick",cache:false});set('<span style="color:#16A34A;font-weight:700">✓ La clave funciona.</span>');}
  catch(e){set(`<span style="color:#E53E3E;font-weight:700">✗ ${esc(clErrText(e))}</span>`)}
}

/* ---------- enganchar en «Más» ---------- */
MAS_ITEMS.unshift({id:"claude",ico:"✦",fg:"#D97757",title:"Claude (IA)",sub:"Chat, escanear tickets, informe semanal"});
const _renderMas=renderMas;
renderMas=function(){
  if(_masPage!=="claude")return _renderMas();
  const el=document.getElementById("masBody");el.innerHTML=masClaudeHTML();
  el.querySelectorAll("[data-masback]").forEach(e=>e.addEventListener("click",()=>{_masPage=null;renderMas()}));
  bindMasClaude(el);
};

/* ---------- DOM: botón de chat en la cabecera y ticket en «Añadir» ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  const acts=document.querySelector(".hdr-actions"),ai=document.getElementById("aiCmdBtn");
  if(acts&&ai){const b=document.createElement("button");b.className="hdr-btn cl-hdr";b.id="clChatBtn";b.title="Chatear con Claude";b.setAttribute("aria-label","Chatear con Claude");b.textContent="✦";b.addEventListener("click",()=>clOpenChat());acts.insertBefore(b,ai)}
  const ing=document.getElementById("movTypeIngresoBtn");
  if(ing){const b=document.createElement("button");b.className="mv-scan";b.innerHTML='<span style="font-size:24px">🧾</span><span><b>Escanear ticket con Claude</b><span>Haz una foto y se apunta solo</span></span>';
    b.addEventListener("click",()=>{document.getElementById("movTypeOverlay").setAttribute("hidden","");clScanTicket()});ing.insertAdjacentElement("afterend",b)}
});
})();

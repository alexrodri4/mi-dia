/* ===== Mi Día · puente Android (va ANTES del script principal) ===== */
(function(){
const N=window.MiDiaNative;if(!N)return;
document.documentElement.classList.add("apk");
/* ---------- llamadas a Claude con la clave del usuario ---------- */
const cbs={};let seq=0;
window.__mdAi=function(id,body,status){const c=cbs[id];delete cbs[id];if(c)c(body,status)};
const MODELS={quick:"claude-haiku-4-5",default:"claude-sonnet-5",complex:"claude-sonnet-5"};
function E(code,message,text){const e={code,message:message||code};if(text)e.text=text;return e}
function blobToJpegB64(blob){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight;const M=1568;if(w>M||h>M){const k=M/Math.max(w,h);w=Math.round(w*k);h=Math.round(h*k)}
      const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
      try{res(c.toDataURL("image/jpeg",.85).split(",")[1])}catch(e){rej(e)}};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(E("image_rejected","No se pudo leer la imagen"))};img.src=url});
}
function post(payload,signal){
  return new Promise((res,rej)=>{
    if(signal&&signal.aborted)return rej(E("cancelled"));
    const id=++seq;let done=false;
    const onAbort=()=>{if(done)return;done=true;delete cbs[id];rej(E("cancelled"))};
    signal&&signal.addEventListener("abort",onAbort,{once:true});
    cbs[id]=(b,s)=>{if(done)return;done=true;signal&&signal.removeEventListener("abort",onAbort);res({body:b,status:s})};
    try{N.ask(id,JSON.stringify(payload))}catch(e){done=true;delete cbs[id];rej(E("upstream_error","Puente no disponible"))}
  });
}
async function sample(input,opts){
  opts=opts||{};
  if(!N.hasApiKey())throw E("not_granted","Sin clave de API");
  let msgs=typeof input==="string"?[{role:"user",content:input}]:(Array.isArray(input)?input:[]).map(m=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content||"")}));
  const merged=[];msgs.forEach(m=>{if(!m.content)return;const l=merged[merged.length-1];if(l&&l.role===m.role)l.content+="\n\n"+m.content;else merged.push({role:m.role,content:m.content})});
  if(!merged.length||merged[merged.length-1].role!=="user")throw E("invalid_request","La conversación debe terminar en un turno del usuario");
  if(merged[0].role!=="user")merged.unshift({role:"user",content:"(inicio)"});
  if(opts.images){
    const list=opts.images instanceof Blob?[opts.images]:Array.from(opts.images);
    const blocks=[];for(const b of list.slice(0,5)){blocks.push({type:"image",source:{type:"base64",media_type:"image/jpeg",data:await blobToJpegB64(b)}})}
    const last=merged[merged.length-1];last.content=[...blocks,{type:"text",text:last.content}];
  }
  const payload={model:MODELS[opts.modelTier||"default"]||MODELS.default,max_tokens:opts.modelTier==="quick"?2048:4096,messages:merged};
  if(opts._system)payload.system=opts._system;
  const {body,status}=await post(payload,opts.signal);
  let j=null;try{j=JSON.parse(body)}catch(e){}
  if(status!==200){
    const m=(j&&j.error&&j.error.message)||"";
    if(status===0)throw E("upstream_error","Sin conexión");
    if(status===401||status===403)throw E("not_granted","La clave no es válida");
    if(/credit balance|billing/i.test(m))throw E("sampling_disabled",m);
    if(status===429)throw E("rate_limited",m);
    if(status===400&&/too long|too many tokens|prompt is too long/i.test(m))throw E("prompt_too_large",m);
    if(status===400)throw E("invalid_request",m);
    throw E("upstream_error","Error "+status+(m?": "+m:""));
  }
  const text=((j&&j.content)||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
  if(!text)throw E("empty_completion");
  if(typeof opts.onText==="function")try{opts.onText({text,delta:text})}catch(e){}
  return {text,truncated:j.stop_reason==="max_tokens",modelTierApplied:opts.modelTier||"default"};
}
function parseJsonLoose(t){
  try{return JSON.parse(t)}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)try{return JSON.parse(f[1])}catch(e){}
  const a=t.search(/[\[{]/),b=Math.max(t.lastIndexOf("}"),t.lastIndexOf("]"));
  if(a>=0&&b>a)try{return JSON.parse(t.slice(a,b+1))}catch(e){}
  throw E("invalid_json","No hay JSON",t);
}
sample.json=async function(input,opts){
  const suffix="\n\nIMPORTANTE: tu respuesta se procesará automáticamente. Responde únicamente con el JSON pedido, sin texto antes ni después y sin bloque de código.";
  let inp=input;
  if(typeof input==="string")inp=input+suffix;
  else if(Array.isArray(input)&&input.length){inp=input.slice();const l=inp[inp.length-1];inp[inp.length-1]={role:l.role,content:String(l.content)+suffix}}
  const r=await sample(inp,opts);
  if(r.truncated)throw E("invalid_json","Respuesta cortada",r.text);
  return parseJsonLoose(r.text);
};
sample.limits=async function(){return {maxPromptBytes:200000,images:{maxCount:5,maxInputBytes:20e6,mediaTypes:["image/jpeg","image/png","image/webp","image/gif"]}}};
/* ---------- descargas (exportar copia) ---------- */
const downloads={save:async function(o){
  const data=typeof o.data==="string"?o.data:(o.data instanceof Blob?await o.data.text():JSON.stringify(o.data));
  const r=N.saveFile(String(o.filename||"mi-dia.json"),data,o.mimeType||"application/json");
  if(r!=="ok")throw {code:"failed",message:r};
  try{N.toast("Guardado en Descargas: "+o.filename)}catch(e){}
  return {ok:true};
}};
window.claude={use:async function(name){return name==="sample"?sample:name==="downloads"?downloads:null}};

/* ---------- reconocimiento de voz nativo (imita webkitSpeechRecognition) ---------- */
let cur=null;
class NativeSR{
  constructor(){this.lang="es-ES";this.interimResults=false;this.continuous=false;this.maxAlternatives=1;this.onresult=null;this.onend=null;this.onerror=null;this.onstart=null;
    this._finals=[];this._partial="";this._stopping=false;this._ended=false;this._active=false}
  _emit(){const list=this._finals.map(t=>{const r=[{transcript:t,confidence:.9}];r.isFinal=true;return r});
    if(this._partial){const r=[{transcript:this._partial,confidence:.5}];r.isFinal=false;list.push(r)}
    const ev={results:list,resultIndex:0};list.item=i=>list[i];try{this.onresult&&this.onresult(ev)}catch(e){console.error(e)}}
  _end(){if(this._ended)return;this._ended=true;if(cur===this)cur=null;try{N.cancelListening()}catch(e){}setTimeout(()=>{try{this.onend&&this.onend({})}catch(e){console.error(e)}},0)}
  start(){if(cur&&cur!==this)cur.abort();cur=this;this._active=true;try{N.startListening(this.lang||"es-ES")}catch(e){this._err("audio-capture")}}
  stop(){this._stopping=true;if(this._active){try{N.stopListening()}catch(e){this._end()}}else this._end()}
  abort(){this._stopping=true;this._partial="";try{N.cancelListening()}catch(e){}this._end()}
  _err(code){try{this.onerror&&this.onerror({error:code})}catch(e){}this._end()}
  _event(ev,t){
    if(ev==="start"){try{this.onstart&&this.onstart({})}catch(e){}return}
    if(ev==="partial"){if(this.interimResults){this._partial=t;this._emit()}return}
    if(ev==="final"){this._active=false;this._partial="";if(t&&t.trim()){this._finals.push(t.trim());this._emit()}
      if(this.continuous&&!this._stopping){this._active=true;try{N.startListening(this.lang||"es-ES")}catch(e){this._end()}}else this._end();return}
    if(ev==="error"){this._active=false;
      if(t==="perm")return this._err("not-allowed");
      if(this.continuous&&!this._stopping&&(t==="nomatch"||t==="timeout")){this._active=true;try{N.startListening(this.lang||"es-ES")}catch(e){this._end()}return}
      if(t==="nomatch"||t==="timeout"){if(!this._finals.length)try{this.onerror&&this.onerror({error:"no-speech"})}catch(e){}return this._end()}
      return this._err(t==="network"?"network":"audio-capture")}
  }
}
window.__mdVoice=function(ev,t){if(cur)cur._event(ev,t)};
window.SpeechRecognition=window.webkitSpeechRecognition=NativeSR;
})();

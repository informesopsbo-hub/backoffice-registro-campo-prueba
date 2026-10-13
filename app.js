const DB_NAME="backoffice_registro_campo", STORE="evidencias";
let db,stream,sequence=0;
const video=document.getElementById("video"),canvas=document.getElementById("canvas"),
startCameraBtn=document.getElementById("startCamera"),captureBtn=document.getElementById("capture"),
galleryBtn=document.getElementById("showGallery"),gallery=document.getElementById("gallery"),
countPending=document.getElementById("countPending"),statusBadge=document.getElementById("statusBadge"),
projectInput=document.getElementById("project"),contextInput=document.getElementById("context");

function setStatus(text,mode=""){statusBadge.textContent=text;statusBadge.className="status"+(mode?" "+mode:"")}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:"id"});s.createIndex("fecha","fecha")}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function store(mode="readonly"){return db.transaction(STORE,mode).objectStore(STORE)}
function saveEvidence(record){return new Promise((resolve,reject)=>{const req=store("readwrite").put(record);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
function getAllEvidence(){return new Promise((resolve,reject)=>{const req=store().getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}
async function updateCount(){const items=await getAllEvidence();sequence=items.length;countPending.textContent=items.length}

async function startCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia no disponible");
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
    video.srcObject=stream;await video.play();captureBtn.disabled=false;startCameraBtn.textContent="Cámara activa";
    setStatus(navigator.onLine?"En línea":"Sin conexión",navigator.onLine?"ok":"warn");
  }catch(err){console.error(err);alert("No fue posible activar la cámara. Revise permisos y abra la página por HTTPS.");setStatus("Error de cámara","warn")}
}
function blobFromCanvas(){return new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.9))}
async function capturePhoto(){
  if(!stream)return;
  const w=video.videoWidth||1280,h=video.videoHeight||720;canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(video,0,0,w,h);
  const blob=await blobFromCanvas(),now=new Date();sequence+=1;
  const record={id:`EV-${String(sequence).padStart(5,"0")}-${now.getTime()}`,proyecto:(projectInput.value||"SIN_PROYECTO").trim(),contexto:(contextInput.value||"").trim(),fecha:now.toISOString(),secuencia:sequence,syncStatus:"LOCAL",blob};
  try{await saveEvidence(record);await updateCount();setStatus("Guardada en dispositivo","ok");setTimeout(()=>setStatus(navigator.onLine?"En línea":"Sin conexión",navigator.onLine?"ok":"warn"),1400)}
  catch(err){console.error(err);alert("No fue posible guardar la foto localmente.");setStatus("Error al guardar","warn")}
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function renderGallery(){
  const items=await getAllEvidence();gallery.innerHTML="";
  [...items].reverse().forEach(item=>{const url=URL.createObjectURL(item.blob),card=document.createElement("article"),when=new Date(item.fecha);card.className="card";
    card.innerHTML=`<img src="${url}" alt="Evidencia ${item.secuencia}"><div class="meta"><strong>Foto ${String(item.secuencia).padStart(3,"0")}</strong><div>${esc(item.proyecto)}</div><div class="tag">${esc(item.contexto||"Sin contexto")}</div><div class="tag">${when.toLocaleString("es-CO")}</div><div class="tag">Estado: ${item.syncStatus}</div></div>`;
    gallery.appendChild(card)})
}
startCameraBtn.addEventListener("click",startCamera);captureBtn.addEventListener("click",capturePhoto);
galleryBtn.addEventListener("click",async()=>{await renderGallery();gallery.classList.toggle("hidden");galleryBtn.textContent=gallery.classList.contains("hidden")?"Ver galería":"Ocultar galería"});
window.addEventListener("online",()=>setStatus("En línea","ok"));window.addEventListener("offline",()=>setStatus("Sin conexión","warn"));
(async()=>{try{db=await openDB();await updateCount();if("serviceWorker"in navigator){try{await navigator.serviceWorker.register("sw.js")}catch(e){console.warn(e)}}setStatus(navigator.onLine?"En línea":"Sin conexión",navigator.onLine?"ok":"warn")}catch(err){console.error(err);setStatus("Error local","warn")}})();

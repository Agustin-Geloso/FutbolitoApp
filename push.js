import { VAPID_PUBLIC_KEY } from './config.js';

export function mountReminders({request, getSession, notify}) {
 const card=document.createElement('article');card.className='card narrow reminders-card';
 card.innerHTML='<span class="eyebrow">EL PARTIDO SE ACERCA</span><h2>Recordatorios</h2><p>Recibí un aviso una hora y 30 minutos antes de los partidos en los que estés inscripto.</p><label class="check"><input id="remind-60" type="checkbox" checked> Una hora antes</label><label class="check"><input id="remind-30" type="checkbox" checked> 30 minutos antes</label><div class="actions"><button id="enable-reminders" class="primary">Activar en este dispositivo</button><button id="disable-reminders" class="outline" hidden>Desactivar</button></div><p id="reminder-status" class="muted" role="status"></p><p class="muted">En iPhone, agregá primero la app a la pantalla de inicio y abrila desde ahí. Los avisos requieren conexión y permisos del dispositivo.</p>';
 document.querySelector('#account').append(card);
 const status=card.querySelector('#reminder-status'),enable=card.querySelector('#enable-reminders'),disable=card.querySelector('#disable-reminders');
 const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const selection=()=>[60,30].filter(n=>card.querySelector(`#remind-${n}`).checked);
 const keyBytes=key=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));
 async function subscription(){return (await navigator.serviceWorker.ready).pushManager.getSubscription()}
 async function refresh(){
  if(!supported()){status.textContent='Este navegador no admite avisos push. Probá Chrome, Edge o la app agregada a inicio en iPhone.';enable.disabled=true;return}
  if(!VAPID_PUBLIC_KEY){status.textContent='En preparación: falta configurar el servicio de envío de recordatorios en Supabase.';enable.disabled=true;return}
  const sub=await subscription();
  if(!getSession()){status.textContent='Iniciá sesión para activar los recordatorios de tus partidos.';enable.disabled=true;disable.hidden=true;return}
  enable.disabled=false;
  if(Notification.permission==='denied'){status.textContent='Las notificaciones están bloqueadas. Podés habilitarlas desde los permisos del navegador.';enable.disabled=true;return}
  const rows=await request('/rest/v1/push_subscriptions?select=endpoint,minutes');
  const saved=rows.find(row=>row.endpoint===sub?.endpoint);
  disable.hidden=!saved;enable.textContent=saved?'Guardar preferencias':'Activar en este dispositivo';
  status.textContent=saved?'Recordatorios activados en este dispositivo.':'Activá los avisos para recibirlos aunque no tengas la página abierta.';
  if(saved)for(const n of [60,30])card.querySelector(`#remind-${n}`).checked=saved.minutes.includes(n);
 }
 enable.onclick=async()=>{try{
  if(!getSession())throw new Error('Primero ingresá a tu cuenta.');
  if(!VAPID_PUBLIC_KEY)throw new Error('Todavía falta configurar el servicio de envío.');
  if(!selection().length)throw new Error('Elegí al menos un recordatorio.');
  // Pedir permiso directamente desde el clic; algunos navegadores lo exigen.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('No se habilitaron las notificaciones.');
  enable.disabled=true;const registration=await navigator.serviceWorker.ready;
  const sub=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(VAPID_PUBLIC_KEY)});
  await request('/rest/v1/rpc/save_push_subscription',{method:'POST',body:{subscription:sub.toJSON(),reminders:selection()}});
  await refresh();notify('Recordatorios activados.');
 }catch(error){status.textContent=error.message}finally{enable.disabled=!getSession()||!VAPID_PUBLIC_KEY}};
 disable.onclick=async()=>{try{disable.disabled=true;const sub=await subscription();if(sub){await request('/rest/v1/rpc/remove_push_subscription',{method:'POST',body:{target:sub.endpoint}});await sub.unsubscribe()}await refresh();notify('Recordatorios desactivados en este dispositivo.')}catch(error){status.textContent=error.message}finally{disable.disabled=false}};
 // Cerrar la sesión en un equipo compartido deja de enviar avisos a ese equipo.
 async function detach(){if(!VAPID_PUBLIC_KEY||!supported()||!getSession())return;const sub=await subscription();if(sub)await request('/rest/v1/rpc/remove_push_subscription',{method:'POST',body:{target:sub.endpoint}})}
 return {refresh:()=>refresh().catch(error=>{status.textContent=error.message}),detach};
}

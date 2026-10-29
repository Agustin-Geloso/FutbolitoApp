import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from './config.js';
import { skills, labels, rating, balance } from './balance.js';
import { mountReminders } from './push.js';
import { mountAdmin } from './admin.js';
import { mountProfileChart } from './profile-chart.js';
import { mountAvatar } from './avatar.js';
const $=s=>document.querySelector(s), read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const config={url:SUPABASE_URL,key:SUPABASE_PUBLIC_KEY};
let session=read('fb-session',null), state=read('fb-demo',{profile:null,match:null,players:[],teams:null});
let current=null, players=[], teams=null, profile=null, busy=false, authMode='login', refreshPromise=null;
let reminders,admin,avatar;
const online=()=>Boolean(config.url&&config.key);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6500)}
function save(){localStorage.setItem('fb-demo',JSON.stringify(state))}
function storeSession(data){session={...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};localStorage.setItem('fb-session',JSON.stringify(session))}
async function request(path,{method='GET',body,auth=true}={}){
 if(auth&&session&&session.expires_at*1000<Date.now()+60000){
  if(!refreshPromise)refreshPromise=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token},auth:false}).then(storeSession).catch(e=>{session=null;localStorage.removeItem('fb-session');throw e}).finally(()=>refreshPromise=null);
  await refreshPromise;
 }
 let res;try{res=await fetch(config.url+path,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(auth&&session?{Authorization:`Bearer ${session.access_token}`}:{})},...(body?{body:JSON.stringify(body)}:{})})}catch{throw new Error('No pudimos conectar. Revisá tu conexión e intentá otra vez.')}
 const data=await res.json().catch(()=>null);
 if(!res.ok){const messages={invalid_credentials:'Email o contraseña incorrectos.',email_not_confirmed:'Confirmá tu correo antes de ingresar. Revisá también la carpeta de spam.',over_email_send_rate_limit:'Se alcanzó el límite de correos. Esperá unos minutos antes de volver a intentar.',over_request_rate_limit:'Demasiados intentos. Esperá unos minutos.',email_address_not_authorized:'El envío de correos de Supabase todavía necesita configuración para esta dirección.',weak_password:'Elegí una contraseña más segura.'};throw new Error(messages[data?.error_code||data?.code]||data?.msg||data?.message||data?.error_description||'No se pudo completar la operación.');}return data;
}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){toast(e.message)}finally{busy=false;render()}}
function tab(id){document.querySelectorAll('main>section').forEach(el=>el.hidden=el.id!==id);document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===id));if(id==='account')reminders?.refresh()}
document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>tab(el.dataset.tab));
$('#skill-inputs').innerHTML=skills.map((k,i)=>`<label>${labels[i]} · 1 a 10<input name="${k}" type="number" min="1" max="10" value="5" required></label>`).join('');
const profileChart=mountProfileChart($('#profile-form'));
avatar=mountAvatar({form:$('#profile-form'),request,getSession:()=>session,notify:toast});
function fillProfile(){if(!profile)return;const f=$('#profile-form');for(const k of ['name','age','position',...skills])f.elements[k].value=profile[k];f.elements.volunteer.checked=profile.volunteer;profileChart.update()}
function playerHTML(p,keeper,organizer=false){return `<div class="player"><span class="avatar">${esc(p.name.slice(0,2).toUpperCase())}</span><div class="details"><div class="player-name"><strong>${esc(p.name)}</strong>${organizer?'<span class="organizer-tag">Organizador</span>':''}</div><small>${esc(keeper?'Arquero asignado':p.position)} · ${esc(p.age)} años</small></div><span class="rating" title="Promedio de habilidades de campo">${rating(p).toFixed(1)}</span></div>`}
function render(){
 document.querySelectorAll('button').forEach(b=>b.disabled=false);
 reminders?.refresh();
 admin?.sync();
 $('#auth-form').hidden=!online()||!!session;$('#logout').hidden=!session;
 $('#avatar-menu-wrapper').hidden=!session;if(!session)closePersonMenu();
 $('#auth-tabs').hidden=!online()||!!session;$('#signed-in').hidden=!session;$('#account-button-label').textContent=session?'Mi cuenta':'Ingresar / Registrarme';
 $('#account-state').textContent=session?`Sesión: ${session.user.email}`:online()?'Ingresá o creá tu cuenta. Si está activada la confirmación de email, confirmalo antes de ingresar.':'Conectá Supabase para habilitar cuentas y partidos compartidos.';
 $('#match-form').hidden=!!current;$('#match-info').innerHTML=current?`<h3>${esc(current.venue)}</h3><p>${esc(new Date(current.starts_at).toLocaleString('es-AR',{dateStyle:'full',timeStyle:'short'}))}</p><p>📍 ${esc(current.address)}</p>${mapHTML(current.address)}<button id="new-match" class="outline">Crear otro partido</button>`:'';
 if($('#new-match'))$('#new-match').onclick=()=>{current=null;players=[];teams=null;history.replaceState(null,'',location.pathname);if(!online()){state.match=null;state.players=[];state.teams=null;save()}render()};
 $('#count').textContent=`${players.length} / 10`;
 $('#roster').innerHTML=players.length?players.map(p=>playerHTML(p,false,p.id===current?.owner)).join(''):'<p class="empty">La lista está abierta. Creá un partido y sumá a tus amigos.</p>';
 const me=online()?session?.user.id:profile?.id, joined=players.some(p=>p.id===me);
 $('#join').disabled=!current||joined||players.length>=10;$('#leave').disabled=!joined;$('#invite').disabled=!current;
 $('#balance').disabled=players.length!==10;$('#balance-note').textContent=players.length===10?'Lista completa. Ya podemos repartir.':`Faltan ${10-players.length} jugadores para armar los equipos.`;
 $('#invite-note').textContent=online()?'Compartí el enlace para que cada jugador se inscriba con su cuenta.':'En la demo las invitaciones no sincronizan dispositivos. Conectá Supabase para compartir partidos reales.';
 $('#demo').hidden=online();$('#teams').innerHTML=teams?`<div class="card-title"><h2>Dos equipos. Un buen partido.</h2><span class="tag">REPARTO PROPUESTO</span></div><p class="muted">Se compararon las 126 divisiones posibles. Promedios de campo, posiciones, arqueros y condición física; la edad tiene un peso bajo. Es una estimación, no una garantía de resultado.</p><div class="teams-grid">${['a','b'].map((key,i)=>`<article class="card team-${key}"><div class="card-title"><h2>Equipo ${i?'Tierra':'Verde'}</h2><span class="tag">PROMEDIO ${(teams[key].reduce((s,p)=>s+rating(p),0)/5).toFixed(1)}</span></div>${teams[key].map(p=>playerHTML(p,p.id===teams[i?'keeperB':'keeperA'])).join('')}</article>`).join('')}</div>`:'';
}
async function loadMatch(id){
 const matches=await request(`/rest/v1/matches?id=eq.${encodeURIComponent(id)}&select=*`);
 if(!matches.length)throw new Error('Partido no encontrado. Ingresá con tu cuenta y revisá la invitación.');
 const rows=await request(`/rest/v1/participants?match_id=eq.${encodeURIComponent(id)}&select=profile:profiles(*)`);
 current=matches[0];players=rows.map(r=>r.profile).filter(Boolean);teams=current.teams;
}
async function init(){if(!online()){profile=state.profile;current=state.match;players=state.players;teams=state.teams;fillProfile();render();return}
 if(session){try{const rows=await request(`/rest/v1/profiles?id=eq.${session.user.id}&select=*`);profile=rows[0]??null;fillProfile();const id=new URLSearchParams(location.search).get('partido')||read('fb-last-match',null);if(id)await loadMatch(id)}catch(e){toast(e.message)}}await avatar?.load().catch(()=>toast('No pudimos cargar tu foto.'));render();}
$('#profile-form').onsubmit=e=>{e.preventDefault();action(async()=>{const f=e.target;avatar.assertReady();const data={name:f.elements.name.value.trim(),age:Number(f.elements.age.value),position:f.elements.position.value,volunteer:f.elements.volunteer.checked,...Object.fromEntries(skills.map(k=>[k,Number(f.elements[k].value)]))};if(!data.name)throw new Error('Ingresá un nombre.');if(online()){if(!session)throw new Error('Primero ingresá a tu cuenta.');await request('/rest/v1/rpc/save_profile',{method:'POST',body:{data}});profile={...data,id:session.user.id};try{await avatar.save()}catch(error){throw new Error('Tu ficha se guardó, pero no la foto: '+error.message)}}else{profile={...data,id:state.profile?.id||crypto.randomUUID()};state.profile=profile;state.players=state.players.map(p=>p.id===profile.id?profile:p);players=state.players;teams=null;state.teams=null;save()}toast('Tu jugador ya está guardado.');tab('match')})};
$('#match-form').onsubmit=e=>{e.preventDefault();action(async()=>{const f=e.target,data={venue:f.venue.value.trim(),address:f.address.value.trim(),starts_at:new Date(f.starts.value).toISOString()};if(new Date(data.starts_at)<=new Date())throw new Error('Elegí una fecha y hora futura.');if(online()){if(!session)throw new Error('Ingresá a tu cuenta para crear un partido.');const id=await request('/rest/v1/rpc/create_match',{method:'POST',body:{data}});await loadMatch(id);localStorage.setItem('fb-last-match',JSON.stringify(id));history.replaceState(null,'',`?partido=${id}`)}else{current={...data,id:crypto.randomUUID()};players=[];teams=null;Object.assign(state,{match:current,players,teams});save()}toast('Partido creado. ¡A convocar!')})};
$('#join').onclick=()=>action(async()=>{if(!profile) {tab('profile');throw new Error('Primero completá tu perfil de jugador.')}if(online()){await request('/rest/v1/rpc/join_match',{method:'POST',body:{target:current.id}});await loadMatch(current.id)}else{players.push({...profile});state.players=players;state.teams=null;teams=null;save()}toast('Ya estás en la lista.')});
$('#leave').onclick=()=>action(async()=>{if(online()){await request('/rest/v1/rpc/leave_match',{method:'POST',body:{target:current.id}});await loadMatch(current.id)}else{players=players.filter(p=>p.id!==profile.id);Object.assign(state,{players,teams:null});teams=null;save()}toast('Liberaste tu lugar.')});
$('#balance').onclick=()=>action(async()=>{if(online()&&current.owner!==session?.user.id)throw new Error('Solo el organizador puede guardar el reparto.');teams=balance(players);if(online())await request('/rest/v1/rpc/save_teams',{method:'POST',body:{target:current.id,result:teams}});else{state.teams=teams;save()}$('#teams').scrollIntoView({behavior:'smooth'});toast('Equipos armados. Revisá el reparto debajo.');});
$('#invite').onclick=()=>action(async()=>{if(!online())throw new Error('Esta es una demo local. Conectá Supabase para generar una invitación compartida.');await navigator.clipboard.writeText(`${location.origin}/?partido=${current.id}`);toast('Enlace copiado. Ya lo podés compartir.')});
$('#demo').onclick=()=>{const positions=['Arquero','Defensa','Mediocampista defensivo','Mediocampista ofensivo','Delantero'];players=['Nico','Agus','Fede','Tomi','Lucho','Santi','Mati','Juani','Fran','Lean'].map((name,i)=>({id:`demo-${i}`,name,age:21+i*2,position:positions[i%5],volunteer:i%5===0,...Object.fromEntries(skills.map((k,j)=>[k,4+(i*3+j*2)%6]))}));current={id:'demo',venue:'El Potrero · Cancha 2',address:'Parque Sarmiento, Buenos Aires, Argentina',starts_at:new Date(Date.now()+86400000*2).toISOString()};teams=null;Object.assign(state,{players,match:current,teams});save();render();toast('Diez jugadores listos. Probá “Armar equipos”.')};
function authMessage(message,error=false){const el=$('#auth-message');el.textContent=message;el.hidden=!message;el.classList.toggle('error',error)}
function setAuthMode(mode){authMode=mode;$('#auth-title').textContent=mode==='signup'?'Tu primer paso a la cancha':'Bienvenido a la cancha';$('#confirm-label').hidden=mode!=='signup';const f=$('#auth-form');f.elements.confirm.required=mode==='signup';f.elements.password.minLength=mode==='signup'?8:1;f.elements.password.autocomplete=mode==='signup'?'new-password':'current-password';$('#auth-submit').textContent=mode==='signup'?'Crear mi cuenta →':'Iniciar sesión →';$('#auth-help').textContent=mode==='signup'?'Elegí al menos 8 caracteres. Te enviaremos un correo para confirmar tu cuenta.':'Usá el email y la contraseña con los que te registraste.';document.querySelectorAll('[data-auth]').forEach(b=>{b.classList.toggle('active',b.dataset.auth===mode);b.setAttribute('aria-pressed',String(b.dataset.auth===mode))});authMessage('')}
document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.auth));
$('#account-button').onclick=()=>tab('account');$('#edit-profile').onclick=()=>tab('profile');
function closePersonMenu(restore=false){$('#person-menu').hidden=true;$('#avatar-menu-trigger').setAttribute('aria-expanded','false');if(restore)$('#avatar-menu-trigger').focus()}
function openPersonMenu(last=false){if(!session)return;$('#person-menu').hidden=false;$('#avatar-menu-trigger').setAttribute('aria-expanded','true');$(last?'#menu-logout':'#menu-player').focus()}
$('#avatar-menu-trigger').onclick=()=>$('#person-menu').hidden?openPersonMenu():closePersonMenu(true);
$('#avatar-menu-trigger').onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openPersonMenu(e.key==='ArrowUp')}};
$('#menu-player').onclick=()=>{closePersonMenu();tab('profile');$('#profile-form').elements.name.focus()};
$('#menu-logout').onclick=()=>{closePersonMenu();$('#logout').click()};
$('#person-menu').onkeydown=e=>{const items=[$('#menu-player'),$('#menu-logout')];if(e.key==='Escape'){e.preventDefault();closePersonMenu(true)}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const i=items.indexOf(document.activeElement);items[e.key==='Home'?0:e.key==='End'?1:(i+1)%2].focus()}};
document.addEventListener('pointerdown',e=>{if(!$('#avatar-menu-wrapper').contains(e.target))closePersonMenu()});
$('#avatar-menu-wrapper').addEventListener('focusout',()=>queueMicrotask(()=>{if(!$('#avatar-menu-wrapper').contains(document.activeElement))closePersonMenu()}));
$('#show-password').onchange=e=>{for(const name of ['password','confirm'])$('#auth-form').elements[name].type=e.target.checked?'text':'password'};
$('#auth-form').onsubmit=e=>{e.preventDefault();action(async()=>{const f=e.target;authMessage('');if(authMode==='signup'&&f.password.value!==f.elements.confirm.value){authMessage('Las contraseñas no coinciden.',true);return}try{const redirect=location.origin+location.pathname+location.search;const data=await request(authMode==='signup'?`/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`:'/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email:f.email.value.trim(),password:f.password.value}});if(data.access_token){storeSession(data);await init();authMessage('Ya iniciaste sesión.');toast('¡Ya estás dentro!');tab(profile?'match':'profile')}else{setAuthMode('login');authMessage('Revisá tu correo para confirmar la cuenta. Si ya tenías una cuenta, podés iniciar sesión.')}f.password.value='';f.elements.confirm.value=''}catch(error){authMessage(error.message,true)}})};
$('#logout').onclick=()=>action(async()=>{try{await reminders?.detach();await request('/auth/v1/logout',{method:'POST'})}finally{session=null;profile=null;current=null;players=[];teams=null;localStorage.removeItem('fb-session');$('#profile-form').reset();avatar.reset();setAuthMode('login');tab('account');toast('Sesión cerrada.')}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&online()&&session&&current)action(()=>loadMatch(current.id))});
const next=new Date(Date.now()+86400000);next.setMinutes(next.getMinutes()-next.getTimezoneOffset());$('#match-form').starts.value=next.toISOString().slice(0,16);
function mapHTML(address){const q=encodeURIComponent(address);return `<div class="venue-map"><iframe title="Mapa de la cancha: ${esc(address)}" src="https://maps.google.com/maps?q=${q}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><p class="muted">Ubicación aproximada según la dirección. Comprobá que corresponda a la cancha elegida.</p><div class="actions map-actions"><a class="primary" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${q}">Abrir en Google Maps ↗</a><a class="outline" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${q}">Cómo llegar →</a></div>`}
const addressInput=$('#match-form').elements.address;
addressInput.parentElement.insertAdjacentHTML('afterend','<button type="button" id="preview-map" class="outline">Ver ubicación en el mapa</button>');
$('#match-form').insertAdjacentHTML('beforeend','<div id="map-preview" hidden></div>');
$('#preview-map').onclick=()=>{const address=addressInput.value.trim();if(!address){addressInput.focus();toast('Ingresá calle, número y ciudad para ver la ubicación.');return}$('#map-preview').innerHTML=mapHTML(address);$('#map-preview').hidden=false};
addressInput.oninput=()=>{$('#map-preview').hidden=true;$('#map-preview').innerHTML=''};
async function readAuthCallback(){const params=new URLSearchParams(location.hash.slice(1));if(!params.has('access_token')&&!params.has('error_description'))return false;history.replaceState(null,'',location.pathname+location.search);if(params.has('error_description')){authMessage('El enlace de confirmación venció o no es válido. Intentá ingresar con tu cuenta.',true);return true}try{const token=params.get('access_token');const res=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error('No pudimos validar la sesión del correo. Ingresá con tu email y contraseña.');storeSession({access_token:token,refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in')||3600),user:await res.json()});toast('Correo confirmado. ¡Bienvenido!')}catch(error){authMessage(error.message,true)}return true}
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
setAuthMode('login');
reminders=mountReminders({request,getSession:()=>session,notify:toast});
admin=mountAdmin({request,getSession:()=>session,openTab:tab,notify:toast,onDeleted:(kind,id)=>{if(kind==='match'&&current?.id===id||kind==='user'){current=null;players=[];teams=null;localStorage.removeItem('fb-last-match');history.replaceState(null,'',location.pathname+location.hash);render()}}});
const invitedMatch=new URLSearchParams(location.search).get('partido');
if(invitedMatch&&/^[0-9a-f-]{36}$/i.test(invitedMatch))localStorage.setItem('fb-last-match',JSON.stringify(invitedMatch));
const callback=online()?await readAuthCallback():false;
await init();

await reminders.refresh();
if(online()&&!session)tab('account');else if(callback)tab(profile?'match':'profile');

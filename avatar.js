export const MAX_AVATAR_LENGTH=70000;
export function validAvatar(value){return typeof value==='string'&&value.length<=MAX_AVATAR_LENGTH&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)}

async function preparePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Elegí una imagen JPG, PNG o WebP.');
 if(file.size>8*1024*1024)throw new Error('La imagen debe pesar menos de 8 MB.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;await img.decode();
  const side=Math.min(img.naturalWidth,img.naturalHeight);if(!side)throw new Error('No pudimos leer la imagen.');
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const context=canvas.getContext('2d');context.fillStyle='#f5f4ee';context.fillRect(0,0,256,256);
  context.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,256,256);
  for(const quality of [.82,.65,.45]){const result=canvas.toDataURL('image/jpeg',quality);if(validAvatar(result))return result}
  throw new Error('No pudimos reducir la foto. Probá con otra imagen.');
 }finally{URL.revokeObjectURL(url)}
}

export function mountAvatar({form,request,getSession,notify}){
 let saved=null,pending=null,dirty=false,working=false,viewer=null,serial=0;
 const area=document.createElement('div');area.className='photo-editor';area.innerHTML='<div class="photo-preview"><img alt="Vista previa de tu foto" hidden><span aria-hidden="true">＋</span></div><div><strong>Tu foto de jugador</strong><p class="muted">Elegí una foto. La recortamos en un círculo para tu cuenta.</p><label class="outline photo-select">Elegir imagen<input type="file" accept="image/jpeg,image/png,image/webp" class="photo-file"></label><button type="button" class="outline photo-remove" hidden>Quitar foto</button><p class="muted photo-status" role="status">JPG, PNG o WebP · máximo 8 MB. Se guarda con tu ficha.</p></div>';
 form.prepend(area);
 const input=area.querySelector('input'),preview=area.querySelector('img'),placeholder=area.querySelector('.photo-preview span'),remove=area.querySelector('.photo-remove'),status=area.querySelector('.photo-status');
 const header=document.querySelector('#account-avatar');
 function display(){const photo=dirty?pending:saved;preview.hidden=!photo;placeholder.hidden=!!photo;remove.hidden=!photo;if(photo)preview.src=photo;else preview.removeAttribute('src');const showHeader=!!getSession()&&!!saved;header.hidden=!showHeader;if(showHeader)header.src=saved;else header.removeAttribute('src')}
 input.onchange=async()=>{const file=input.files[0];if(!file)return;const attempt=++serial;working=true;status.textContent='Preparando tu foto…';try{const result=await preparePhoto(file);if(attempt!==serial)return;pending=result;dirty=true;display();status.textContent='Vista previa lista. Tocá “Guardar mi jugador” para guardar la foto.'}catch(e){if(attempt===serial){status.textContent=e.message;notify(e.message)}}finally{if(attempt===serial)working=false;input.value=''}};
 remove.onclick=()=>{serial++;working=false;pending=null;dirty=true;display();status.textContent='La foto se quitará cuando guardes tu ficha.'};
 function reset(){serial++;working=false;saved=null;pending=null;dirty=false;viewer=null;input.value='';status.textContent='JPG, PNG o WebP · máximo 8 MB. Se guarda con tu ficha.';display()}
 return {
  reset,
  async load(){const id=getSession()?.user.id||null;if(id===viewer){display();return}reset();viewer=id;if(!id)return;const rows=await request(`/rest/v1/profile_avatars?user_id=eq.${encodeURIComponent(id)}&select=photo`);if(getSession()?.user.id!==id||viewer!==id)return;saved=validAvatar(rows[0]?.photo)?rows[0].photo:null;display()},
  assertReady(){if(working)throw new Error('Esperá a que terminemos de preparar tu foto.');if(dirty&&!getSession())throw new Error('Ingresá a tu cuenta para guardar tu foto.')},
  async save(){this.assertReady();if(!dirty)return;const id=getSession()?.user.id;const photo=pending;input.disabled=true;remove.disabled=true;try{await request('/rest/v1/rpc/save_my_avatar',{method:'POST',body:{photo}});if(getSession()?.user.id!==id)return;saved=photo;dirty=false;pending=null;display();status.textContent=photo?'Foto guardada. Ya aparece junto a Mi cuenta.':'Foto eliminada.'}finally{input.disabled=false;remove.disabled=false}}
 };
}

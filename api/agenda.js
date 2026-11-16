const {createHmac,timingSafeEqual}=require('node:crypto');

function staff(req){
  const password=process.env.PTF_STAFF_PASSWORD;
  const token=(req.headers.cookie || '').match(/(?:^|;\s*)ptf_staff=(\d{10})\.([a-f0-9]{64})(?:;|$)/);
  if(!password || !token || Number(token[1]) <= Date.now()/1000) return false;
  const signature=createHmac('sha256',password).update('staff-session:'+token[1]).digest('hex');
  return timingSafeEqual(Buffer.from(signature),Buffer.from(token[2]));
}
const types=['regular','school','birthday','tournament'];
async function database(path,options={}){
  const key=process.env.SUPABASE_SECRET_KEY;
  const url=process.env.SUPABASE_URL;
  if(!key || !url) throw Object.assign(new Error('Falta configurar Supabase.'),{status:503});
  const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{
    ...options,headers:{apikey:key,'Content-Type':'application/json',...options.headers}
  });
  if(!response.ok) {
    const error=await response.json().catch(()=>({}));
    throw Object.assign(new Error(error.code==='23P01'?'El horario o la tarifa cambió.':'No se pudo guardar o consultar el turno.'),{status:error.code==='23P01'?409:502});
  }
  return response.status===204 || response.headers.get('content-length')==='0' ? null : response.json();
}
async function state(privateView){
  const prices=await database('ptf_rates?select=activity,court,hourly_ars');
  const rates={};
  for(const {activity,court,hourly_ars} of prices){
    if(activity==='regular') rates['court'+court]=hourly_ars;
    else if(court===1) rates[activity]=hourly_ars;
  }
  const bookings=[];
  const columns='id,activity,court,booking_date,start_hour,duration_hours,weekly'+(privateView?',client,total_ars,demo_deposit_ars':'');
  for(let offset=0;;){
    const rows=await database('ptf_bookings?select='+columns+'&order=id&limit=500&offset='+offset);
    for(const row of rows){
      bookings.push({court:row.court,date:row.booking_date,hour:row.start_hour,hours:row.duration_hours,repeat:row.weekly?'weekly':'once',
        ...(privateView?{id:row.id,type:row.activity,client:row.client,price:row.total_ars,demoDeposit:row.demo_deposit_ars}:{})});
    }
    if(rows.length<500) break;
    offset+=rows.length;
  }
  return {rates,bookings};
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const privateView=req.query.staff==='1';
  const authorized=staff(req);
  if(privateView&&!authorized) return res.status(401).json({error:'Volvé a ingresar al panel.'});
  try{
    if(req.method==='GET') return res.json(await state(privateView));
    if(req.method!=='POST') return res.status(405).end();
    if(!String(req.headers['content-type']).startsWith('application/json')) return res.status(415).end();
    const {action,booking,rates,id}=req.body || {};
    const invalid=()=>res.status(400).json({error:'Revisá los datos ingresados.'});
    if(action==='book'){
      const {client,court,date,hour,hours,price}=booking || {};
      const type=privateView?booking?.type:'regular';
      const weekly=privateView&&booking?.repeat==='weekly';
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
      const weekday=new Date(date+'T12:00:00Z').getUTCDay();
      if(typeof client!=='string'||!client.trim()||client.length>70||![1,2].includes(court)||!types.includes(type)||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(weekday)||(!privateView&&date<today)||
        (type==='school'&&[0,6].includes(weekday))||!Number.isInteger(hour)||!Number.isInteger(hours)||hour<9||hours<1||hour+hours>23||
        !Number.isSafeInteger(price)||price<1||price>1400000000) return invalid();
      await database('ptf_bookings',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
        client:client.trim(),activity:type,court,booking_date:date,start_hour:hour,duration_hours:hours,weekly,
        total_ars:price,demo_deposit_ars:privateView?null:Math.ceil(price*30/100)
      })});
    }else if(!privateView){
      return res.status(403).end();
    }else if(action==='remove'){
      if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)) return invalid();
      await database('ptf_bookings?id=eq.'+id,{method:'DELETE'});
    }else if(action==='rates'){
      const rows=[];
      for(const activity of types) for(const court of [1,2]){
        const hourly_ars=rates?.[activity==='regular'?'court'+court:activity];
        if(!Number.isInteger(hourly_ars)||hourly_ars<1||hourly_ars>100000000) return invalid();
        rows.push({activity,court,hourly_ars});
      }
      await database('ptf_rates?on_conflict=activity,court',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
    }else return invalid();
    return res.status(204).end();
  }catch(error){return res.status(error.status||502).json({error:error.status?error.message:'No se pudo conectar con la base de datos.'});}
};

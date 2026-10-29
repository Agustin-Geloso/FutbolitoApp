import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { reminderPayload } from './payload.js';

// El gateway valida el JWT y esta función exige, además, un secreto de cron.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('REMINDER_CRON_SECRET');
 if(!secret||req.headers.get('x-reminder-secret')!==secret)return new Response('Unauthorized',{status:401});
 const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT','SITE_URL'];
 if(required.some(k=>!Deno.env.get(k)))return new Response('Missing server configuration',{status:503});
 const site=new URL(Deno.env.get('SITE_URL')!);
 if(site.protocol!=='https:')return new Response('SITE_URL must use HTTPS',{status:503});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!,Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
 const {data,error}=await db.rpc('claim_match_reminders');
 if(error){console.error('Could not claim reminders',error.code);return new Response('Database error',{status:500})}
 let sent=0,failed=0;
 await Promise.all((data||[]).map(async(row:any)=>{
  try {
   const endpoint=new URL(row.endpoint);
   if(endpoint.protocol!=='https:'||!['fcm.googleapis.com','web.push.apple.com'].includes(endpoint.hostname)&&!endpoint.hostname.endsWith('.push.services.mozilla.com')&&!endpoint.hostname.endsWith('.notify.windows.com'))throw new Error('Unsupported endpoint');
   const payload=reminderPayload(row,site.href);
   if(!payload) return;
   await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify(payload),{TTL:Math.min(300,Math.max(1,Math.floor((Date.parse(row.starts_at)-Date.now())/1000))),urgency:'high',timeout:10000});
   const saved=await db.from('reminder_deliveries').update({sent_at:new Date().toISOString(),last_error:null}).eq('id',row.id);
   if(saved.error)throw new Error('Could not acknowledge delivery');
   sent++;
  }catch(error:any){
   failed++;const status=Number(error.statusCode)||0;
   if(status===404||status===410)await db.from('push_subscriptions').delete().eq('id',row.subscription_id);
   else await db.from('reminder_deliveries').update({last_error:`Push error ${status||'internal'}`}).eq('id',row.id);
  }
 }));
 return Response.json({sent,failed});
});

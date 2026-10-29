export function reminderPayload(row,siteURL,now=Date.now()) {
 const start=new Date(row.starts_at).getTime();
 if(!Number.isFinite(start)||start<=now)return null;
 const remaining=Math.max(1,Math.ceil((start-now)/60000));
 const time=remaining===60?'una hora':`${remaining} minutos`;
 return {title:`⚽ Tu partido empieza en ${time}`,body:`${row.venue} · ${row.address}`,url:new URL(`/?partido=${encodeURIComponent(row.match_id)}`,siteURL).href,tag:`partido-${row.match_id}-${row.starts_at}-${row.minutes}`};
}

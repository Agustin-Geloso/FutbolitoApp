// El cierre local siempre se completa, incluso con red o service worker bloqueados.
export async function settleLogout({cleanup,revoke,clear,timeoutMs=2000}){
 let timer;
 const operations=Promise.allSettled([Promise.resolve().then(cleanup),Promise.resolve().then(revoke)]);
 try{await Promise.race([operations,new Promise(resolve=>{timer=setTimeout(resolve,timeoutMs)})])}
 finally{clearTimeout(timer);clear()}
}

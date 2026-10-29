// node scripts/setup-reminders.js https://tu-app.vercel.app mailto:tu-email
import {createECDH,randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const [site,subject]=process.argv.slice(2);
if(!site||!subject||new URL(site).protocol!=='https:'||!/^mailto:|^https:\/\//.test(subject)){
 console.error('Uso: node scripts/setup-reminders.js https://tu-app.vercel.app mailto:tu-email');process.exit(1);
}
const keys=createECDH('prime256v1');keys.generateKeys();
const publicKey=keys.getPublicKey().toString('base64url');
const content=[`SITE_URL=${new URL(site).origin}`,`VAPID_SUBJECT=${subject}`,`VAPID_PUBLIC_KEY=${publicKey}`,`VAPID_PRIVATE_KEY=${keys.getPrivateKey().toString('base64url')}`,`REMINDER_CRON_SECRET=${randomBytes(32).toString('base64url')}`].join('\n')+'\n';
await writeFile('.env.reminders.local',content,{flag:'wx',mode:0o600});
const config=await readFile('config.js','utf8');
await writeFile('config.js',config.replace(/export const VAPID_PUBLIC_KEY = '[^']*';/,`export const VAPID_PUBLIC_KEY = '${publicKey}';`));
console.log('Claves creadas. Archivo privado: .env.reminders.local (excluido de Git). La parte pública se configuró en config.js.');

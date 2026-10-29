import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reminderPayload} from '../supabase/functions/send-reminders/payload.js';
const now=Date.parse('2026-10-29T20:00:00Z');
const row={match_id:'123',venue:'El Potrero',address:'Cancha 2',starts_at:'2026-10-29T21:00:00Z',minutes:60};
test('Aviso de una hora con enlace al partido y etiqueta estable',()=>{const p=reminderPayload(row,'https://futbolito.example',now);assert.match(p.title,/una hora/);assert.equal(p.url,'https://futbolito.example/?partido=123');assert.equal(p.tag,reminderPayload(row,'https://futbolito.example',now+1000).tag)});
test('Aviso de 30 minutos y demora sin anunciar una hora incorrecta',()=>{assert.match(reminderPayload({...row,minutes:30},'https://futbolito.example',now+30*60000).title,/30 minutos/);assert.match(reminderPayload(row,'https://futbolito.example',now+3*60000).title,/57 minutos/)});
test('No envía avisos de un partido que ya empezó ni fechas inválidas',()=>{assert.equal(reminderPayload(row,'https://futbolito.example',now+60*60000),null);assert.equal(reminderPayload({...row,starts_at:'invalid'},'https://futbolito.example',now),null)});

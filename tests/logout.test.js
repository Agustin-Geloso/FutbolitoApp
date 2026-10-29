import {test} from 'node:test';
import assert from 'node:assert/strict';
import {settleLogout} from '../logout.js';
test('Cierra sesión local y llama ambos servicios',async()=>{const calls=[];await settleLogout({cleanup:()=>calls.push('cleanup'),revoke:()=>calls.push('revoke'),clear:()=>calls.push('clear')});assert.deepEqual(calls,['cleanup','revoke','clear'])});
test('Limpia la sesión aunque fallen los servicios',async()=>{let cleared=0;await settleLogout({cleanup:()=>{throw Error('sin red')},revoke:()=>Promise.reject(Error('fallo')),clear:()=>cleared++});assert.equal(cleared,1)});
test('No queda esperando un service worker que nunca responde',async()=>{let cleared=0,revoked=0;await settleLogout({cleanup:()=>new Promise(()=>{}),revoke:()=>revoked++,clear:()=>cleared++,timeoutMs:15});assert.equal(cleared,1);assert.equal(revoked,1)});

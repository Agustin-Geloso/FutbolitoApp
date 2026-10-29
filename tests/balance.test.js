import {test} from 'node:test';
import assert from 'node:assert/strict';
import {balance,skills} from '../balance.js';
const players=Array.from({length:10},(_,i)=>({id:String(i),name:`Jugador ${i}`,age:25,position:i<2?'Arquero':['Defensa','Delantero'][i%2],volunteer:false,...Object.fromEntries(skills.map(k=>[k,5]))}));
test('Diez jugadores, sin repetidos, un arquero por lado y reparto estable',()=>{const result=balance(players);assert.equal(result.a.length,5);assert.equal(result.b.length,5);assert.equal(new Set([...result.a,...result.b].map(p=>p.id)).size,10);assert.equal(result.a.filter(p=>p.position==='Arquero').length,1);assert.equal(result.b.filter(p=>p.position==='Arquero').length,1);assert.deepEqual(result,balance(players))});
test('Rechaza listas incompletas y falta de arqueros',()=>{assert.throws(()=>balance(players.slice(1)),/diez/);assert.throws(()=>balance(players.map(p=>({...p,position:'Defensa'}))),/arco/)});
test('Acepta voluntarios cuando no hay arqueros naturales',()=>{const result=balance(players.map((p,i)=>({...p,position:'Defensa',volunteer:i<2})));assert.notEqual(result.keeperA,result.keeperB)});
test('Encuentra equilibrio perfecto si ambos lados pueden ser iguales',()=>{const result=balance(players.map(p=>({...p,position:'Arquero'})) );assert.equal(result.cost,0)});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileMetrics} from '../profile-chart.js';
import {skills} from '../balance.js';
const all=value=>Object.fromEntries(skills.map(k=>[k,value]));
test('General promedia las ocho habilidades e incluye arco',()=>{assert.equal(profileMetrics(all('5')).general,5);assert.equal(profileMetrics({...all(5),arco:'9'}).general,5.5)});
test('No inventa un general cuando hay datos vacíos o fuera de rango',()=>{for(const value of ['',null,'texto',0,11,Infinity])assert.equal(profileMetrics({...all(5),pase:value}).general,null)});
test('Los extremos válidos conservan la escala y la edad no altera el general',()=>{assert.equal(profileMetrics({...all(10),age:85}).general,10);assert.equal(profileMetrics(all(1)).general,1)});

import {skills,labels} from './balance.js';

export function profileMetrics(values){
 const numbers=skills.map(key=>{const raw=values[key];const n=raw===''||raw==null?NaN:Number(raw);return Number.isFinite(n)&&n>=1&&n<=10?n:null});
 return {values:numbers,general:numbers.every(n=>n!==null)?numbers.reduce((sum,n)=>sum+n,0)/numbers.length:null};
}

export function mountProfileChart(form){
 const chart=document.createElement('section');chart.className='profile-chart';chart.setAttribute('aria-label','Vista previa de tus habilidades');
 chart.innerHTML='<div class="profile-chart-heading"><div><span class="eyebrow">ASÍ JUGÁS VOS</span><h3>Tu jugador, en vivo</h3></div><div class="overall"><span>GENERAL</span><output id="profile-general" aria-live="polite" aria-atomic="true">5.0</output><small>/ 10</small></div></div><svg viewBox="0 0 420 350" role="img" aria-labelledby="radar-title radar-description"><title id="radar-title">Tus ocho habilidades</title><desc id="radar-description"></desc><g id="radar-grid"></g><polygon id="radar-shape"/><g id="radar-dots"></g><g id="radar-labels"></g></svg><p id="profile-chart-note" class="muted">Promedio de las ocho habilidades. La edad y la posición no modifican esta valoración.</p>';
 form.querySelector('#skill-inputs').before(chart);
 const point=(i,r)=>{const angle=-Math.PI/2+i*Math.PI/4;return [210+Math.cos(angle)*r,171+Math.sin(angle)*r]};
 const vertices=r=>skills.map((_,i)=>point(i,r).join(',')).join(' ');
 chart.querySelector('#radar-grid').innerHTML=[2,4,6,8,10].map(level=>`<polygon points="${vertices(level*10.5)}"/>`).join('')+skills.map((_,i)=>{const [x,y]=point(i,105);return `<line x1="210" y1="171" x2="${x}" y2="${y}"/>`}).join('');
 chart.querySelector('#radar-labels').innerHTML=labels.map((label,i)=>{const [x,y]=point(i,134);const anchor=x>220?'start':x<200?'end':'middle';return `<text x="${x}" y="${y-3}" text-anchor="${anchor}">${label}<tspan id="radar-value-${i}" x="${x}" dy="15"></tspan></text>`}).join('');
 const dots=skills.map(()=>{const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','4');chart.querySelector('#radar-dots').append(dot);return dot});
 function update(){
  const metrics=profileMetrics(Object.fromEntries(skills.map(k=>[k,form.elements[k].value])));
  const formatted=metrics.general===null?'—':metrics.general.toFixed(1);
  chart.querySelector('#profile-general').value=formatted;
  chart.querySelector('#profile-general').textContent=formatted;
  chart.querySelector('#radar-shape').setAttribute('points',metrics.values.map((n,i)=>point(i,(n??0)*10.5).join(',')).join(' '));
  metrics.values.forEach((n,i)=>{const [x,y]=point(i,(n??0)*10.5);dots[i].setAttribute('cx',x);dots[i].setAttribute('cy',y);dots[i].style.display=n===null?'none':'';chart.querySelector(`#radar-value-${i}`).textContent=n===null?'—':`${n} / 10`});
  chart.querySelector('#radar-description').textContent=labels.map((label,i)=>`${label}: ${metrics.values[i]??'sin completar'}`).join('. ')+`. General: ${formatted} sobre 10.`;
  chart.querySelector('#profile-chart-note').textContent=metrics.general===null?'Completá las ocho habilidades con valores entre 1 y 10 para ver tu general.':'Promedio de las ocho habilidades. La edad y la posición no modifican esta valoración.';
 }
 form.addEventListener('input',update);
 form.addEventListener('reset',()=>queueMicrotask(update));
 update();return {update};
}

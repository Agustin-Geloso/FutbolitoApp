export const skills = ['pase','control','definicion','defensa','velocidad','resistencia','fuerza','arco'];
export const labels = ['Pase','Control','Definición','Defensa','Velocidad','Resistencia','Fuerza','Arco'];
export const rating = p => skills.slice(0,7).reduce((s,k)=>s+Number(p[k]),0)/7;
export function balance(players) {
  if(players.length!==10) throw new Error('Se necesitan exactamente diez jugadores.');
  const keeper = p => p.position==='Arquero' || p.volunteer;
  if(players.filter(keeper).length<2) throw new Error('Faltan responsables del arco. Al menos dos jugadores deben ser arqueros o marcar que pueden atajar.');
  let best;
  // Fix player 0 in A: 126 unique partitions, with all eligible keeper pairs.
  for(let mask=1;mask<1024;mask+=2){
    const a=players.filter((_,i)=>mask & (1<<i)), b=players.filter((_,i)=>!(mask & (1<<i)));
    if(a.length!==5) continue;
    for(const ka of a.filter(keeper)) for(const kb of b.filter(keeper)){
      const natural=players.filter(p=>p.position==='Arquero').length;
      if(natural>=2 && (ka.position!=='Arquero'||kb.position!=='Arquero')) continue;
      const outA=a.filter(p=>p!==ka), outB=b.filter(p=>p!==kb);
      const sum=(arr,fn)=>arr.reduce((s,p)=>s+fn(p),0);
      let cost=skills.slice(0,7).reduce((s,k)=>s+Math.abs(sum(outA,p=>p[k])-sum(outB,p=>p[k]))/4,0);
      cost+=Math.abs(ka.arco-kb.arco)*1.5;
      cost+=Math.abs(sum(a,p=>p.age)-sum(b,p=>p.age))/5*.025;
      for(const pos of ['Defensa','Mediocampista defensivo','Mediocampista ofensivo','Delantero']) cost+=Math.abs(outA.filter(p=>p.position===pos).length-outB.filter(p=>p.position===pos).length)*1.2;
      if(!best||cost<best.cost) best={a,b,keeperA:ka.id,keeperB:kb.id,cost};
    }
  }
  if(!best) throw new Error('No se encontró un reparto con un arquero por equipo.');
  return best;
}

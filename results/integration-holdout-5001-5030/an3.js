const fs=require('fs');const m=a=>a.reduce((x,y)=>x+y,0)/a.length;
let s=2024;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
const L=(dir,n)=>JSON.parse(fs.readFileSync(`${dir}/${n}_vs_B.json`));
const sm=(rows)=>{const g={};rows.forEach(r=>(g[r.seed]??=[]).push(r.revenue));return Object.keys(g).sort().map(x=>m(g[x]))};
const ci=d=>{const b=[];for(let i=0;i<10000;i++){let t=0;for(let j=0;j<d.length;j++)t+=d[Math.floor(rnd()*d.length)];b.push(t/d.length)}b.sort((x,y)=>x-y);return [b[249],b[9749]]};
const R=Math.round;
function pair(D,a,b){const x=sm(D[a].rows),y=sm(D[b].rows),d=x.map((v,i)=>v-y[i]);const [lo,hi]=ci(d);const sd=Math.sqrt(m(d.map(v=>(v-m(d))**2))*d.length/(d.length-1));
 const sorted=[...d].sort((p,q)=>q-p);const tot=d.reduce((p,q)=>p+q,0);const top3=sorted.slice(0,3).reduce((p,q)=>p+q,0);
 const without=m(sorted.slice(3));const med=[...d].sort((p,q)=>p-q)[Math.floor(d.length/2)];
 return{d,mean:m(d),lo,hi,w:d.filter(v=>v>0).length,e:d.filter(v=>v===0).length,l:d.filter(v=>v<0).length,top3share:top3/tot,without3:without,med,min:Math.min(...d),max:Math.max(...d),t:m(d)/(sd/Math.sqrt(d.length))}}
const SETS=[['PUBLIC 2026-2030 (n=5, 20경기)','../out',['M','C2','D1']],['NEW 4001-4020 (n=20, 80경기)','../new4001/out',['M','C2','D1']],['HOLDOUT 5001-5030 (n=30, 120경기)','out',['M','C2','D1']]];
for(const [label,dir,names] of SETS){console.log('=== '+label);const D={};names.forEach(n=>D[n]=L(dir,n));const base=m(D.M.rows.map(r=>r.revenue));
 for(const n of names){const r=D[n].rows,f=k=>m(r.map(x=>x[k]));let line=[n,R(f('revenue'))];
  if(n!=='M'){const p=pair(D,n,'M');const gd=r.map((x,i)=>x.revenue-D.M.rows[i].revenue);line.push((p.mean>=0?'+':'')+R(p.mean)+` (${(p.mean/base*100).toFixed(2)}%)`,`seeds ${p.w}/${p.e}/${p.l}`,`CI[${R(p.lo)},${R(p.hi)}]`,`games ${gd.filter(v=>v>0).length}/${gd.filter(v=>v===0).length}/${gd.filter(v=>v<0).length}`);}
  line.push(`served ${f('served').toFixed(1)}`,`unf ${f('unfinished').toFixed(1)}`,`refOrd ${f('refundOrders').toFixed(1)}`,`untaken ${f('untaken').toFixed(1)}`,`refund ${R(f('refunded'))}`,`err ${r.filter(x=>x.status!=='OK').length}`,`maxMs ${D[n].maxChooseMs.toFixed(0)}`);console.log(line.join(' | '));
  const w=[0,1].map(i=>{let b=0;const p=[];for(const t of ['COOK','TAKE_ORDER','PROMOTE']){const v=m(r.map(x=>x['w'+i+'_'+t]||0));b+=v;p.push(t[0]+v.toFixed(0))}return `w${i}[${p.join(' ')} idle${(300-b).toFixed(0)}] 가동률${(b/3).toFixed(1)}%`});console.log('   '+w.join(' ; '));}
 for(const [a,b] of [['D1','C2']]){const p=pair(D,a,b);console.log(`${a}-${b}: ${R(p.mean)} seeds ${p.w}/${p.e}/${p.l} CI[${R(p.lo)},${R(p.hi)}]`);}
 for(const [a,b] of [['D1','M'],['C2','M']]){const p=pair(D,a,b);console.log(`${a}-${b} 안정성: 중앙값 ${R(p.med)}, 최소 ${R(p.min)}, 최대 ${R(p.max)}, 상위3시드 기여 ${(p.top3share*100).toFixed(0)}%, 상위3 제외 평균 ${R(p.without3)}, t=${p.t.toFixed(2)}`);}
 if(label.startsWith('HOLDOUT'))console.log('per-seed D1-M:',pair(D,'D1','M').d.map(R).join(','),'\nper-seed C2-M:',pair(D,'C2','M').d.map(R).join(','));}

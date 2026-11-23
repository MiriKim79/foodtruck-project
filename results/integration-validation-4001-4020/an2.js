const fs=require('fs');const m=a=>a.reduce((x,y)=>x+y,0)/a.length;
let s=12345;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
const L=(dir,n)=>JSON.parse(fs.readFileSync(`${dir}/${n}_vs_B.json`));
const seedMeans=(rows,k='revenue')=>{const g={};rows.forEach(r=>(g[r.seed]??=[]).push(r[k]));return Object.keys(g).sort().map(x=>m(g[x]));};
const ci=d=>{const b=[];for(let i=0;i<10000;i++){let t=0;for(let j=0;j<d.length;j++)t+=d[Math.floor(rnd()*d.length)];b.push(t/d.length)}b.sort((x,y)=>x-y);return [b[249],b[9749]]};
const names=['M','C2','D1','D3','C4'];
function report(dir,label){
 console.log('=== '+label);const D={};names.forEach(n=>D[n]=L(dir,n));
 const base=seedMeans(D.M.rows);
 const pair=(a,b)=>{const x=seedMeans(D[a].rows),y=seedMeans(D[b].rows);const d=x.map((v,i)=>v-y[i]);const [lo,hi]=ci(d);return {d,mean:m(d),lo,hi,w:d.filter(v=>v>0).length,e:d.filter(v=>v===0).length,l:d.filter(v=>v<0).length}};
 for(const n of names){const r=D[n].rows,f=k=>m(r.map(x=>x[k]));
  const row=[n,Math.round(f('revenue'))];
  if(n!=='M'){const p=pair(n,'M');row.push((p.mean>=0?'+':'')+Math.round(p.mean),`seeds ${p.w}/${p.e}/${p.l}`,`CI[${Math.round(p.lo)},${Math.round(p.hi)}]`);
   const gd=r.map((x,i)=>x.revenue-D.M.rows[i].revenue);row.push(`games ${gd.filter(v=>v>0).length}/${gd.filter(v=>v===0).length}/${gd.filter(v=>v<0).length}`);}
  row.push('served '+f('served').toFixed(1),'unf '+f('unfinished').toFixed(1),'refOrd '+f('refundOrders').toFixed(1),'untaken '+f('untaken').toFixed(1),'refund '+Math.round(f('refunded')),'P/T/C/idle '+[f('P'),f('T'),f('C'),f('idle')].map(v=>v.toFixed(0)).join('/'),'err '+r.filter(x=>x.status!=='OK').length,'maxMs '+D[n].maxChooseMs.toFixed(0));
  console.log(row.join(' | '));
  const w=[0,1].map(i=>{let b=0;const p=[];for(const t of ['COOK','TAKE_ORDER','PROMOTE']){const v=m(r.map(x=>x['w'+i+'_'+t]||0));b+=v;p.push(t[0]+v.toFixed(0))}return `w${i}:${p.join(' ')} idle${(300-b).toFixed(0)}`});console.log('   '+w.join(' ; '));}
 for(const [a,b] of [['D1','C2'],['D3','D1'],['C4','C2'],['D1','C4']]){const p=pair(a,b);console.log(`${a}-${b}: ${Math.round(p.mean)} seeds ${p.w}/${p.e}/${p.l} CI[${Math.round(p.lo)},${Math.round(p.hi)}]`);}
 console.log('per-seed D1-M:',pair('D1','M').d.map(Math.round).join(','));
}
report('../out','PUBLIC 2026-2030 (n=5)');report('out','NEW 4001-4020 (n=20)');

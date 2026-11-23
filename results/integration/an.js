const fs=require('fs');const names=process.argv.slice(2);const L=n=>JSON.parse(fs.readFileSync(`out/${n}_vs_B.json`));
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;const base=L('M');
const key=r=>r.seed+'|'+r.seat+'|'+r.mirror;const bm=new Map(base.rows.map(r=>[key(r),r]));
const seeds=[...new Set(base.rows.map(r=>r.seed))];
console.log('name | rev | d | seeds(+/=/-) games(+/=/-) | served unf refOrd untaken refund | P T C idle | err maxMs | seedDeltas');
for(const n of names){const d=L(n);const rows=d.rows;const f=k=>mean(rows.map(r=>r[k]));
 const gd=rows.map(r=>r.revenue-bm.get(key(r)).revenue);
 const sd=seeds.map(s=>mean(rows.filter(r=>r.seed===s).map(r=>r.revenue-bm.get(key(r)).revenue)));
 const c=(a,e=0)=>[a.filter(x=>x>e).length,a.filter(x=>x===e).length,a.filter(x=>x<e).length].join('/');
 console.log([n,Math.round(f('revenue')),Math.round(f('revenue')-mean(base.rows.map(r=>r.revenue))),c(sd),c(gd),f('served').toFixed(1),f('unfinished').toFixed(1),f('refundOrders').toFixed(1),f('untaken').toFixed(1),Math.round(f('refunded')),f('P').toFixed(0),f('T').toFixed(0),f('C').toFixed(0),f('idle').toFixed(0),rows.filter(r=>r.status!=='OK').length,d.maxChooseMs.toFixed(0),sd.map(x=>Math.round(x)).join(',')].join(' | '));}

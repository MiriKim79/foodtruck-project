// 사용: node results/integration-summary/make_summary.js  (저장소 루트에서)
// 세 시드 집합의 경기별 원자료(raw/*.json)로 summary.csv를 생성한다. 시드 단위 짝비교 + 95% 부트스트랩(10,000회, 고정 난수열).
const fs=require('fs'),path=require('path');const m=a=>a.reduce((x,y)=>x+y,0)/a.length;
let s=2024;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
const SETS=[
 ['public_2026-2030','results/integration/raw',['M','C2','C3','C4','C5','C6','D1','D2','D3']],
 ['new_4001-4020','results/integration-validation-4001-4020/raw',['M','C2','C4','D1','D3']],
 ['holdout_5001-5030','results/integration-holdout-5001-5030/raw',['M','C2','D1']]];
const CFG={M:'main(기준)',C2:'접수ON/FCFS/홍보기본',C3:'접수ON/SJF/홍보기본',C4:'접수ON/DP/홍보기본',C5:'접수ON/FCFS/홍보제한',C6:'접수ON/DP/홍보제한',D1:'접수OFF/DP/홍보기본(최종)',D2:'접수OFF/SJF/홍보기본',D3:'접수OFF/DP/홍보제한'};
const sm=rows=>{const g={};rows.forEach(r=>(g[r.seed]??=[]).push(r.revenue));return Object.keys(g).sort().map(k=>m(g[k]))};
const ci=d=>{const b=[];for(let i=0;i<10000;i++){let t=0;for(let j=0;j<d.length;j++)t+=d[Math.floor(rnd()*d.length)];b.push(t/d.length)}b.sort((x,y)=>x-y);return[b[249],b[9749]]};
const out=['set,variant,config,games,seeds,mean_revenue,delta_vs_main,delta_pct,seeds_up,seeds_equal,seeds_down,ci95_lo,ci95_hi,served,unfinished,refund_orders,untaken,refund_amount,errors,max_choose_ms'];
for(const [set,dir,names] of SETS){const D={};names.forEach(n=>D[n]=JSON.parse(fs.readFileSync(path.join(dir,n+'_vs_B.json'))));
 const base=m(D.M.rows.map(r=>r.revenue)),bs=sm(D.M.rows);
 for(const n of names){const r=D[n].rows,f=k=>m(r.map(x=>x[k]));const rev=f('revenue');let c=['','','','','']; 
  if(n!=='M'){const d=sm(r).map((v,i)=>v-bs[i]);const[lo,hi]=ci(d);c=[Math.round(m(d)),(m(d)/base*100).toFixed(2),d.filter(v=>v>0).length,d.filter(v=>v===0).length,d.filter(v=>v<0).length,Math.round(lo),Math.round(hi)];}
  else c=['','','','','','',''];
  out.push([set,n,CFG[n],r.length,bs.length,Math.round(rev),...c,f('served').toFixed(1),f('unfinished').toFixed(1),f('refundOrders').toFixed(1),f('untaken').toFixed(1),Math.round(f('refunded')),r.filter(x=>x.status!=='OK').length,D[n].maxChooseMs.toFixed(0)].join(','));}}
fs.writeFileSync('results/integration-summary/summary.csv','﻿'+out.join('\n')+'\n');console.log(out.join('\n'));
// 최종 후보(D1) vs 접수 ON(C2) 시드 단위 짝비교 -> paired_final_vs_gate_on.csv
const po=['set,mean_diff,seeds_up,seeds_equal,seeds_down,ci95_lo,ci95_hi'];
for(const [set,dir] of SETS){const L=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'_vs_B.json'))).rows;const a=sm(L('D1')),b=sm(L('C2'));const d=a.map((v,i)=>v-b[i]);const[lo,hi]=ci(d);po.push([set,Math.round(m(d)),d.filter(v=>v>0).length,d.filter(v=>v===0).length,d.filter(v=>v<0).length,Math.round(lo),Math.round(hi)].join(','));}
fs.writeFileSync('results/integration-summary/paired_final_vs_gate_on.csv','﻿'+po.join('\n')+'\n');console.log(po.join('\n'));
// 안정성: 시드별 차이의 중앙값/최소/최대, 상위 3개 시드 기여 비율, 상위 3개 제외 평균 + 직원 작업 시간(전략 평균, 300틱 기준) -> stability_vs_main.csv
const st=['set,variant,median_diff,min_diff,max_diff,top3_share_pct,mean_without_top3,w0_cook,w1_take,w1_promote,w0_idle,w1_idle'];
for(const [set,dir] of SETS){const L=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'_vs_B.json'))).rows;const bs=sm(L('M'));
 for(const n of ['C2','D1']){const r=L(n);const d=sm(r).map((v,i)=>v-bs[i]);const so=[...d].sort((a,b)=>b-a);const tot=d.reduce((a,b)=>a+b,0);
  const med=[...d].sort((a,b)=>a-b)[Math.floor(d.length/2)];const g=k=>m(r.map(x=>x[k]||0));
  const c=g('w0_COOK'),t0=g('w0_TAKE_ORDER'),p0=g('w0_PROMOTE'),c1=g('w1_COOK'),t=g('w1_TAKE_ORDER'),p=g('w1_PROMOTE');
  st.push([set,n,Math.round(med),Math.round(Math.min(...d)),Math.round(Math.max(...d)),(so.slice(0,3).reduce((a,b)=>a+b,0)/tot*100).toFixed(0),Math.round(m(so.slice(3))),c.toFixed(0),t.toFixed(0),p.toFixed(0),(300-c-t0-p0).toFixed(0),(300-c1-t-p).toFixed(0)].join(','));}}
fs.writeFileSync('results/integration-summary/stability_vs_main.csv','﻿'+st.join('\n')+'\n');console.log(st.join('\n'));

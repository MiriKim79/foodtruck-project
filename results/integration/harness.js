'use strict';
const fs=require('fs'),path=require('path');
const R=require('./run.js');
const variant=process.argv[2], opp=process.argv[3]||'B';
const seeds=(process.argv[4]||'2026,2027,2028,2029,2030').split(',');
let maxMs=0;const orig=R.Strategy.prototype.choose;
R.Strategy.prototype.choose=async function(view){const t=process.hrtime.bigint();const r=await orig.call(this,view);const ms=Number(process.hrtime.bigint()-t)/1e6;if(this.team===variant&&ms>maxMs)maxMs=ms;return r;};
(async()=>{
 if(!process.env.SKIPC){R.compile(variant);if(opp!==variant)R.compile(opp);}
 const rows=[];
 for(const seed of seeds)for(const seats of [[variant,opp],[opp,variant]])for(const mirror of [false,true]){
  const sim=await R.match({seed,seats,mirror,captureHistory:false});
  const me=seats.indexOf(variant)===0?0:1, t=sim.trucks[me];
  const mine=sim.orders.filter(o=>o.truckId===me);
  const refundOrders=mine.filter(o=>o.paidAt!==null&&o.state!=='SERVED').length;
  const untaken=mine.filter(o=>o.paidAt===null&&o.state!=='SERVED').length;
  const wt={};for(const e of sim.events)if(e.type==='START'&&e.truckId===me){const k='w'+e.workerId+'_'+e.taskType;wt[k]=(wt[k]||0)+Math.min(e.finish,300)-e.start;}
  const row={seed,seat:me,mirror,revenue:t.revenue,served:t.served,unfinished:t.unfinished,refundOrders,untaken,refunded:t.refunded,status:t.status,error:t.error||'',oppRevenue:sim.trucks[1-me].revenue,
   P:t.metrics.PROMOTE,T:t.metrics.TAKE_ORDER,C:t.metrics.COOK,idle:t.metrics.WAIT,...wt};
  rows.push(row);
 }
 fs.mkdirSync('out',{recursive:true});
 fs.writeFileSync(path.join('out',variant+'_vs_'+opp+'.json'),JSON.stringify({variant,opp,maxChooseMs:maxMs,rows}));
 console.log(variant,'done',rows.length,'maxMs',maxMs.toFixed(1));
})().catch(e=>{console.error(variant,e.message);process.exit(1)});

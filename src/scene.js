/* State-driven 2D presentation. Never writes simulation state or calls RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoodtruckScene=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const LIMIT=96,COLORS=['#18765e','#bd6037','#3c739f'],SHIRTS=['#df986c','#79a2bb','#9a91b8','#77a48a','#ba9a53','#c77c85'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function truckBase(tid,count){return count===2?120+600*tid:20+400*tid;}
function walkX(c,time){if(Number.isFinite(c.routeStart))return clamp(c.routeStart+c.routeDirection*c.routeSpeed*Math.max(0,time-c.arrival),40,1160);return clamp(50+(c.id*71)%1000+(time-c.arrival)*(c.id%2?-20:20),20,1180);}
function isVisible(c,time){return !['LEFT','CANCELLED','SERVED'].includes(c.state)||(c.leftAt!==null&&time-c.leftAt<= (c.state==='SERVED'?4:1));}
function targetMap(s){
 const map=new Map(),orderQ=[0,0,0],foodQ=[0,0,0];
 for(const c of s.customers){let x=walkX(c,s.now),y=36+(c.id%4)*31;const bx=truckBase(c.truckId??0,s.trucks.length);
  if(c.state==='ORDER_QUEUE'){const k=orderQ[c.truckId]++;x=bx+36+(k%7)*24;y=232+Math.min(2,Math.floor(k/7))*24;}
  else if(c.state==='TAKING'){x=bx+174;y=449;}
  else if(c.state==='COOK_QUEUE'||c.state==='UNFINISHED'){const k=foodQ[c.truckId]++;x=bx+238+(k%5)*22;y=232+Math.min(2,Math.floor(k/5))*24;}
  else if(c.state==='COOKING'){x=bx+280;y=449;}
  else if(c.state==='SERVED'){const age=s.now-c.leftAt;x=bx+281+Math.min(3,age)*16;y=449-age*45;}
  else if(['LEFT','CANCELLED'].includes(c.state)){const age=s.now-(c.leftAt??s.now);x=clamp(walkX(c,c.leftAt??s.now)+(c.routeDirection||1)*age*45,10,1190);}
  map.set(c.id,{x,y});
 }
 return map;
}
function selectCustomers(s){
 const live=s.customers.filter(c=>isVisible(c,s.now));
 const groups=[live.filter(c=>['TAKING','COOKING','SERVED'].includes(c.state)),live.filter(c=>c.state==='WALK'),live.filter(c=>['ORDER_QUEUE','COOK_QUEUE','UNFINISHED'].includes(c.state)),live.filter(c=>['LEFT','CANCELLED'].includes(c.state))];
 // Reserve most drawing budget for the moving street, then a representative queue.
 const selected=[],seen=new Set(),add=(g,n)=>{for(const c of g){if(n<=0||selected.length===LIMIT)break;if(!seen.has(c.id)){selected.push(c);seen.add(c.id);n--;}}};
 add(groups[0],12);add(groups[1],60);
 for(let tid=0;tid<s.trucks.length;tid++){const queue=groups[2].filter(c=>c.truckId===tid);add(queue.filter(c=>c.state==='ORDER_QUEUE'),3);add(queue.filter(c=>c.state!=='ORDER_QUEUE'),4);}
 add(groups[3],3);for(const g of groups)add(g,LIMIT-selected.length);
 return selected;
}
function workerPosition(type,tid,wid,count){const x=truckBase(tid,count);return type==='PROMOTE'?{x:x+65,y:457}:type==='TAKE_ORDER'?{x:x+176,y:366}:type==='COOK'?{x:x+281,y:366}:{x:x+326+wid*20,y:465};}
function prepareScene(s,previous,events){
 const current=targetMap(s),before=targetMap(previous||s),prevCustomers=new Map((previous||s).customers.map(c=>[c.id,c]));
 const people=selectCustomers(s).map(c=>{const p=prevCustomers.get(c.id),to=current.get(c.id),from=before.get(c.id)||{x:to.x-(c.routeDirection||1)*20,y:to.y};return {id:c.id,state:c.state,truckId:c.truckId,type:c.type??0,interest:[...c.interest],gauge:clamp(Math.max(...c.interest)/4,0,1),interestRaised:p?Math.max(...c.interest)>Math.max(...p.interest):false,from,to,newArrival:!p,leftAge:c.leftAt===null?0:s.now-c.leftAt};});
 const workers=[];
 for(const t of s.trucks)for(const w of t.workers){const type=s.finished||t.status!=='OK'?'WAIT':w.lastWork?.type||'WAIT',old=(previous||s).trucks[t.id].workers[w.id],oldType=(previous||s).finished?'WAIT':old.lastWork?.type||'WAIT';workers.push({truckId:t.id,id:w.id,type,orderId:w.lastWork?.orderId??null,from:workerPosition(oldType,t.id,w.id,(previous||s).trucks.length),to:workerPosition(type,t.id,w.id,s.trucks.length)});}
 const sales=events.filter(e=>e.type==='SALE'&&e.time===s.now).map(e=>({truckId:e.truckId,price:e.price,orderId:e.orderId}));
 const queues=s.trucks.map(t=>({order:s.orders.filter(o=>o.truckId===t.id&&o.state==='ORDER_QUEUE').length,food:s.orders.filter(o=>o.truckId===t.id&&o.state==='COOK_QUEUE').length}));
 return {time:s.now,ruleset:s.ruleset||(s.demandMode==='continuous'?'balanced':'legacy'),finished:s.finished,people,workers,sales,queues,trucks:s.trucks.map(t=>({id:t.id,revenue:t.revenue,served:t.served,status:t.status})),active:s.customers.filter(c=>isVisible(c,s.now)).length};
}
function sampleScene(model,fraction=1,motionTime=0,animate=true){const f=animate?clamp(fraction,0,1):1,ease=f*f*(3-2*f);return {...model,people:model.people.map(p=>({...p,x:p.from.x+(p.to.x-p.from.x)*ease,y:p.from.y+(p.to.y-p.from.y)*ease,phase:animate?motionTime*7+p.id:0})),workers:model.workers.map(w=>({...w,x:w.from.x+(w.to.x-w.from.x)*ease,y:w.from.y+(w.to.y-w.from.y)*ease,phase:animate?motionTime*9+w.id:0,moving:animate&&f<.85&&Math.hypot(w.to.x-w.from.x,w.to.y-w.from.y)>10})),fraction:f,animate};}
function createRenderer(canvas){const ctx=canvas.getContext('2d');
 const rr=(x,y,w,h,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 const line=(x1,y1,x2,y2,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
 const dot=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
 const text=(s,x,y,size=12,color='#26473b',align='left',bold=false)=>{ctx.fillStyle=color;ctx.font=`${bold?'700 ':''}${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillText(s,x,y);};
 function customer(p){
  const walking=p.state==='WALK'||p.state==='SERVED'||Math.hypot(p.to.x-p.from.x,p.to.y-p.from.y)>15,step=walking?Math.sin(p.phase)*3:Math.sin(p.phase*.4)*.6;
  const outline=p.state==='WALK'?'#7b8b76':['ORDER_QUEUE','TAKING'].includes(p.state)?'#b17b27':p.state==='SERVED'?'#237b5a':'#4d81b1';
  ctx.save();if(p.state==='LEFT'||p.state==='CANCELLED')ctx.globalAlpha=.45;if(p.state==='UNFINISHED')ctx.globalAlpha=.6;
  ctx.fillStyle='#173a2820';ctx.beginPath();ctx.ellipse(p.x,p.y+13,7,2,0,0,Math.PI*2);ctx.fill();
  line(p.x-2,p.y+5,p.x-3+step,p.y+13,'#42584b',2.5);line(p.x+2,p.y+5,p.x+3-step,p.y+13,'#42584b',2.5);
  rr(p.x-5,p.y-5,10,12,4,SHIRTS[p.id%SHIRTS.length]);dot(p.x,p.y-10,5,'#edc8a3');line(p.x-5,p.y-1,p.x-8-step*.5,p.y+4,outline,2);line(p.x+5,p.y-1,p.x+8+step*.5,p.y+4,outline,2);
  if(p.state==='SERVED'){rr(p.x+7,p.y-3,10,8,2,'#fff7d7');line(p.x+8,p.y-4,p.x+14,p.y-4,'#be7638',2);text('✓',p.x,p.y-22,12,'#18714e','center',true);}
  else if(!['LEFT','CANCELLED','UNFINISHED'].includes(p.state)){
   rr(p.x-12,p.y-24,24,5,2,'#fff');rr(p.x-11,p.y-23,22*p.gauge,3,1,'#bb8521');for(let k=1;k<4;k++)line(p.x-11+k*5.5,p.y-23,p.x-11+k*5.5,p.y-20,'#ffffffbb',.7);
   if(p.interestRaised&&p.state==='WALK'){text('+',p.x+17,p.y-19,12,'#a47018','center',true);}
   if(p.state==='TAKING'){text('주문',p.x,p.y-33,10,'#805b22','center',true);}else if(p.state==='COOKING'){text('수령 대기',p.x,p.y-33,10,'#356687','center',true);}
  }
  ctx.restore();
 }
 function staff(w,s){
  const col=COLORS[w.truckId],phase=w.phase,swing=w.moving?Math.sin(phase)*5:0;
  ctx.fillStyle='#1c382b25';ctx.beginPath();ctx.ellipse(w.x,w.y+17,12,3,0,0,Math.PI*2);ctx.fill();
  line(w.x-4,w.y+7,w.x-5+swing,w.y+18,col,4);line(w.x+4,w.y+7,w.x+5-swing,w.y+18,col,4);
  rr(w.x-9,w.y-8,18,20,5,col);rr(w.x-6,w.y-6,12,16,3,'#fffaf0');dot(w.x,w.y-17,7,'#edc7a1');
  if(w.type==='COOK'){rr(w.x-9,w.y-26,18,7,3,'#fff');dot(w.x-5,w.y-26,5,'#fff');dot(w.x+4,w.y-27,6,'#fff');}else rr(w.x-9,w.y-24,18,5,2,col);
  text(String(w.id+1),w.x,w.y+6,11,col,'center',true);
  if(w.moving){line(w.x-9,w.y-5,w.x-14-swing,w.y+5,col,3);line(w.x+9,w.y-5,w.x+14+swing,w.y+5,col,3);return;}
  if(w.type==='PROMOTE'){
   const wave=Math.sin(phase)*7;line(w.x-8,w.y-5,w.x-18,w.y-19-wave,col,3);line(w.x+8,w.y-5,w.x+18,w.y-11,col,3);
   ctx.fillStyle='#f0b540';ctx.beginPath();ctx.moveTo(w.x+16,w.y-16);ctx.lineTo(w.x+30,w.y-24);ctx.lineTo(w.x+30,w.y-3);ctx.lineTo(w.x+16,w.y-8);ctx.closePath();ctx.fill();
   if(s.animate){for(let k=0;k<2;k++){const radius=12+k*9+(Math.sin(phase)*.5+.5)*6;ctx.strokeStyle='#c68d2b88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w.x+29,w.y-13,radius,-.65,.65);ctx.stroke();}}
  }else if(w.type==='TAKE_ORDER'){
   const tap=Math.sin(phase)*3;rr(w.x+18,w.y+2,25,16,3,'#263e37');rr(w.x+21,w.y+4,18,9,1,'#a9e0c2');line(w.x+8,w.y-4,w.x+23,w.y+5+tap,col,3);line(w.x-8,w.y-3,w.x-15,w.y+6,col,3);rr(w.x+27,w.y-6,10,10,1,'#fff');line(w.x+29,w.y-3,w.x+35,w.y-3,'#92a18b',1);
  }else if(w.type==='COOK'){
   const stir=Math.sin(phase)*4;rr(w.x+11,w.y+8,38,6,2,'#d5d8c9');ctx.fillStyle='#293f34';ctx.beginPath();ctx.ellipse(w.x+28,w.y+6,17,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e2ad54';ctx.beginPath();ctx.ellipse(w.x+28,w.y+5,12,3,0,0,Math.PI*2);ctx.fill();line(w.x+9,w.y-3,w.x+24+stir,w.y+2,col,3);line(w.x+22+stir,w.y-6,w.x+29+stir,w.y+4,'#81542c',2);
   for(let k=0;k<3;k++){const lift=s.animate?(phase*4+k*8)%23:9+k*4;ctx.strokeStyle='#ffffffba';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w.x+20+k*8,w.y-5-lift);ctx.quadraticCurveTo(w.x+16+k*8,w.y-10-lift,w.x+22+k*8,w.y-15-lift);ctx.stroke();}
  }else{line(w.x-8,w.y-3,w.x-11,w.y+8,col,3);line(w.x+8,w.y-3,w.x+11,w.y+8,col,3);}
 }
 function draw(model,fraction=1,time=0,animate=true){const s=sampleScene(model,fraction,time,animate);ctx.clearRect(0,0,1200,520);ctx.fillStyle='#edf0df';ctx.fillRect(0,0,1200,520);
  ctx.fillStyle='#d7e0d0';ctx.fillRect(0,0,1200,165);ctx.strokeStyle='#f9f7e7';ctx.lineWidth=2;ctx.setLineDash([14,15]);ctx.beginPath();ctx.moveTo(0,83);ctx.lineTo(1200,83);ctx.stroke();ctx.setLineDash([]);text('공유 거리',16,157,10,'#5e7460');
  for(let i=0;i<s.trucks.length;i++){const x=truckBase(i,s.trucks.length);rr(x,181,360,98,12,'#e3e9d8');text('접수 대기 '+s.queues[i].order+'명',x+18,199,11,'#8d672b','left',true);text('제조 대기 '+s.queues[i].food+'건',x+230,199,11,'#3e6d8d','left',true);}
  s.people.filter(p=>p.y<300).sort((a,b)=>a.y-b.y).forEach(customer);
  for(const t of s.trucks){const x=truckBase(t.id,s.trucks.length),col=COLORS[t.id];rr(x,303,360,117,13,col);rr(x+15,327,290,65,5,'#fdf8e8');rr(x+315,326,29,51,5,'#bcd8c7');rr(x+13,290,291,25,4,col);for(let k=0;k<12;k++)if(k%2===0)rr(x+14+k*24,290,24,25,0,'#fff6e5');text('TRUCK '+'ABC'[t.id],x+17,282,13,col,'left',true);text(t.revenue.toLocaleString('ko-KR')+'원',x+348,282,17,col,'right',true);text(s.ruleset!=='legacy'?'① 4,000 · 2t     ② 6,000 · 3t     ③ 9,000 · 4t':'① 4,000 · 2t     ② 6,000 · 4t     ③ 9,000 · 7t',x+160,410,10,'#fff8ea','center');dot(x+65,425,13,'#2a4337');dot(x+303,425,13,'#2a4337');rr(x+13,477,334,28,6,'#fbfcf2');text(s.ruleset==='basket'?'홍보 3t':'홍보',x+65,496,12,'#8a631c','center',true);text(s.ruleset==='basket'?'접수·계산 2t':'접수·계산',x+175,496,12,'#416d8b','center',true);text('조리·수령',x+280,496,12,'#256f56','center',true);}
  s.workers.forEach(w=>staff(w,s));s.people.filter(p=>p.y>=300).sort((a,b)=>a.y-b.y).forEach(customer);
  for(const e of s.sales){const x=truckBase(e.truckId,s.trucks.length),y=300-(s.animate?s.fraction*22:8);ctx.save();ctx.globalAlpha=s.animate?1-s.fraction*.65:1;rr(x+18,y-32,140,27,8,'#fff4bb');text('제공 +'+e.price.toLocaleString('ko-KR')+'원',x+88,y-13,12,'#556722','center',true);ctx.restore();}
  return {drawn:s.people.length,workers:s.workers.length,saleEffects:s.sales.length};
 }
 return {draw};
}
return {LIMIT,walkX,targetMap,selectCustomers,prepareScene,sampleScene,createRenderer};
});

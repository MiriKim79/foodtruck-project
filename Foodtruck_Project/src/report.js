(function(root){
'use strict';
const names={PROMOTE:'홍보',TAKE_ORDER:'주문·계산',COOK:'제조',WAIT:'대기'};
function analyze(frames){
 if(!frames.length) return {teams:[],rows:[],receipts:[],end:0};
 const last=frames[frames.length-1],rows=[];
 const teams=last.trucks.map(t=>{
  const orders=last.orders.filter(o=>o.truckId===t.id),paid=orders.filter(o=>o.paidAt!==null&&o.paidAt!==undefined).reduce((n,o)=>n+o.price,0);
  t.workers.forEach(w=>{const spans=[];for(let i=1;i<frames.length;i++){const f=frames[i],p=frames[i-1],work=f.trucks.find(x=>x.id===t.id)?.workers.find(x=>x.id===w.id)?.lastWork;const type=work?.type||'WAIT',orderId=work?.orderId??null,prev=spans[spans.length-1];if(prev&&prev.type===type&&prev.orderId===orderId&&prev.end===p.now){prev.end=f.now;}else spans.push({start:p.now,end:f.now,type,orderId});}rows.push({team:t.id,worker:w.id,spans});});
  return {id:t.id,revenue:t.revenue,paid,refunded:t.refunded,escrow:t.escrow,served:t.served,unfinished:orders.filter(o=>o.state!=='SERVED').length,status:t.status,error:t.error};
 });
 const receipts=last.orders.map(o=>{
 const paid=o.paidAt!=null?o.price:0, revenue=o.state==='SERVED'?paid:0;
 const refunded=['UNFINISHED','CANCELLED'].includes(o.state)?paid:0;
 return {id:o.id,team:o.truckId,customer:o.customerId,menu:o.label||('메뉴'+o.menuId),quantity:o.quantity||1,price:o.price,joined:o.joined,paidAt:o.paidAt,completedAt:o.completedAt,state:o.state,paid,revenue,refunded,escrow:paid-revenue-refunded};
 });
 return {teams,rows,receipts,end:last.now};
}
function csv(report){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\ufeff'+[['팀','직원','시작 tick','종료 tick (미포함)','작업','주문 ID'],...report.rows.flatMap(r=>r.spans.map(s=>[String.fromCharCode(65+r.team),r.worker+1,s.start,s.end,names[s.type]||s.type,s.orderId]))].map(r=>r.map(q).join(',')).join('\r\n');}
const states={SERVED:'제공 완료',UNFINISHED:'영업 종료·미완료',CANCELLED:'전략 오류·취소',ORDER_QUEUE:'주문 대기',ORDERING:'계산 중',COOK_QUEUE:'제조 대기',COOKING:'제조 중'};
function receiptCsv(report){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\ufeff'+[['주문 ID','팀','고객 ID','메뉴','수량','주문액','접수 tick','결제 tick','완료 tick','상태','결제액','환불','보관금','확정 매출'],...report.receipts.map(r=>[r.id,String.fromCharCode(65+r.team),r.customer,r.menu,r.quantity,r.price,r.joined,r.paidAt,r.completedAt,states[r.state]||r.state,r.paid,r.refunded,r.escrow,r.revenue])].map(r=>r.map(q).join(',')).join('\r\n');}
const api={analyze,csv,names,states,receiptCsv};if(typeof module!=='undefined')module.exports=api;root.FoodtruckReport=api;
})(typeof globalThis!=='undefined'?globalThis:this);

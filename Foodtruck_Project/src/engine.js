/* Foodtruck 0.3 teaching prototype. Pure discrete-time engine; no DOM or timers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Foodtruck = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '0.16.0';
  const DEFAULT_HORIZON = 300;
  const MENUS = Object.freeze([
    Object.freeze({ id: 1, name: '빠른 메뉴', price: 4000, cookTime: 2, weight: 5 }),
    Object.freeze({ id: 2, name: '보통 메뉴', price: 6000, cookTime: 3, weight: 3 }),
    Object.freeze({ id: 3, name: '고급 메뉴', price: 9000, cookTime: 5, weight: 2 })
  ]);
  const LEGACY_MENUS = Object.freeze(MENUS.map(m=>Object.freeze({...m,cookTime:[2,4,7][m.id-1]})));
  const BALANCE = Object.freeze({waitDivisor:8,waitPenalty:.015});
  const copy = value => JSON.parse(JSON.stringify(value));
  function freeze(value) { Object.freeze(value); for (const v of Object.values(value)) if(v && typeof v === 'object' && !Object.isFrozen(v)) freeze(v); return value; }
  // Engine records remain mutable. Only detached, frozen copies can be shared by
  // historical frames, including nested interests and user-supplied schedule data.
  function sameValue(value, saved) {
    if (value === saved) return true;
    if (!value || !saved || typeof value !== 'object' || typeof saved !== 'object') return false;
    const keys = Object.keys(value);
    return keys.length === Object.keys(saved).length && keys.every(key => Object.prototype.hasOwnProperty.call(saved,key) && sameValue(value[key],saved[key]));
  }
  function shareRecords(records, previous = []) {
    return Object.freeze(records.map((record,index) => sameValue(record,previous[index]) ? previous[index] : freeze(copy(record))));
  }
  function stateOf(sim) {
    return {version:VERSION,now:sim.now,horizon:sim.horizon,teamCount:sim.teamCount,...(sim.mirror?{mirror:true}:{}),demandMode:sim.demandMode,traffic:sim.traffic,ruleset:sim.ruleset,totalArrived:sim.totalArrived,finished:sim.finished,customers:sim.customers,trucks:sim.trucks,orders:sim.orders};
  }
  // Each v2 frame keeps its ordinary metadata/trucks, while customers/orders are
  // {length, changes:[[arrayIndex, completeRecord], ...]}. Missing indices reuse
  // the previous frame's records; the first frame supplies every index.
  function compactFrames(frames) {
    let previous;
    return frames.map(frame => {
      const packed = {...frame};
      for (const key of ['customers','orders']) {
        const before = previous?.[key] || [];
        packed[key] = {length:frame[key].length,changes:[]};
        frame[key].forEach((record,index) => { if (record !== before[index]) packed[key].changes.push([index,record]); });
      }
      previous = frame;
      return copy(packed);
    });
  }
  // Pure replay decoding: never invokes strategies, mutates its input, or needs
  // the seed. Restored v2 frames share immutable records, just like live history.
  function restoreReplay(replay) {
    if (!replay || !Array.isArray(replay.frames)) throw Error('Invalid replay frames');
    if (replay.schema === 'foodtruck-replay-v1') return copy(replay);
    if (replay.schema !== 'foodtruck-replay-v2' || replay.encoding !== 'entity-deltas-v1') throw Error('Unsupported replay format');
    let previous;
    const frames = replay.frames.map(frame => {
      const restored = copy(frame);
      for (const key of ['customers','orders']) {
        const delta = frame[key];
        if (!delta || !Number.isSafeInteger(delta.length) || delta.length < 0 || !Array.isArray(delta.changes)) throw Error('Invalid replay entity delta');
        const records = (previous?.[key] || []).slice(0,delta.length), seen = new Set();
        // Validate supplied indices before growing an array from untrusted JSON.
        for (const change of delta.changes) {
          if (!Array.isArray(change) || change.length !== 2) throw Error('Invalid replay entity change');
          const [index,record] = change;
          if (!Number.isInteger(index) || index < 0 || index >= delta.length || seen.has(index) || !record || typeof record !== 'object' || Array.isArray(record)) throw Error('Invalid replay entity change');
          seen.add(index);
        }
        if (delta.length > records.length + seen.size) throw Error('Incomplete replay entity delta');
        for (const [index,record] of delta.changes) records[index] = freeze(copy(record));
        if (records.length !== delta.length || Object.keys(records).length !== delta.length) throw Error('Incomplete replay entity delta');
        restored[key] = Object.freeze(records);
      }
      previous = freeze(restored);
      return previous;
    });
    const {encoding,frames:ignored,...metadata} = replay;
    return {...copy(metadata),schema:'foodtruck-replay-v1',frames};
  }
  function random(seed, ...keys) {
    const text = JSON.stringify([String(seed), ...keys]); let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function generateCustomers(seed, horizon, count) {
    return Array.from({ length: count }, (_, id) => {
      const layer = random(seed, id, 'layer');
      const type = layer < .5 ? 0 : layer < .85 ? 1 : 2;
      const ranges = [[4000, 6000, .3], [6000, 9000, .5], [9000, 12000, .7]];
      const [lo, hi, probability] = ranges[type];
      const arrival = horizon === 1 || id < Math.min(30, count) ? 0 : 1 + Math.floor(random(seed, id, 'arrival') * Math.max(1, horizon - 5));
      return { id, arrival, budget: lo + Math.floor(random(seed, id, 'budget') * (hi - lo + 1)), probability, type };
    }).sort((a,b) => a.arrival - b.arrival || a.id - b.id);
  }
  // Route coordinates are independent of animation frames and renderer state.
  function customerX(customer, time) {
    return Math.max(40, Math.min(1160, customer.routeStart + customer.routeDirection * customer.routeSpeed * Math.max(0, time - customer.arrival)));
  }
  function continuousCustomer(seed, id, arrival) {
    const layer = random(seed, id, 'layer');
    const type = layer < .5 ? 0 : layer < .85 ? 1 : 2;
    const [lo, hi, probability] = [[4000,6000,.3],[6000,9000,.5],[9000,12000,.7]][type];
    const routeDirection = random(seed, id, 'routeDirection') < .5 ? 1 : -1;
    const routeStart = arrival === 0 ? 40 + random(seed, id, 'routeStart') * 1120 : routeDirection === 1 ? 40 : 1160;
    const routeSpeed = 80;
    const distance = routeDirection === 1 ? 1160 - routeStart : routeStart - 40;
    return {id, arrival, budget:lo + Math.floor(random(seed,id,'budget') * (hi-lo+1)), probability, type,
      routeStart, routeDirection, routeSpeed, residenceTicks:Math.max(4,Math.min(14,Math.ceil(distance / routeSpeed)))};
  }
  class Simulation {
    constructor(options = {}) {
      this.seed = String(options.seed ?? '2026');
      this.teamCount = options.teamCount ?? 3;
      this.mirror = options.mirror === true;
      if (![2,3].includes(this.teamCount)) throw Error('teamCount must be 2 or 3');
      this.demandMode = options.demandMode ?? 'fixed';
      this.horizon = options.horizon ?? (this.demandMode === 'continuous' ? DEFAULT_HORIZON : 120);
      if (!['fixed','continuous'].includes(this.demandMode)) throw Error('demandMode must be fixed or continuous');
      this.ruleset = options.ruleset ?? (this.demandMode === 'continuous' ? 'balanced' : 'legacy');
      if (!['balanced','legacy','basket'].includes(this.ruleset)) throw Error('ruleset must be balanced, legacy or basket');
      this.menus = this.ruleset !== 'legacy' ? MENUS : LEGACY_MENUS;
      this.traffic = options.traffic ?? 'busy';
      if (options.arrivalCounts !== undefined) {
        if (this.demandMode !== 'continuous' || !Array.isArray(options.arrivalCounts) || options.arrivalCounts.length !== this.horizon || options.arrivalCounts.some(x=>!Number.isInteger(x)||x<0||x>80)) throw Error('Invalid arrival counts');
        this.arrivalCounts = options.arrivalCounts.slice();
      }
      this.phaseAt = options.phaseAt?.slice();
      if (this.demandMode === 'continuous' && !['busy','steady','quiet'].includes(this.traffic)) throw Error('traffic must be busy, steady or quiet');
      if (this.demandMode === 'continuous' && options.customers !== undefined) throw Error('continuous demand does not accept a fixed customer schedule');
      const count = options.customerCount ?? 90;
      if (!Number.isInteger(this.horizon) || this.horizon < 1 || this.horizon > 1000) throw Error('horizon must be 1..1000');
      if (this.demandMode === 'fixed' && (!Number.isInteger(count) || count < 0 || count > 1000)) throw Error('customerCount must be 0..1000');
      this.captureHistory = options.captureHistory !== false;
      this.now = 0; this.finished = false; this.customers = []; this.orders = [];
      this.events = []; this.history = []; this.nextOrderId = 0;
      this.totalArrived = 0; this.lastArrivalTick = -1;
      this.schedule = this.demandMode === 'continuous' ? [] : options.customers ? copy(options.customers) : generateCustomers(this.seed, this.horizon, count);
      const seen = new Set();
      for (const c of this.schedule) {
        if (!Number.isInteger(c.id) || seen.has(c.id) || !Number.isInteger(c.arrival) || c.arrival < 0 || c.arrival >= this.horizon || !Number.isFinite(c.budget) || c.budget < 0 || !Number.isFinite(c.probability) || c.probability < 0 || c.probability > 1) throw Error('Invalid customer schedule');
        seen.add(c.id);
      }
      this.schedule.sort((a,b)=>a.arrival-b.arrival || a.id-b.id);
      this.scheduleIndex = 0;
      this.trucks = Array.from({length:this.teamCount}, (_,id) => ({id, revenue:0, escrow:0, served:0, refunded:0, unfinished:0, status:'OK', error:null,
        workers:[0,1].map(id=>({id, task:null})), metrics:{PROMOTE:0, TAKE_ORDER:0, COOK:0, WAIT:0, queueWait:0, orderWait:0, starts:0}}));
      this.arrive(); this.record();
    }
    event(type, data={}) { this.events.push({time:this.now, type, ...data}); }
    arrive() {
      if (this.demandMode === 'continuous') {
        if (this.finished || this.now >= this.horizon || this.lastArrivalTick === this.now) return;
        this.lastArrivalTick = this.now;
        const count = this.arrivalCounts ? this.arrivalCounts[this.now] : this.teamCount === 2 ? (this.now === 0 ? 40 : (this.traffic === 'busy' ? 3 : this.traffic === 'steady' ? 2 : 1) + Math.floor(random(this.seed, 'flow', this.now, 'count') * (this.traffic === 'busy' ? 3 : this.traffic === 'steady' ? 2 : 1))) : this.now === 0 ? 60 : (this.traffic === 'busy' ? 5 : this.traffic === 'steady' ? 3 : 1) + Math.floor(random(this.seed, 'flow', this.now, 'count') * (this.traffic === 'busy' ? 4 : this.traffic === 'steady' ? 3 : 2));
        for (let i=0; i<count; i++) {
          const base = continuousCustomer(this.seed, this.totalArrived++, this.now);
          if(this.ruleset==='basket'){const ranges=[[4000,9000],[9000,18000],[18000,27000]], [lo,hi]=ranges[base.type];base.budget=lo+Math.floor(random(this.seed,base.id,'budget')*(hi-lo+1));}
          if(this.mirror){base.routeStart=1200-base.routeStart;base.routeDirection=-base.routeDirection;}
          this.customers.push({...base, interest:Array(this.teamCount).fill(0), state:'WALK', truckId:null, orderId:null, leftAt:null});
        }
        return;
      }
      while (this.scheduleIndex < this.schedule.length && this.schedule[this.scheduleIndex].arrival <= this.now) {
        const base=this.schedule[this.scheduleIndex++]; this.totalArrived++;
        this.customers.push({...base, interest:Array(this.teamCount).fill(0), state:'WALK', truckId:null, orderId:null, leftAt:null});
      }
    }
    waiting(tid, state) { return this.orders.filter(o=>o.truckId===tid && o.state===state); }
    workloads() {
      const loads = Array(this.teamCount).fill(0);
      for (const o of this.orders) {
        if (!['ORDER_QUEUE','TAKING','COOK_QUEUE','COOKING'].includes(o.state)) continue;
        const task = o.state === 'COOKING' ? this.trucks[o.truckId].workers.find(w=>w.task?.type==='COOK' && w.task.orderId===o.id)?.task : null;
        loads[o.truckId] += task ? Math.max(0,task.finish-this.now) : o.cookTime;
      }
      return loads;
    }
    observation(tid) {
      const truck = this.trucks[tid];
      return freeze(copy({now:this.now, horizon:this.horizon, truckId:tid, menus:this.menus, ruleset:this.ruleset, ...(this.phaseAt ? {trafficLevel:this.phaseAt[Math.min(this.now,this.horizon-1)], trafficChanged:this.now>0&&this.now<this.horizon&&this.phaseAt[this.now]!==this.phaseAt[this.now-1]} : {}), ...(this.ruleset==='basket'?{serviceTicks:2,maxItems:3}:{}), workload:this.workloads()[tid], workers:truck.workers,
        orderQueue:this.waiting(tid,'ORDER_QUEUE'), cookQueue:this.waiting(tid,'COOK_QUEUE'),
        customers:this.customers.filter(c=>c.state==='WALK').map(c=>({id:c.id,budget:c.budget,probability:c.probability,interest:c.interest[tid],age:this.now-c.arrival,...(this.demandMode==='continuous'?{x:customerX(c,this.now)}:{})})),
        revenue:truck.revenue, escrow:truck.escrow}));
    }
    validate(tid, actions) {
      if (!Array.isArray(actions) || actions.length!==2) throw Error('두 직원의 행동 배열이 필요합니다.');
      const truck=this.trucks[tid], zones=new Set(), ids=new Set(), result=[];
      for(const w of truck.workers) if(w.task) zones.add(w.task.type);
      for(let i=0;i<2;i++) {
        const a=actions[i], w=truck.workers[i];
        if (!a || typeof a!=='object' || !['KEEP','WAIT','PROMOTE','TAKE_ORDER','COOK'].includes(a.type)) throw Error('알 수 없는 행동');
        if(w.task) { if(a.type!=='KEEP') throw Error('진행 중 작업은 KEEP으로 유지해야 합니다.'); result.push(a); continue; }
        if(a.type==='KEEP') throw Error('빈 직원은 KEEP할 수 없습니다.');
        if(a.type==='WAIT') { result.push({type:'WAIT'}); continue; }
        if(zones.has(a.type)) throw Error('같은 작업 구역에 두 직원을 배치할 수 없습니다.');
        zones.add(a.type);
        if(a.type!=='PROMOTE') {
          const o=this.orders.find(o=>o.id===a.orderId && o.truckId===tid);
          const state=a.type==='COOK'?'COOK_QUEUE':'ORDER_QUEUE';
          if(!o || o.state!==state || ids.has(o.id)) throw Error('현재 대기열에 없는 주문 또는 중복 주문');
          ids.add(o.id);
        }
        result.push({type:a.type,...(a.orderId!==undefined?{orderId:a.orderId}:{})});
      }
      return result;
    }
    stopTruck(tid, message) {
      const truck=this.trucks[tid]; truck.status='ERROR'; truck.error=String(message).slice(0,240);
      truck.refunded+=truck.escrow; truck.escrow=0;
      for(const o of this.orders.filter(o=>o.truckId===tid && o.state!=='SERVED')) {
        o.state='CANCELLED'; const c=this.customers.find(c=>c.id===o.customerId); c.state='CANCELLED'; c.leftAt=this.now;
      }
      truck.workers.forEach(w=>w.task=null); this.event('ERROR',{truckId:tid,message:truck.error});
    }
    // UI/batch callers may skip an unused detached result; history and all rules
    // are identical. The original no-option snapshot return remains compatible.
    step(strategies, options={}) {
      if(this.finished) return options.snapshot===false ? undefined : this.snapshot();
      if(!Array.isArray(strategies)||strategies.length!==this.teamCount) throw Error('Exactly '+this.teamCount+' strategies required');
      // All views are captured before any plan is applied.
      const views=this.trucks.map(t=>this.observation(t.id));
      const plans=this.trucks.map((t,i)=>{
        if(t.status!=='OK') return null;
        try { return this.validate(i, strategies[i](views[i])); }
        catch(e) { return {error:e?.message||String(e)}; }
      });
      for(let tid=0;tid<this.teamCount;tid++) {
        const t=this.trucks[tid], plan=plans[tid];
        if(!plan) continue;
        if(plan.error) {this.stopTruck(tid,plan.error); continue;}
        for(let i=0;i<2;i++) {
          const w=t.workers[i], a=plan[i];
          if(a.type==='KEEP') continue;
          if(a.type==='WAIT') continue;
          const o=a.orderId===undefined?null:this.orders.find(o=>o.id===a.orderId);
          const duration=a.type==='COOK'?o.cookTime:(this.ruleset==='basket'?(a.type==='PROMOTE'?3:2):1);
          w.task={type:a.type, orderId:o?o.id:null, start:this.now, finish:this.now+duration};
          if(o) {
            o.state=a.type==='COOK'?'COOKING':'TAKING';
            const c=this.customers.find(c=>c.id===o.customerId); c.state=o.state;
            if(a.type==='TAKE_ORDER') {t.metrics.queueWait+=this.now-o.joined; t.metrics.starts++;}
            if(a.type==='COOK') t.metrics.orderWait+=this.now-o.paidAt;
          }
          this.event('START',{truckId:tid,workerId:i,taskType:w.task.type,orderId:w.task.orderId,start:w.task.start,finish:w.task.finish});
        }
      }
      // Work occupies [t,t+1). Promotion only touches uncommitted empty-handed NPCs.
      for(const t of this.trucks) {
        for(const w of t.workers) { t.metrics[w.task?.type||'WAIT']++; w.lastWork = w.task ? {...w.task} : {type:'WAIT',start:this.now,finish:this.now+1}; }
        if(t.status==='OK' && t.workers.some(w=>w.task?.type==='PROMOTE' && (this.ruleset!=='basket'||w.task.finish===this.now+1))) {
          for(const c of this.customers) if(c.state==='WALK' && (this.demandMode !== 'continuous' || Math.abs(customerX(c,this.now+.5)-(this.teamCount===2?[300,900]:[200,600,1000])[t.id])<=220)) c.interest[t.id]=Math.min(4,c.interest[t.id]+1);
        }
      }
      this.now++;
      // Completion at H counts; no actions or purchase decisions begin at H.
      for(const t of this.trucks) for(const w of t.workers) {
        if(!w.task || w.task.finish>this.now) continue;
        const task=w.task; const o=task.orderId===null?null:this.orders.find(o=>o.id===task.orderId);
        if(task.type==='TAKE_ORDER') {
          o.state='COOK_QUEUE'; o.paidAt=this.now; t.escrow+=o.price;
          this.customers.find(c=>c.id===o.customerId).state='COOK_QUEUE';
        } else if(task.type==='COOK') {
          o.state='SERVED'; o.completedAt=this.now; t.escrow-=o.price; t.revenue+=o.price; t.served++;
          const c=this.customers.find(c=>c.id===o.customerId); c.state='SERVED'; c.leftAt=this.now;
          this.event('SALE',{truckId:t.id,orderId:o.id,price:o.price});
        }
        w.task=null;
      }
      if(this.now===this.horizon) this.close();
      else {this.decide(); this.arrive();}
      this.record(); return options.snapshot===false ? undefined : this.snapshot();
    }
    decide() {
      // One aggregate per truck, not a path search or per-customer simulation.
      // Unaccepted orders count too; parking expensive orders cannot hide the queue.
      const loads = this.workloads();
      for(const c of this.customers.filter(c=>c.state==='WALK' && this.now-c.arrival>=(this.demandMode==='continuous'?c.residenceTicks:4))) {
        const available=this.trucks.filter(t=>t.status==='OK');
        if(!available.length) {c.state='LEFT'; c.leftAt=this.now;continue;}
        const values=available.map(t=>c.interest[t.id]-(this.ruleset!=='legacy'?loads[t.id]/BALANCE.waitDivisor:0));
        const max=Math.max(...values);
        const ties=available.filter((t,i)=>values[i]===max);
        const tieIndex=Math.floor(random(this.seed,c.id,'tie')*ties.length);
        const tid=ties[this.mirror?ties.length-1-tieIndex:tieIndex].id;
        const probability=Math.max(0,Math.min(.95,c.probability+.08*c.interest[tid]-(this.ruleset!=='legacy'?loads[tid]*BALANCE.waitPenalty:0)));
        const menus=this.menus.filter(m=>m.price<=c.budget);
        if(!menus.length || random(this.seed,c.id,'purchase')>=probability) {c.state='LEFT';c.leftAt=this.now;continue;}
        let pick=random(this.seed,c.id,'menu')*menus.reduce((s,m)=>s+m.weight,0), menu=menus[0];
        for(const m of menus) {pick-=m.weight;if(pick<0){menu=m;break;}}
        const items=[{menuId:menu.id,price:menu.price,cookTime:menu.cookTime}];
        if(this.ruleset==='basket') {
          const wanted=1+Math.floor(random(this.seed,c.id,'basket-size')*3);
          let budget=c.budget-menu.price;
          for(let n=1;n<wanted;n++) {
            const affordable=this.menus.filter(m=>m.price<=budget);if(!affordable.length)break;
            let draw=random(this.seed,c.id,'basket-menu',n)*affordable.reduce((a,m)=>a+m.weight,0),chosen=affordable[0];
            for(const m of affordable){draw-=m.weight;if(draw<0){chosen=m;break;}}
            items.push({menuId:chosen.id,price:chosen.price,cookTime:chosen.cookTime});budget-=chosen.price;
          }
        }
        const price=items.reduce((a,m)=>a+m.price,0),cookTime=items.reduce((a,m)=>a+m.cookTime,0);
        const o={id:this.nextOrderId++,customerId:c.id,truckId:tid,menuId:menu.id,price,cookTime,...(this.ruleset==='basket'?{items,quantity:items.length,label:items.map(m=>'메뉴'+m.menuId).join(' + ')}:{}),joined:this.now,paidAt:null,completedAt:null,state:'ORDER_QUEUE'};
        loads[tid]+=cookTime;this.orders.push(o);c.truckId=tid;c.orderId=o.id;c.state='ORDER_QUEUE';
        this.event('JOIN',{truckId:tid,customerId:c.id,orderId:o.id});
      }
    }
    close() {
      this.finished=true;
      for(const t of this.trucks) {
        t.unfinished=this.orders.filter(o=>o.truckId===t.id && o.state!=='SERVED').length;
        t.refunded+=t.escrow;t.escrow=0;
        t.workers.forEach(w=>w.task=null);
      }
      for(const o of this.orders) if(!['SERVED','CANCELLED'].includes(o.state)) {o.state='UNFINISHED';const c=this.customers.find(c=>c.id===o.customerId);c.state='UNFINISHED';}
      for(const c of this.customers) if(c.state==='WALK'){c.state='LEFT';c.leftAt=this.now;}
      this.event('CLOSE');
    }
    snapshot() { return copy(stateOf(this)); }
    record() {
      if (!this.captureHistory) return;
      const previous = this.history[this.history.length-1];
      this.history.push(freeze({...stateOf(this),customers:shareRecords(this.customers,previous?.customers),trucks:copy(this.trucks),orders:shareRecords(this.orders,previous?.orders)}));
    }
    run(strategies) {while(!this.finished)this.step(strategies,{snapshot:false});return this.snapshot();}
    export(strategyNames=[], options={}) {
      return {schema:options.compact?'foodtruck-replay-v2':'foodtruck-replay-v1',...(options.compact?{encoding:'entity-deltas-v1'}:{}),version:VERSION,seed:this.seed,horizon:this.horizon,teamCount:this.teamCount,...(this.mirror?{mirror:true}:{}),demandMode:this.demandMode,traffic:this.traffic,ruleset:this.ruleset,totalArrived:this.totalArrived,strategyNames,frames:options.compact?compactFrames(this.history):copy(this.history),events:copy(this.events)};
    }
  }
  function makePolicy(mode='fcfs', options={}) {
    return view => {
      const plan=view.workers.map(w=>({type:w.task?'KEEP':'WAIT'}));
      const occupied=new Set(view.workers.filter(w=>w.task).map(w=>w.task.type));
      const available=()=>plan.findIndex((p,i)=>p.type==='WAIT'&&!view.workers[i].task);
      let cook=[...view.cookQueue];
      if(mode==='sjf')cook.sort((a,b)=>a.cookTime-b.cookTime||a.id-b.id);
      if(mode==='ratio')cook.sort((a,b)=>b.price/b.cookTime-a.price/a.cookTime||a.id-b.id);
      if(mode==='deadline')cook=cook.filter(o=>o.cookTime<=view.horizon-view.now).sort((a,b)=>b.price-a.price||a.id-b.id);
      if(cook.length&&!occupied.has('COOK')&&available()>=0) {plan[available()]={type:'COOK',orderId:cook[0].id};occupied.add('COOK');}
      let orders=[...view.orderQueue];
      if(mode==='deadline')orders=orders.filter(o=>o.cookTime+(view.serviceTicks||1)<=view.horizon-view.now);
      if(orders.length&&!occupied.has('TAKE_ORDER')&&available()>=0) {plan[available()]={type:'TAKE_ORDER',orderId:orders[0].id};occupied.add('TAKE_ORDER');}
      const limit=options.queueLimit??(mode==='threshold'?3:Infinity);
      if(view.cookQueue.length+view.orderQueue.length<limit&&!occupied.has('PROMOTE')&&available()>=0&&view.now+4<view.horizon)plan[available()]={type:'PROMOTE'};
      return plan;
    };
  }
  // Teaching example: protect a small cooking buffer, then use a free worker
  // for promotion instead of accepting every waiting order immediately.
  function makeBufferPolicy(limit=2) {
    return view => {
      const plan=view.workers.map(w=>({type:w.task?'KEEP':'WAIT'}));
      const occupied=new Set(view.workers.filter(w=>w.task).map(w=>w.task.type));
      const empty=()=>plan.findIndex((p,i)=>p.type==='WAIT'&&!view.workers[i].task);
      let ready=view.cookQueue.reduce((sum,o)=>sum+o.cookTime,0);
      let remaining=Math.max(0,...view.workers.filter(w=>w.task?.type==='COOK').map(w=>w.task.finish-view.now));
      const assign=(type,order)=>{
        if(occupied.has(type)||empty()<0)return false;
        plan[empty()]={type,...(order?{orderId:order.id}:{})};occupied.add(type);return true;
      };
      if(view.cookQueue.length&&!occupied.has('COOK')&&empty()>=0) {
        const order=view.cookQueue[0];assign('COOK',order);ready-=order.cookTime;remaining=order.cookTime;
      }
      const promote=()=>view.now+4<view.horizon&&assign('PROMOTE');
      if(ready>=limit||remaining>=3)promote();
      if(view.orderQueue.length)assign('TAKE_ORDER',view.orderQueue[0]);
      promote();return plan;
    };
  }
  const POLICIES={buffer:makeBufferPolicy(),fcfs:makePolicy('fcfs'),sjf:makePolicy('sjf'),ratio:makePolicy('ratio'),deadline:makePolicy('deadline'),threshold:makePolicy('threshold')};
  function benchmark(names=['fcfs','sjf','deadline'], seeds=['2026','2027','2028','2029','2030'], options={}) {
    if (![2,3].includes(names.length)) throw Error('Two or three strategy names required');
    const teamCount=options.teamCount??names.length;
    if(teamCount!==names.length) throw Error('teamCount and strategy names mismatch');
    const permutations=teamCount===2?[[0,1],[1,0]]:[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
    const rows=[];
    for(const seed of seeds)for(const seats of permutations)for(const mirror of (options.pairedMirrors?[false,true]:[options.mirror===true])) {
      const sim=new Simulation({...options,teamCount,seed,mirror,captureHistory:false});sim.run(seats.map(i=>POLICIES[names[i]]));
      for(let slot=0;slot<teamCount;slot++){const t=sim.trucks[slot];rows.push({seed,...(options.pairedMirrors?{mirror}:{}),permutation:seats.join(''),seat:slot,entry:seats[slot],strategy:names[seats[slot]],revenue:t.revenue,served:t.served,unfinished:t.unfinished,status:t.status});}
    }
    return {version:VERSION,seeds,games:seeds.length*permutations.length*(options.pairedMirrors?2:1),rows,summary:names.map((name,entry)=>{const r=rows.filter(r=>r.entry===entry),values=r.map(r=>r.revenue);return {entry,strategy:name,mean:Math.round(values.reduce((a,b)=>a+b,0)/r.length),min:Math.min(...values),max:Math.max(...values),failures:r.filter(r=>r.status!=='OK').length};})};
  }
  return {VERSION,DEFAULT_HORIZON,MENUS,LEGACY_MENUS,BALANCE,Simulation,POLICIES,makePolicy,makeBufferPolicy,benchmark,random,customerX,restoreReplay};
});

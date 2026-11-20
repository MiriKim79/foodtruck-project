'use strict';
const {random,DEFAULT_HORIZON}=require('./engine');
const RULE_ID='foodtruck-0.16-fixed-235-flow-40-80';
const BOUNDS=Object.freeze([0,40,120,200,280,300]);
const WEIGHT=Object.freeze({quiet:1,steady:3,busy:5});
const LABEL=Object.freeze({quiet:'한산',steady:'보통',busy:'혼잡'});
function competition(seed) {
 const phases=['steady'];
 for(const tick of BOUNDS.slice(1,-1)){
  const choices=Object.keys(WEIGHT).filter(x=>x!==phases[phases.length-1]);
  phases.push(choices[Math.floor(random(seed,'competition-flow-016',tick)*choices.length)]);
 }
 const phaseAt=[];
 for(let i=0;i<phases.length;i++)for(let t=BOUNDS[i];t<BOUNDS[i+1];t++)phaseAt.push(phases[i]);
 const divisor=phaseAt.slice(40).reduce((sum,level)=>sum+WEIGHT[level],0);
 let cumulative=0;
 const arrivalCounts=phaseAt.map((level,tick)=>{
  if(tick<40)return tick===0?40:3;
  const before=cumulative;cumulative+=WEIGHT[level];
  return Math.floor(cumulative*780/divisor)-Math.floor(before*780/divisor);
 });
 const phaseEvents=phases.map((trafficLevel,i)=>({tick:BOUNDS[i],trafficLevel,text:i?'혼잡도 변경: '+LABEL[trafficLevel]:'경기 시작: '+LABEL[trafficLevel]}));
 return {settings:{horizon:DEFAULT_HORIZON,teamCount:2,ruleset:'basket',demandMode:'continuous',traffic:'steady',phaseAt,arrivalCounts},phaseEvents,closingTick:240};
}
module.exports={RULE_ID,competition};

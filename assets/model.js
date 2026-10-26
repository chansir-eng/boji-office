(function(root){
'use strict';
const massIndex=(ffm,h)=>ffm/(h*h)+6.3*(1.8-h); // coefficient from Kouri 1995 abstract
const requiredLean=(targetFFMI,h)=>(targetFFMI-6.3*(1.8-h))*h*h;
const params=[{id:'slow',name:'保守',rate:.004,leanShare:.10,monthly:{new:.20,return:.15,trained:.07}},{id:'mid',name:'中心',rate:.006,leanShare:.05,monthly:{new:.35,return:.28,trained:.13}},{id:'fast',name:'较快',rate:.008,leanShare:0,monthly:{new:.50,return:.40,trained:.22}}];
// Weekly percentage slows when body fat declines; all scalars are modeling assumptions.
function weeklyRate(base,bf){let factor=bf>28?1:bf>22?.95:bf>18?.88:bf>15?.77:.62;return Math.min(.009,base*factor);}
function simulate(input,p){let{height:h,weight:w,bf,experience,targetBF,targetFFMI,sessions}=input;let fat=w*bf/100,lean=w-fat;const initial={w,fat,lean,bf};const goalLean=requiredLean(targetFFMI,h);const hist=[{week:0,bf,w,lean,fat}];let cutWeeks=0,bulkWeeks=0,stalled=false;
// Phase A: remove fat to selected body-fat level; limit losses to remaining fat.
while(fat/(lean+fat)>targetBF/100+0.0001 && cutWeeks<520){let weekly=weeklyRate(p.rate,100*fat/(lean+fat));let lost=Math.min((fat+lean)*weekly,fat*.20);if(lost<=.0001)break;let leanLost=Math.min(lean*.005,lost*p.leanShare);let fatLost=Math.min(fat,lost-leanLost);lean-=leanLost;fat-=fatLost;cutWeeks++;hist.push({week:cutWeeks,bf:100*fat/(fat+lean),w:fat+lean,lean,fat});}
if(cutWeeks>=520)stalled=true;
// Phase B: grow FF mass at conservative scenario-specific constant approximation.
let growthPerWeek=(p.monthly[experience]||0)/4 * (sessions===2?.87:sessions>=4?1.04:sessions===3?1:0);
if(lean<goalLean-0.01 && growthPerWeek<=0)stalled=true;
while(!stalled && lean<goalLean-.01 && cutWeeks+bulkWeeks<520){let inc=Math.min(goalLean-lean,growthPerWeek);lean+=inc;fat+=inc*.08;bulkWeeks++;hist.push({week:cutWeeks+bulkWeeks,bf:100*fat/(fat+lean),w:lean+fat,lean,fat});}
if(cutWeeks+bulkWeeks>=520 && lean<goalLean-.01)stalled=true;
// Brief finishing adjustment only if needed (fat added in gaining stage).
let polishWeeks=0;
while(!stalled && fat/(lean+fat)>targetBF/100+.0001 && cutWeeks+bulkWeeks+polishWeeks<520){let lost=(lean+fat)*weeklyRate(p.rate,100*fat/(lean+fat));fat=Math.max(0,fat-lost);polishWeeks++;hist.push({week:cutWeeks+bulkWeeks+polishWeeks,bf:100*fat/(fat+lean),w:fat+lean,lean,fat});}
let weeks=cutWeeks+bulkWeeks+polishWeeks;
return {p,weeks,cutWeeks:cutWeeks+polishWeeks,bulkWeeks,initial,final:{w:lean+fat,bf:100*fat/(fat+lean),lean,fat},goalLean,stalled:stalled||weeks>=520,hist};}

const thinMuscleTarget=Object.freeze({targetBF:12,targetFFMI:20.5});
const model=Object.freeze({params,weeklyRate,simulate,massIndex,requiredLean,thinMuscleTarget});
if(typeof module==='object'&&module.exports)module.exports=model;
else root.BojiModel=model;
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){
'use strict';
const massIndex=(ffm,h)=>ffm/(h*h)+6.3*(1.8-h); // coefficient from Kouri 1995 abstract
const requiredLean=(targetFFMI,h)=>(targetFFMI-6.3*(1.8-h))*h*h;
const params=[
  {id:'slow',name:'审慎',rate:.004,leanShare:.10,monthly:{new:.20,return:.15,trained:.07}},
  {id:'mid',name:'中间',rate:.006,leanShare:.05,monthly:{new:.35,return:.28,trained:.13}},
  {id:'fast',name:'乐观',rate:.008,leanShare:0,monthly:{new:.50,return:.40,trained:.22}}
];
const limits=Object.freeze({minBMI:18.5,maxBMI:48,maxWeeks:520});
const EPSILON=1e-10, FAT_TOLERANCE=.0001, LEAN_TOLERANCE=.01;
// The small comparison tolerance prevents rounding noise from switching rate bands.
// All rates and composition shares remain explicit engineering assumptions.
function weeklyRate(base,bf){
  const above=threshold=>bf>threshold+EPSILON;
  const factor=above(28)?1:above(22)?.95:above(18)?.88:above(15)?.77:.62;
  return Math.min(.009,base*factor);
}
function simulate(input,p){
  const {height:h,weight:w,bf,age,experience,targetBF,targetFFMI,sessions}=input;
  const finite=[h,w,bf,targetBF,targetFFMI].every(Number.isFinite);
  let fat=finite?w*bf/100:0,lean=finite?w-fat:0;
  const initial={w:finite?w:0,fat,lean,bf:finite?bf:0};
  const goalLean=finite?requiredLean(targetFFMI,h):0;
  const hist=[{week:0,...initial}];
  let cutWeeks=0,bulkWeeks=0,polishWeeks=0,status=null,reason=null,blockedWeek=null,attemptedBMI=null;
  const validInput=finite&&h>=1.4&&h<=2.1&&w>=35&&w<=250&&bf>7&&bf<=55&&
    targetBF>0&&targetBF<100&&targetFFMI>0&&
    (age===undefined||(Number.isFinite(age)&&age>=18&&age<=65))&&
    ['new','return','trained'].includes(experience)&&Number.isInteger(sessions)&&(sessions===0||sessions>=2);
  const validParameters=p&&Number.isFinite(p.rate)&&p.rate>=0&&
    Number.isFinite(p.leanShare)&&p.leanShare>=0&&p.leanShare<=1&&
    p.monthly&&Number.isFinite(p.monthly[experience])&&p.monthly[experience]>=0;
  const initialBMI=finite?w/(h*h):0;
  if(!validInput){status='outside-domain';reason='invalid-input';}
  else if(!validParameters){status='outside-domain';reason='invalid-parameters';}
  else if(initialBMI<limits.minBMI-EPSILON||initialBMI>limits.maxBMI+EPSILON){
    status='outside-domain';reason='initial-bmi';attemptedBMI=initialBMI;
  }
  const totalWeeks=()=>cutWeeks+bulkWeeks+polishWeeks;
  const fatMet=()=>fat/(lean+fat)<=targetBF/100+FAT_TOLERANCE+EPSILON;
  const leanMet=()=>lean>=goalLean-LEAN_TOLERANCE-EPSILON;
  function advance(nextLean,nextFat){
    const nextBMI=(nextLean+nextFat)/(h*h);
    if(nextBMI<limits.minBMI-EPSILON){
      status='outside-domain';reason='trajectory-bmi';
      blockedWeek=totalWeeks()+1;attemptedBMI=nextBMI;
      return false;
    }
    lean=nextLean;fat=nextFat;
    return true;
  }
  function record(){hist.push({week:totalWeeks(),bf:100*fat/(fat+lean),w:fat+lean,lean,fat});}
  // Phase A: cap the final loss at the BF target while preserving the lean-loss rule.
  while(!status&&!fatMet()&&totalWeeks()<limits.maxWeeks){
    let lost=Math.min((fat+lean)*weeklyRate(p.rate,100*fat/(lean+fat)),fat*.20);
    if(lost<=.0001){status='unestimated';reason='fat-loss-unavailable';break;}
    const leanCap=lean*.005,leanLoss=amount=>Math.min(leanCap,amount*p.leanShare);
    const nextLean=lean-leanLoss(lost),nextFat=fat-(lost-leanLoss(lost));
    if(nextFat/(nextLean+nextFat)<targetBF/100){
      const target=targetBF/100,excess=fat-target*(lean+fat);
      const proportionalLoss=excess/(1-target-p.leanShare);
      const targetLoss=proportionalLoss>=0&&p.leanShare*proportionalLoss<=leanCap+EPSILON
        ?proportionalLoss:(excess+leanCap)/(1-target);
      lost=Math.min(lost,targetLoss);
    }
    const leanLost=leanLoss(lost),fatLost=lost-leanLost;
    if(!advance(lean-leanLost,Math.max(0,fat-fatLost)))break;
    cutWeeks++;record();
  }
  const postCutLean=lean,growthNeeded=Math.max(0,goalLean-postCutLean);
  if(!status&&!fatMet()){status='capped';reason='week-limit';}
  // Frequency alone does not justify a precise growth multiplier at >=2 sessions.
  const growthPerWeek=validParameters&&sessions>=2?p.monthly[experience]/4:0;
  if(!status&&!leanMet()&&growthPerWeek<=0){status='unestimated';reason='growth-unavailable';}
  while(!status&&!leanMet()&&totalWeeks()<limits.maxWeeks){
    const inc=Math.min(goalLean-lean,growthPerWeek);
    if(!advance(lean+inc,fat+inc*.08))break;
    bulkWeeks++;record();
  }
  if(!status&&!leanMet()){status='capped';reason='week-limit';}
  // General target support; at the fixed 12% BF goal gaining cannot raise BF.
  while(!status&&!fatMet()&&totalWeeks()<limits.maxWeeks){
    const targetFat=lean*(targetBF/100)/(1-targetBF/100);
    const lost=Math.min((lean+fat)*weeklyRate(p.rate,100*fat/(lean+fat)),fat-targetFat);
    if(lost<=.0001){status='unestimated';reason='fat-loss-unavailable';break;}
    if(!advance(lean,Math.max(0,fat-lost)))break;
    polishWeeks++;record();
  }
  // Reaching both references at exactly week 520 is still a completed simulation.
  if(!status){status=fatMet()&&leanMet()?'complete':'capped';reason=status==='complete'?'target-met':'week-limit';}
  const finalWeight=lean+fat;
  return {p,weeks:totalWeeks(),cutWeeks:cutWeeks+polishWeeks,bulkWeeks,initial,
    final:{w:finalWeight,bf:finalWeight?100*fat/finalWeight:0,lean,fat},
    goalLean,postCutLean,growthNeeded,growthPerWeek,status,reason,blockedWeek,attemptedBMI,
    stalled:status!=='complete',hist};
}
const thinMuscleTarget=Object.freeze({targetBF:12,targetFFMI:20.5});
const model=Object.freeze({params,weeklyRate,simulate,massIndex,requiredLean,thinMuscleTarget,limits});
if(typeof module==='object'&&module.exports)module.exports=model;
else root.BojiModel=model;
})(typeof globalThis!=='undefined'?globalThis:this);

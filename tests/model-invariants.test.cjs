'use strict';
// Numerical properties and regression cases: node tests/model-invariants.test.cjs
const assert=require('node:assert/strict');
const model=require('../assets/model.js');
const {params,simulate,massIndex,requiredLean,weeklyRate,thinMuscleTarget,limits}=model;
const base={height:1.75,weight:78,bf:24,age:28,experience:'new',sessions:3,...thinMuscleTarget};
const run=(patch={},p=params[1])=>simulate({...base,...patch},p);
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
let checks=0;
function test(name,check){check();checks++;console.log('PASS '+name);}

test('FFMI conversion and reference values preserve their meanings',()=>{
  for(const h of [1.4,1.75,2.1])for(const ffmi of [18,20.5,23])close(massIndex(requiredLean(ffmi,h),h),ffmi);
  assert.deepEqual(thinMuscleTarget,{targetBF:12,targetFFMI:20.5});
  assert.equal(Object.isFrozen(thinMuscleTarget),true);
  assert.deepEqual(params.map(p=>[p.id,p.name]),[['slow','审慎'],['mid','中间'],['fast','乐观']]);
  assert.deepEqual(params.map(p=>[p.rate,p.leanShare,p.monthly.new,p.monthly.return,p.monthly.trained]),[
    [.004,.1,.2,.15,.07],[.006,.05,.35,.28,.13],[.008,0,.5,.4,.22]
  ]);
});

test('default conditional simulations remain auditable after target crossing is capped',()=>{
  const input={...base},before=JSON.stringify(input),results=params.map(p=>simulate(input,p));
  assert.deepEqual(results.map(r=>[r.cutWeeks,r.bulkWeeks,r.weeks]),[[53,75,128],[33,36,69],[23,21,44]]);
  close(results[1].postCutLean,58.716144578313255);
  close(results[1].growthNeeded,3.1004179216867414);
  close(results[1].final.w,70.07134292168674);
  assert.ok(results.every(r=>r.status==='complete'&&!r.stalled));
  assert.equal(JSON.stringify(input),before);
});

test('rounding noise cannot switch rate bands or break proportional cut duration',()=>{
  for(const threshold of [15,18,22,28]){
    close(weeklyRate(.008,threshold),weeklyRate(.008,threshold+1e-12));
    close(weeklyRate(.008,threshold),weeklyRate(.008,threshold-1e-12));
    assert.ok(weeklyRate(.008,threshold+.001)>weeklyRate(.008,threshold));
  }
  const results=[86.3,86.4,90,100,120].map(weight=>run({weight,bf:28},params[2]));
  assert.deepEqual(results.map(r=>r.cutWeeks),[31,31,31,31,31]);
  assert.ok(results.every(r=>r.status==='complete'));
});

test('last cut step stops at the target and retains the scenario lean-loss share',()=>{
  for(const p of params){
    const r=run({weight:90,bf:12.1},p),last=r.hist.at(-1);
    assert.equal(r.weeks,1);close(last.bf,12);
    const loss=r.initial.w-last.w,leanLoss=r.initial.lean-last.lean;
    close(leanLoss,Math.min(r.initial.lean*.005,loss*p.leanShare));
    close(last.w,last.lean+last.fat);
  }
  // Exercise the capped-lean branch as well as the proportional branch.
  const p={...params[1],rate:.009,leanShare:.9};
  const r=run({weight:90,bf:12.1},p);
  assert.equal(r.status,'complete');close(r.final.bf,12);
  for(let i=1;i<r.hist.length;i++){
    const a=r.hist[i-1],b=r.hist[i],loss=a.w-b.w;
    close(a.lean-b.lean,Math.min(a.lean*.005,loss*p.leanShare));
  }
});

test('both targets reached on week 520 complete, and a target needing week 521 caps',()=>{
  const real=run({weight:59.9,bf:12,experience:'trained'},params[0]);
  assert.equal(real.weeks,520);assert.equal(real.status,'complete');assert.equal(real.stalled,false);
  assert.ok(real.final.lean>=real.goalLean-.01-1e-9);
  const input={...base,weight:70,bf:12},initialLean=input.weight*(1-input.bf/100);
  const p={...params[1],monthly:{...params[1].monthly,new:.4}};
  const exact=simulate({...input,targetFFMI:massIndex(initialLean+52,input.height)},p);
  assert.equal(exact.weeks,520);assert.equal(exact.status,'complete');close(exact.final.lean,exact.goalLean);
  const beyond=simulate({...input,targetFFMI:massIndex(initialLean+52.1,input.height)},p);
  assert.equal(beyond.weeks,520);assert.equal(beyond.status,'capped');assert.equal(beyond.reason,'week-limit');
  assert.ok(beyond.final.lean<beyond.goalLean-.01);
});

test('initial and prospective trajectory BMI guards have explicit status and no invalid history point',()=>{
  const initial=run({weight:50,bf:11.5,experience:'trained',sessions:4});
  assert.equal(initial.status,'outside-domain');assert.equal(initial.reason,'initial-bmi');assert.equal(initial.weeks,0);
  const route=run({weight:60,bf:38});
  assert.equal(route.status,'outside-domain');assert.equal(route.reason,'trajectory-bmi');
  assert.equal(route.weeks,9);assert.equal(route.blockedWeek,10);
  close(route.attemptedBMI,18.447562779628647);
  assert.ok(route.hist.every(q=>q.w/base.height**2>=limits.minBMI-1e-10));
  close(route.final.w,56.83668109920798);assert.equal(route.hist.at(-1).week,9);
  const exactBMI=run({weight:limits.minBMI*base.height**2,bf:12});
  assert.notEqual(exactBMI.reason,'initial-bmi');
});

test('no-training, missing growth, capped and completed paths stay distinct',()=>{
  const none=run({sessions:0}),zero=run({weight:60,bf:12,sessions:0});
  assert.equal(none.status,'unestimated');assert.equal(none.reason,'growth-unavailable');
  assert.equal(zero.status,'unestimated');assert.equal(zero.weeks,0);assert.equal(zero.stalled,true);
  const pureCut=run({weight:90,sessions:0});assert.equal(pureCut.status,'complete');assert.equal(pureCut.bulkWeeks,0);
  const atStart=run({weight:72,bf:12,sessions:0});assert.equal(atStart.status,'complete');assert.equal(atStart.weeks,0);
  const noGrowth=run({}, {...params[1],monthly:{...params[1].monthly,new:0}});assert.equal(noGrowth.status,'unestimated');
  for(const patch of [{height:NaN},{weight:0},{bf:60},{age:17},{sessions:1},{experience:'unknown'}])assert.equal(run(patch).status,'outside-domain');
});

test('actual post-cut deficit is exposed even if initial lean already meets its reference',()=>{
  const r=run({weight:82});
  assert.ok(r.initial.lean>=r.goalLean);assert.ok(r.postCutLean<r.goalLean);
  assert.ok(r.growthNeeded>0);assert.equal(r.bulkWeeks,1);
  assert.equal(run({weight:82,sessions:0}).status,'unestimated');
});

test('two, three and four sessions share assumptions; age does not imply a growth adjustment',()=>{
  const three=run();
  for(const sessions of [2,4,5])assert.deepEqual(run({sessions}),three);
  for(const age of [18,45,65])assert.deepEqual(run({age}),three);
  assert.equal(three.growthPerWeek,params[1].monthly.new/4);
});

test('75,060 scenario grid preserves mass, finite states, status and history invariants',()=>{
  let cases=0,complete=0;const statuses={complete:0,unestimated:0,capped:0,'outside-domain':0};
  for(const height of [1.4,1.5,1.6,1.75,1.9,2,2.1])for(let weight=35;weight<=250;weight+=5){
    if(weight/height**2<16||weight/height**2>48)continue;
    for(const bf of [7.1,8,10,11.9,12,12.01,12.02,12.1,15,18,22,28,35,45,55])
      for(const experience of ['new','return','trained'])for(const sessions of [0,2,3,4]){
        const input={...base,height,weight,bf,experience,sessions},results=params.map(p=>simulate(input,p));
        for(const r of results){
          cases++;assert.ok(Object.hasOwn(statuses,r.status));statuses[r.status]++;
          assert.equal(r.stalled,r.status!=='complete');assert.equal(r.weeks,r.cutWeeks+r.bulkWeeks);
          assert.equal(r.hist.length,r.weeks+1);assert.ok(r.weeks<=limits.maxWeeks);
          for(let index=0;index<r.hist.length;index++){
            const q=r.hist[index];assert.equal(q.week,index);
            for(const key of ['w','lean','fat','bf'])assert.ok(Number.isFinite(q[key])&&q[key]>=0);
            close(q.w,q.lean+q.fat);close(q.bf,100*q.fat/q.w);
            if(r.reason!=='initial-bmi')assert.ok(q.w/height**2>=limits.minBMI-1e-9);
            if(index){
              const a=r.hist[index-1],dl=q.lean-a.lean,df=q.fat-a.fat;
              if(dl>1e-9)close(df,.08*dl);
              else {assert.ok(df<=1e-9);close(a.lean-q.lean,Math.min(a.lean*.005,(a.w-q.w)*r.p.leanShare));}
            }
          }
          const last=r.hist.at(-1);for(const key of ['w','lean','fat','bf'])close(last[key],r.final[key]);
          const achieved=r.final.bf<=input.targetBF+.01000001&&r.final.lean>=r.goalLean-.01000001;
          if(r.status==='complete'){complete++;assert.ok(achieved);}
          if(r.status==='capped'){assert.equal(r.weeks,520);assert.equal(achieved,false);}
          if(r.reason==='trajectory-bmi'){assert.equal(r.blockedWeek,r.weeks+1);assert.ok(r.attemptedBMI<18.5);}
        }
        if(results.every(r=>r.status==='complete'))assert.ok(results[0].weeks>=results[1].weeks&&results[1].weeks>=results[2].weeks);
      }
  }
  assert.equal(cases,75060);assert.ok(complete>0);
  console.log('Grid summary '+JSON.stringify({cases,statuses}));
});
console.log(`${checks} model checks passed.`);

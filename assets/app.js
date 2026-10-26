(()=>{
'use strict';

const $=id=>document.getElementById(id);
const {params,simulate,massIndex,thinMuscleTarget}=globalThis.BojiModel;
const fmt=(number,digits=1)=>Number.isFinite(number)?number.toFixed(digits):'—';
const fields=['height','weight','bf','age','experience','sessions'];
const numericFields=['height','weight','bf','age'];
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let chartMetric='bf',lastResults=null,lastInput=null,updateTimer;

function getInput(){
  if(numericFields.some(id=>String($(id).value).trim()===''))return {err:'请输入有效参数：身高 140–210 cm、体重 35–250 kg、体脂 5%–55%、年龄 18–65 岁。'};
  const h=+$('height').value,w=+$('weight').value,bf=+$('bf').value,age=+$('age').value;
  const exp=$('experience').value,sessions=+$('sessions').value;
  if(![h,w,bf,age].every(Number.isFinite)||h<140||h>210||w<35||w>250||bf<5||bf>55||age<18||age>65)return {err:'请输入有效参数：身高 140–210 cm、体重 35–250 kg、体脂 5%–55%、年龄 18–65 岁。'};
  if(bf<=7)return {err:'当前体脂已处在非常低的区间，本模型不适合以进一步降低体脂为目标；请先进行专业评估。'};
  if(w/(h/100)**2<16||w/(h/100)**2>48)return {err:'当前体重与身高组合超出模型适用边界（BMI 16–48），请先咨询专业人士。'};
  return {height:h/100,weight:w,bf,age,experience:exp,sessions,...thinMuscleTarget};
}

function showError(message){
  $('error').textContent=message;
  $('error').classList.toggle('show',!!message);
}

function clearFieldErrors(){
  numericFields.forEach(id=>{
    const field=$(id);
    field.removeAttribute('aria-invalid');
    const descriptions=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!=='error');
    if(descriptions.length)field.setAttribute('aria-describedby',descriptions.join(' '));
    else field.removeAttribute('aria-describedby');
  });
}

function markInvalidInput(shouldFocus){
  const bounds={height:[140,210],weight:[35,250],bf:[5,55],age:[18,65]};
  let field=Object.keys(bounds).find(id=>{
    const value=String($(id).value).trim(),number=+value;
    return value===''||!Number.isFinite(number)||number<bounds[id][0]||number>bounds[id][1];
  });
  if(!field&&+$('bf').value<=7)field='bf';
  if(!field)field='weight';
  $(field).setAttribute('aria-invalid','true');
  const descriptions=new Set(($(field).getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
  descriptions.add('error');
  $(field).setAttribute('aria-describedby',[...descriptions].join(' '));
  if(shouldFocus)$(field).focus();
}

function targetMessage(mid,input,none,allDone){
  const gap=mid.goalLean-mid.initial.lean;
  if(none)return input.sessions===0?'当前训练条件不足以估算薄肌参考目标的完成时间。':'薄肌参考目标超出模型 520 周的模拟范围。';
  if(allDone)return '当前估算已满足薄肌参考目标。外观仍受围度、训练与测量误差影响。';
  if(input.bf<=input.targetBF&&gap>0)return '当前体脂已满足薄肌参考值，后续重点是增加去脂体重。';
  if(gap<=0)return '当前去脂体重已满足薄肌参考值，后续重点是降低体脂并保持肌量。';
  return '按薄肌参考目标，预计先降低体脂，再补足去脂体重。';
}

function renderAdvice(input,mid,allDone){
  const need=Math.max(0,mid.goalLean-mid.initial.lean),notes=[];
  if(allDone)notes.push('体脂与 FFMI 的数值达标不等于确定的视觉效果。');
  else{
    if(input.bf>input.targetBF)notes.push(`中心情景预计减脂 ${mid.cutWeeks} 周。`);
    if(need>.01)notes.push(`初始去脂体重距薄肌参考值约 ${fmt(need)} kg；减脂期间的损失可能增加后续补足量。`);
  }
  if(input.sessions===0&&need>.01)notes.push('未进行规律力量训练时，模型不估算去脂体重增长的完成时间。');
  if(input.bf>=35)notes.push('建议按月复核体重、腰围与体成分。');
  if(input.bf<=15)notes.push('当前体脂较低，继续减脂时应关注恢复与健康。');
  notes.push('情景估算不代表确定完成时间，可在 4–8 周后使用实际变化更新。');
  $('advice').textContent=notes.join(' ');
}

function renderResult(results,input,isExample){
  const mid=results[1],valid=results.filter(result=>!result.stalled);
  const allDone=results.every(result=>result.weeks===0),none=valid.length===0;
  const unestimated=result=>input.sessions===0&&result.stalled;
  const growthText=result=>unestimated(result)?'未估算':result.stalled?'超出范围':result.bulkWeeks+' 周';
  const totalText=result=>result.stalled?(unestimated(result)?'无法估算':'超出模拟范围'):result.weeks+'周';
  if(none)$('time').innerHTML=input.sessions===0?'无法估算 <small>当前条件</small>':'超出范围 <small>520 周上限</small>';
  else if(allDone)$('time').innerHTML='已达标 <small>薄肌参考目标</small>';
  else{
    const low=Math.min(...valid.map(result=>result.weeks)),high=Math.max(...valid.map(result=>result.weeks));
    $('time').innerHTML=fmt(low,0)+(low===high?'':'–'+fmt(high,0))+' <small>周</small>';
  }
  $('headline').textContent=targetMessage(mid,input,none,allDone);
  $('centralWeeks').textContent=mid.stalled?totalText(mid):allDone?'已达标':mid.weeks+' 周';
  $('cutWeeks').textContent=mid.cutWeeks+' 周';
  $('bulkWeeks').textContent=growthText(mid);
  $('resultStatus').textContent=isExample?'示例估算':'已更新';
  $('resultStatus').dataset.state=none?'unavailable':allDone?'complete':'ready';
  if($('formHint'))$('formHint').textContent=isExample?'已填入一组示例数据，可直接修改。':'修改参数后，估算会自动更新。';
  $('ffmiNow').textContent=fmt(massIndex(mid.initial.lean,input.height));
  $('leanMass').textContent=fmt(mid.initial.lean);
  $('targetWeight').textContent=mid.stalled?'—':fmt(mid.final.w)+' kg';
  $('compositionText').textContent=fmt(mid.initial.lean)+' / '+fmt(mid.initial.fat)+' kg';
  $('barLean').style.width=fmt(100-input.bf)+'%';
  $('barFat').style.width=fmt(input.bf)+'%';
  $('phaseSummary').textContent=`薄肌参考去脂体重 ${fmt(mid.goalLean)} kg`;
  $('scenarios').innerHTML=results.map((result,index)=>`<tr><td class="${index===1?'focus':''}">${result.p.name}</td><td>${result.cutWeeks}周</td><td>${growthText(result).replace(' 周','周')}</td><td class="${index===1?'focus':''}">${totalText(result)}</td></tr>`).join('');
  document.querySelectorAll('.photo-card').forEach(button=>button.setAttribute('aria-pressed',String(+button.dataset.bf===input.bf)));
  renderAdvice(input,mid,allDone);
}

function showUpdateFeedback(){
  const panel=$('results');
  clearTimeout(updateTimer);panel.classList.remove('is-updating');
  if(reducedMotion())return;
  panel.classList.add('is-updating');
  updateTimer=setTimeout(()=>panel.classList.remove('is-updating'),320);
}

function renderChart(){
  if(!lastResults)return;
  const results=lastResults,input=lastInput,s=$('chart'),isFat=chartMetric==='bf';
  const W=Math.max(260,Math.min(600,s.clientWidth||600)),mobile=W<420;
  const H=mobile?240:220,l=isFat?46:52,r=18,t=26,b=34,fontSize=mobile?12:11;
  const xIntervals=mobile?3:4,maxWeeks=Math.max(16,...results.map(result=>result.weeks));
  s.setAttribute('viewBox',`0 0 ${W} ${H}`);
  s.style.aspectRatio=`${W} / ${H}`;
  const all=results.flatMap(result=>result.hist.map(point=>point[chartMetric]));
  if(isFat)all.push(input.targetBF);
  const min=isFat?Math.max(5,Math.floor(Math.min(...all)/5)*5):Math.max(0,Math.floor(Math.min(...all)/5)*5-5);
  const max=isFat?Math.min(60,Math.ceil(Math.max(...all)/5)*5+5):Math.ceil(Math.max(...all)/5)*5+5;
  const coordX=value=>l+(W-l-r)*value/maxWeeks,coordY=value=>t+(H-t-b)*(max-value)/(max-min||1);
  const unit=isFat?'%':' kg';
  s.setAttribute('aria-label',isFat?'预计体脂变化：保守、中心和较快三种情景，虚线为薄肌参考体脂':'预计体重变化：保守、中心和较快三种情景');
  let output='<title>'+(isFat?'体脂变化情景':'体重变化情景')+'</title><desc>横轴为自然周。情景区间不是置信区间，无法保证个人达标时间。</desc>';
  for(let index=0;index<=4;index++){
    const value=min+(max-min)*index/4;
    output+=`<line x1="${l}" y1="${coordY(value)}" x2="${W-r}" y2="${coordY(value)}" stroke="#e0e2d8" stroke-width="1"/><text x="${l-9}" y="${coordY(value)+4}" text-anchor="end" fill="#626c5d" font-size="${fontSize}">${fmt(value,0)}${unit}</text>`;
  }
  for(let index=0;index<=xIntervals;index++){
    const week=maxWeeks*index/xIntervals;
    output+=`<text x="${coordX(week)}" y="${H-8}" text-anchor="middle" fill="#626c5d" font-size="${fontSize}">${fmt(week,0)}周</text>`;
  }
  if(isFat){
    const y=coordY(input.targetBF);
    output+=`<line x1="${l}" y1="${y}" x2="${W-r}" y2="${y}" stroke="#7d896f" stroke-width="1.2" stroke-dasharray="4 5"/><text x="${W-r}" y="${y-7}" text-anchor="end" fill="#626c5d" font-size="${fontSize}">薄肌参考 ${input.targetBF}%</text>`;
  }
  const colors=['#7d857a','#526a43','#A9703F'];
  results.forEach((result,index)=>{
    const points=result.hist.filter((_,position)=>position%4===0||position===result.hist.length-1).map(point=>`${coordX(point.week).toFixed(1)},${coordY(point[chartMetric]).toFixed(1)}`).join(' ');
    const final=result.hist[result.hist.length-1];
    output+=`<polyline points="${points}" fill="none" stroke="${colors[index]}" stroke-width="${index===1?2.8:1.8}" stroke-dasharray="${index===0?'5 5':index===2?'2 4':''}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${coordX(final.week).toFixed(1)}" cy="${coordY(final[chartMetric]).toFixed(1)}" r="${index===1?3.5:2.5}" fill="${colors[index]}"/>`;
  });
  s.innerHTML=output;
  if($('chartDescription'))$('chartDescription').textContent=isFat?'每 4 周取样 · 虚线为薄肌参考体脂':'每 4 周取样 · 含减脂与增肌阶段';
  document.querySelectorAll('[data-chart-metric]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chartMetric===chartMetric)));
}

function calculate({isExample=false,announce='',focusError=false,feedback=true,scrollResults=false}={}){
  showError('');clearFieldErrors();
  if($('submitStatus'))$('submitStatus').textContent='';
  const input=getInput();
  if(input.err){
    showError(input.err);$('resultStatus').textContent='输入有误 · 结果未更新';$('resultStatus').dataset.state='invalid';
    markInvalidInput(focusError);
    return;
  }
  lastInput=input;lastResults=params.map(param=>simulate(input,param));
  renderResult(lastResults,input,isExample);renderChart();
  if(feedback)showUpdateFeedback();
  if(scrollResults&&window.matchMedia('(max-width: 850px)').matches)$('results').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
  if(announce&&$('submitStatus'))$('submitStatus').textContent=announce==='result'?'估算已更新：'+$('time').innerHTML.replace(/<[^>]*>/g,'').trim()+'。':announce;
}

fields.forEach(id=>$(id).addEventListener('change',()=>calculate()));
$('applicationForm').addEventListener('submit',event=>{
  event.preventDefault();calculate({announce:'result',focusError:true,scrollResults:true});
});
$('demo').addEventListener('click',()=>{
  const defaults={height:175,weight:78,bf:24,age:28,experience:'new',sessions:3};
  Object.entries(defaults).forEach(([id,value])=>{$(id).value=value;});
  calculate({isExample:true,announce:'已恢复默认示例。'});
});
document.querySelectorAll('.photo-card').forEach(button=>button.addEventListener('click',()=>{
  $('bf').value=button.dataset.bf;
  calculate({announce:`已选择 ${button.dataset.bf}% 参考值，估算已更新。`});
  $('calculator').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
}));
document.querySelectorAll('[data-chart-metric]').forEach(button=>button.addEventListener('click',()=>{
  if(!['bf','w'].includes(button.dataset.chartMetric))return;
  chartMetric=button.dataset.chartMetric;renderChart();
}));
document.querySelectorAll('.photo-card img').forEach(image=>{
  const showFallback=()=>{
    if(image.dataset.fallbackShown)return;
    image.dataset.fallbackShown='true';image.hidden=true;
    const fallback=document.createElement('div');fallback.className='photo-fallback';
    fallback.textContent='图片暂未加载 · 仍可选择此档位';
    image.parentElement.insertBefore(fallback,image.nextSibling);
  };
  image.addEventListener('error',showFallback);
  if(image.complete&&image.naturalWidth===0)showFallback();
});
if(window.addEventListener)window.addEventListener('resize',renderChart);
calculate({isExample:true,feedback:false});
})();

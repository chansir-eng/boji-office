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
  if(w/(h/100)**2>48)return {err:'当前体重与身高组合超出本工具支持的输入范围（BMI 上限 48）。这不是健康诊断。'};
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

function statusOf(result){return result.status||(result.stalled?'capped':'complete');}
function completionText(result){
  const status=statusOf(result);
  return status==='outside-domain'?'不适用':status==='unestimated'?'无法估算':status==='capped'?'超出模拟范围':result.weeks+' 周';
}
function targetMessage(mid,input,none,allDone){
  const status=statusOf(mid);
  if(status==='outside-domain')return '当前输入或模拟路径超出适用边界，已停止演算。这个过程不能用作减脂安排。';
  if(status==='unestimated')return '中间假设缺少去脂体重补足条件，不能给出完整时长。';
  if(status==='capped')return '中间假设在 520 周内未完成，不能给出完整时长。';
  if(none)return status==='unestimated'?'缺少规律抗阻训练条件，不演算去脂体重补足时间。':'没有情景在运算上限内完成；520 周只是计算截止，不是人体变化上限。';
  if(allDone)return '当前估算满足本站两项数字参考，不能据此判断外观或健康状态。';
  if(mid.bulkWeeks>0||mid.growthNeeded>.01)return mid.cutWeeks>0?'在中间假设中，减脂造成的去脂体重损失也计入后续补足量。':'体脂已符合本站参考；模型继续演示去脂体重补足，而非净肌肉增长。';
  return '在中间假设中，只需改变脂肪量即可满足数字参考；这不是个体减脂建议。';
}
function renderAdvice(input,mid,allDone){
  const notes=[];
  if(statusOf(mid)==='outside-domain')notes.push('初始或后续 BMI 低于 18.5 时，本工具停止这条路径；这是保守的软件护栏，不是医学诊断。');
  else if(!allDone)notes.push('阶段先后顺序、减重份额与去脂体重增长率都是演示假设，未用个人纵向数据校准。');
  notes.push('去脂体重包含水、骨、器官与肌肉，变化不能全部解释为肌肉增长。');
  notes.push('三组结果不是置信区间；多年恒速外推不能当作个人完成时间。');
  $('advice').textContent=notes.join(' ');
}
function renderSensitivity(input){
  if(!$('sensitivityRows'))return;
  $('sensitivityRows').innerHTML=[-3,0,3].map(delta=>{
    const bf=input.bf+delta,lean=input.weight*(1-bf/100);
    const allowed=bf>7&&bf<=55;
    const mid=allowed?simulate({...input,bf},params[1]):null;
    const text=mid?completionText(mid):'超出输入范围';
    return '<tr><th scope="row">'+fmt(bf,1)+'%</th><td>'+fmt(lean,1)+' kg</td><td>'+text+'</td></tr>';
  }).join('');
  if($('sensitivityNote'))$('sensitivityNote').textContent='仅把当前体脂输入上下改变 3 个百分点，其余条件不变。这是敏感性演示，不是设备的真实误差范围，也不是置信区间。';
}
function renderAssumptions(input){
  if(!$('scenarioAssumptions'))return;
  $('scenarioAssumptions').innerHTML=params.map(p=>'<tr><th scope="row">'+p.name+'</th><td>'+fmt(p.rate*100,1)+'%</td><td>'+fmt(p.leanShare*100,0)+'%</td><td>'+fmt(p.monthly[input.experience],2)+' kg</td></tr>').join('');
}
function renderResult(results,input,isExample){
  const mid=results[1],valid=results.filter(result=>statusOf(result)==='complete');
  const allDone=valid.length===3&&results.every(result=>result.weeks===0),none=valid.length===0;
  const growthText=result=>statusOf(result)==='outside-domain'?'—':statusOf(result)==='unestimated'?'未估算':statusOf(result)==='capped'?'超出范围':result.bulkWeeks+' 周';
  if(none)$('time').innerHTML=results.some(result=>statusOf(result)==='outside-domain')?'不适用 <small>停止模拟</small>':results.some(result=>statusOf(result)==='unestimated')?'无法估算 <small>当前条件</small>':'超出范围 <small>520 周上限</small>';
  else if(allDone)$('time').innerHTML='已满足 <small>本站数字参考</small>';
  else{
    const low=Math.min(...valid.map(result=>result.weeks)),high=Math.max(...valid.map(result=>result.weeks));
    $('time').innerHTML=fmt(low,0)+(low===high?'':'–'+fmt(high,0))+' <small>模拟周</small>';
  }
  $('headline').textContent=targetMessage(mid,input,none,allDone);
  $('centralWeeks').textContent=completionText(mid);
  $('cutWeeks').textContent=statusOf(mid)==='outside-domain'?'—':mid.cutWeeks+' 周';
  $('bulkWeeks').textContent=growthText(mid);
  $('resultStatus').textContent=isExample?'示例演算':none?'无法完成':valid.length<3?'部分可演算':'已更新';
  $('resultStatus').dataset.state=none?'unavailable':allDone?'complete':valid.length<3?'partial':'ready';
  if($('validScenarioNote'))$('validScenarioNote').textContent=valid.length>0&&valid.length<3?'仅 '+valid.length+'/3 组假设可完成；这里的周数不代表其他假设也可完成。':'这些数字只回答“如果按这组假设持续变化，需要多少周”，不预测个人完成时间。';
  if($('formHint'))$('formHint').textContent=isExample?'已填入一组示例数据，可直接修改。':'修改参数后，假设结果会自动更新。';
  $('ffmiNow').textContent=fmt(massIndex(mid.initial.lean,input.height));
  $('leanMass').textContent=fmt(mid.initial.lean);
  $('targetWeight').textContent=statusOf(mid)==='complete'?fmt(mid.final.w)+' kg':'—';
  $('compositionText').textContent=fmt(mid.initial.lean)+' / '+fmt(mid.initial.fat)+' kg';
  $('barLean').style.width=fmt(100-input.bf)+'%';$('barFat').style.width=fmt(input.bf)+'%';
  $('phaseSummary').textContent='本站参考去脂体重 '+fmt(mid.goalLean)+' kg';
  $('scenarios').innerHTML=results.map((result,index)=>'<tr><td class="'+(index===1?'focus':'')+'">'+result.p.name+'</td><td>'+(statusOf(result)==='outside-domain'?'—':result.cutWeeks+'周')+'</td><td>'+growthText(result).replace(' 周','周')+'</td><td class="'+(index===1?'focus':'')+'">'+completionText(result).replace(' 周','周')+'</td></tr>').join('');
  renderAdvice(input,mid,allDone);renderAssumptions(input);renderSensitivity(input);
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
  if(results.every(result=>statusOf(result)==='outside-domain')){
    s.setAttribute('aria-label','超出适用边界，不展示变化路径');
    s.innerHTML='<text x="'+W/2+'" y="'+H/2+'" text-anchor="middle" fill="#626c5d" font-size="12">超出适用边界，停止展示变化路径</text>';
    return;
  }
  const all=results.flatMap(result=>result.hist.map(point=>point[chartMetric]));
  if(isFat)all.push(input.targetBF);
  const min=isFat?Math.max(5,Math.floor(Math.min(...all)/5)*5):Math.max(0,Math.floor(Math.min(...all)/5)*5-5);
  const max=isFat?Math.min(60,Math.ceil(Math.max(...all)/5)*5+5):Math.ceil(Math.max(...all)/5)*5+5;
  const coordX=value=>l+(W-l-r)*value/maxWeeks,coordY=value=>t+(H-t-b)*(max-value)/(max-min||1);
  const unit=isFat?'%':' kg';
  s.setAttribute('aria-label',isFat?'体脂变化演示：审慎、中间和乐观三组假设，虚线为本站参考体脂':'体重变化演示：审慎、中间和乐观三组假设');
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
  if($('chartDescription'))$('chartDescription').textContent=isFat?'每 4 周取样 · 虚线为薄肌参考体脂':'每 4 周取样 · 含减脂与去脂体重补足';
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
  if(announce&&$('submitStatus'))$('submitStatus').textContent=announce==='result'?'假设结果已更新：'+$('time').innerHTML.replace(/<[^>]*>/g,'').trim()+'。':announce;
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
document.querySelectorAll('[data-chart-metric]').forEach(button=>button.addEventListener('click',()=>{
  if(!['bf','w'].includes(button.dataset.chartMetric))return;
  chartMetric=button.dataset.chartMetric;renderChart();
}));
if(window.addEventListener)window.addEventListener('resize',renderChart);
calculate({isExample:true,feedback:false});
})();

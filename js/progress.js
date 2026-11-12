(function(root){
 const dateKey=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const total=state=>Object.values(state.records).reduce((a,b)=>a+b,0);
 const initial=()=>({version:3,chapterId:'shire',rewards:[],records:{},viewed:[],name:'',tinted:true,onboardingComplete:false,adventures:{},skipped:{}});
 const definitions=()=>root.JOURNEY?.optionalEvents||[];
 function minimumSteps(state){
  let spent=0,credit=0,minimum=0;
  for(const d of definitions()){
   const a=state.adventures?.[d.id];if(!a?.decision)continue;
   minimum=Math.max(minimum,d.activationSteps+spent-credit);
   if(d.type==='cave'&&a.status==='completed'){spent+=d.costSteps;minimum=Math.max(minimum,d.activationSteps+spent-credit);}
   if(d.type==='flight'&&a.status==='completed')credit+=d.shortcutSteps;
  }
  return minimum;
 }
 // Recompute from daily totals and immutable decisions. Remainders are never discarded.
 function project(state){
  const walked=total(state),states=JSON.parse(JSON.stringify(state.adventures||{}));let spent=0,credit=0;
  for(const d of definitions())states[d.id]??={status:'locked',progress:0,resultViewed:false};
  const result=(route,blockedId=null,resultId=null)=>({routeSteps:Math.max(0,Math.min(root.JOURNEY?.totalSteps??Infinity,route)),spentSteps:spent,shortcutSteps:credit,states,blockedId,resultId});
  for(const d of definitions()){
   const a=states[d.id],available=walked-spent+credit;
   if(available<d.activationSteps){if(!a.decision)a.status='locked';return result(available);}
   if(!a.decision){a.status='pending_choice';return result(d.activationSteps,d.id);}
   if(a.decision==='decline'){a.status='declined';continue;}
   if(d.type==='cave'){
    a.progress=Math.min(d.costSteps,Math.max(0,available-d.activationSteps));spent+=a.progress;
    if(a.progress<d.costSteps){a.status='active';return result(d.activationSteps,d.id);}
    a.status='completed';if(!a.resultViewed)return result(d.activationSteps,d.id,d.resultId);
   }else{
    if(a.status!=='completed')return result(d.activationSteps,d.id,d.resultId);
    credit+=d.shortcutSteps;
   }
  }
  return result(walked-spent+credit);
 }
 function reconcile(state){
  const projection=project(state);state.adventures=projection.states;state.skipped??={};
  for(const d of definitions())if(state.adventures[d.id].status==='completed'){
   if(!state.rewards.includes(d.rewardId))state.rewards.push(d.rewardId);
   if(d.type==='flight')for(const id of d.skippedEventIds)state.skipped[id]='skipped_by_shortcut';
  }
  return projection;
 }
 const routeSteps=state=>project(state).routeSteps;
 function record(state,date,steps,events){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>dateKey()||!Number.isSafeInteger(steps)||steps<0||steps>1000000)throw Error('Выберите дату не позднее сегодняшней и целое число от 0 до 1 000 000.');
  const next=total(state)-(state.records[date]||0)+steps,min=minimumSteps(state);
  if(next<min)throw Error('Запись не изменена: принятые решения и завершённые приключения требуют не менее '+min.toLocaleString('ru-RU')+' реальных шагов суммарно. Уменьшение ниже этой границы сделало бы сохранение противоречивым.');
  state.records[date]=steps;return events.filter(e=>e.steps<=routeSteps(state)&&!state.viewed.includes(e.id)&&!state.skipped?.[e.id]);
 }
 function position(route,steps){let points=[route[0]];for(let i=1;i<route.length;i++){let a=route[i-1],b=route[i];if(steps>=b.steps)points.push(b);else{let t=Math.max(0,(steps-a.steps)/(b.steps-a.steps));points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});break;}}return points;}
 root.Progress={dateKey,total,initial,project,reconcile,minimumSteps,routeSteps,record,position};
})(typeof window==='undefined'?globalThis:window);

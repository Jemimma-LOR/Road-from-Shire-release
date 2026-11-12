/* Portable backup envelope; gameplay data remains the existing storage schema. */
(function(root){
 const APP='road-from-shire',SCHEMA_VERSION=1,MAX_BYTES=5*1024*1024;
 const fail=message=>{const error=Error(message);error.userFacing=true;throw error;};
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function keys(o,allowed){if(!plain(o)||Object.keys(o).some(k=>!allowed.includes(k)))fail('Файл сохранения повреждён: неизвестные или неверные поля.');}
 function safeTree(value,depth=0){
  if(depth>40)fail('Файл сохранения имеет слишком сложную структуру.');
  if(value&&typeof value==='object')for(const key of Object.keys(value)){
   if(['__proto__','prototype','constructor'].includes(key))fail('Файл сохранения содержит недопустимые свойства.');
   safeTree(value[key],depth+1);
  }
 }
 function equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&equal(a[k],b[k]));}
 function validateState(s){
  safeTree(s);keys(s,['version','chapterId','rewards','name','records','viewed','tinted','onboardingComplete','adventures','skipped','onboardingDraft']);
  if(s.version!==root.JourneyStorage.VERSION)fail('Эта версия пользовательского состояния пока не поддерживается.');
  const required=['chapterId','rewards','name','records','viewed','tinted','onboardingComplete','adventures','skipped'];
  if(required.some(k=>!own(s,k)))fail('Файл сохранения повреждён: отсутствуют обязательные данные.');
  if(!root.JourneyStorage.valid(s))fail('Файл сохранения повреждён: неверные значения профиля, шагов или решений.');
  if(s.onboardingDraft){keys(s.onboardingDraft,['step','name','steps','date']);if(s.onboardingComplete)fail('Файл содержит противоречивое состояние приветствия.');}
  const today=root.Progress.dateKey();
  if(Object.keys(s.records).some(date=>date>today)||!Number.isSafeInteger(root.Progress.total(s)))fail('Файл содержит недопустимые даты или количество шагов.');
  const events=root.JOURNEY.events,defs=root.JOURNEY.optionalEvents;
  const eventIds=new Set(events.map(e=>e.id)),resultIds=new Set(defs.map(d=>d.resultId)),rewardIds=new Set(events.filter(e=>e.reward).map(e=>e.reward.id));
  if(s.viewed.some(id=>!eventIds.has(id)&&!resultIds.has(id)))fail('Сохранение содержит неизвестные путевые события.');
  if(new Set(s.rewards).size!==s.rewards.length||s.rewards.some(id=>!rewardIds.has(id)))fail('Сохранение содержит неизвестные или повторяющиеся награды.');
  for(const a of Object.values(s.adventures))keys(a,['status','progress','resultViewed','decision']);
  const projected=root.Progress.project(s);let blocked=false;
  for(const d of defs){
   const a=s.adventures[d.id]||{status:'locked',progress:0,resultViewed:false};
   if(!equal(a,projected.states[d.id]))fail('Прогресс необязательного приключения не соответствует записям шагов.');
   if(blocked&&a.status!=='locked')fail('Нарушена последовательность необязательных приключений.');
   if(['pending_choice','active'].includes(a.status)||(a.status==='completed'&&!a.resultViewed))blocked=true;
   if(!!a.decision!==s.viewed.includes(d.eventId))fail('Решение по приключению не соответствует просмотренным карточкам.');
   if(a.resultViewed!==s.viewed.includes(d.resultId))fail('Состояние карточки результата не соответствует истории.');
   if(d.type==='flight'&&a.status==='completed'&&!a.resultViewed)fail('Завершённый полёт должен иметь просмотренную карточку результата.');
   if(a.progress>(d.type==='cave'?d.costSteps:0))fail('Недопустимый прогресс исследования.');
  }
  const flight=defs.find(d=>d.type==='flight'),flown=s.adventures[flight.id]?.status==='completed';
  const skipped=flown?Object.fromEntries(flight.skippedEventIds.map(id=>[id,'skipped_by_shortcut'])):{};
  if(!equal(s.skipped,skipped))fail('Пропущенные события не соответствуют состоянию полёта.');
  const expectedRewards=events.filter(e=>e.reward&&!e.reward.conditional&&s.viewed.includes(e.id)).map(e=>e.reward.id);
  for(const d of defs)if(s.adventures[d.id]?.status==='completed')expectedRewards.push(d.rewardId);
  if(!equal([...s.rewards].sort(),expectedRewards.sort()))fail('Полученные награды не соответствуют истории путешествия.');
  // Historical viewed cards may lie ahead of today's position after a legal downward correction.
  let gap=false;
  for(const e of events){if(s.skipped[e.id])continue;if(!s.viewed.includes(e.id))gap=true;else if(gap)fail('В истории просмотренных событий пропущены обязательные страницы.');}
  if(!s.onboardingComplete&&(s.viewed.length||s.rewards.length||Object.keys(s.records).length))fail('Файл содержит противоречивое состояние первого запуска.');
  return root.JourneyStorage.serialize(s);
 }
 function create(state,now=new Date()){
  const data=validateState(root.JourneyStorage.serialize(state));
  return {app:APP,schemaVersion:SCHEMA_VERSION,exportedAt:now.toISOString(),data};
 }
 function parse(text){
  if(typeof text!=='string'||text.length>MAX_BYTES)fail('Файл слишком большой. Допустимый размер — до 5 МБ.');
  let envelope;try{envelope=JSON.parse(text.replace(/^\uFEFF/,''));}catch(error){fail('Файл сохранения повреждён: не удалось прочитать JSON.');}
  safeTree(envelope);
  if(!plain(envelope)||envelope.app!==APP)fail('Выбранный файл не является сохранением «Дороги из Шира».');
  if(envelope.schemaVersion!==SCHEMA_VERSION)fail('Эта версия сохранения пока не поддерживается.');
  keys(envelope,['app','schemaVersion','exportedAt','data']);
  if(typeof envelope.exportedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(envelope.exportedAt)||!Number.isFinite(Date.parse(envelope.exportedAt)))fail('Файл содержит неверную дату создания копии.');
  return {app:APP,schemaVersion:SCHEMA_VERSION,exportedAt:envelope.exportedAt,data:validateState(envelope.data)};
 }
 function filename(date=new Date()){return 'road-from-shire-save-'+date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+'.json';}
 function describe(backup){const steps=root.Progress.total(backup.data),route=root.Progress.routeSteps(backup.data);const chapter=root.JOURNEY.chapters.find(c=>route<=c.endSteps)||root.JOURNEY.chapters.at(-1);return {name:backup.data.name||'Путешественник',steps,chapter:'Глава '+chapter.roman+' · '+chapter.title,exportedAt:backup.exportedAt};}
 function download(state){
  const now=new Date(),backup=create(state,now),blob=new Blob([JSON.stringify(backup,null,2)+'\n'],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{link.href=url;link.download=filename(now);document.body.append(link);link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
 function bind(getState){
  const picker=document.querySelector('#backup-file'),dialog=document.querySelector('#backup-dialog'),body=document.querySelector('#backup-dialog-body');
  const confirm=document.querySelector('#backup-confirm'),cancel=document.querySelector('#backup-cancel'),error=document.querySelector('#backup-error');
  let pending=null,request=0,committed=false,startedOutside=false;
  function message(text){const target=document.querySelector('.backup-status')||document.querySelector('#welcome-error');if(target)target.textContent=text;}
  function clear(){pending=null;request++;picker.value='';error.textContent='';}
  function close(){if(committed){location.reload();return;}clear();dialog.close();}
  document.addEventListener('click',event=>{
   if(event.target.closest('[data-backup-export]')){try{download(getState());message('Файл сохранения подготовлен. Скачивание начато.');}catch(e){message(e.userFacing?e.message:'Не удалось создать файл сохранения.');}}
   if(event.target.closest('[data-backup-import]')){clear();picker.click();}
  });
  picker.addEventListener('change',async()=>{
   const file=picker.files?.[0],token=++request;if(!file)return;
   try{
    if(file.size>MAX_BYTES)fail('Файл слишком большой. Допустимый размер — до 5 МБ.');
    let text;try{text=await file.text();}catch(e){fail('Не удалось прочитать файл.');}
    const backup=parse(text);if(token!==request)return;
    pending=backup;const info=describe(backup);body.textContent='Путешественник: '+info.name+'\nКопия создана: '+new Date(info.exportedAt).toLocaleString('ru-RU')+'\nРеальных шагов: '+info.steps.toLocaleString('ru-RU')+'\n'+info.chapter;
    confirm.disabled=false;cancel.disabled=false;error.textContent='';dialog.showModal();confirm.focus();
   }catch(e){if(token===request){pending=null;message(e.userFacing?e.message:'Не удалось прочитать файл.');}}
   finally{if(token===request)picker.value='';}
  });
  cancel.addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
  dialog.addEventListener('pointerdown',e=>{startedOutside=e.button===0&&outside(e);});
  dialog.addEventListener('pointercancel',()=>{startedOutside=false;});
  dialog.addEventListener('click',e=>{if(startedOutside&&outside(e))close();startedOutside=false;});
  confirm.addEventListener('click',()=>{
   if(!pending||committed)return;
   try{
    const candidate=validateState(pending.data);confirm.disabled=true;
    const result=root.JourneyStorage.restore(candidate,getState());
    if(!result.ok){error.textContent=result.error;confirm.disabled=false;return;}
    committed=true;pending=null;cancel.disabled=true;
    document.querySelector('#backup-dialog-title').textContent='Сохранение восстановлено';
    document.querySelector('#backup-confirm-copy').textContent='Сохранение восстановлено. Путешествие продолжится с сохранённого места';
    body.textContent='';error.textContent='';setTimeout(()=>location.reload(),1200);
   }catch(e){confirm.disabled=false;error.textContent=e.userFacing?e.message:'Не удалось восстановить данные. Текущий прогресс сохранён.';}
  });
 }
 root.JourneyBackup={create,parse,validateState,describe,filename,download,bind,SCHEMA_VERSION,MAX_BYTES};
})(window);

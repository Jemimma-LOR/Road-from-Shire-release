/* Replaceable persistence boundary. Never remove or overwrite an unreadable save. */
(function(root){
 const KEY='road-from-shire.state.v3',LEGACY_KEY='road-from-shire.state',VERSION=3;
 let blocked=false;
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 function valid(s){
  if(!plain(s)||s.version!==VERSION||typeof s.name!=='string'||s.name.length>60||typeof s.tinted!=='boolean'||typeof s.onboardingComplete!=='boolean'||!plain(s.records)||!Array.isArray(s.viewed))return false;
  if(s.version===VERSION&&(s.chapterId!=='shire'||!Array.isArray(s.rewards)||s.rewards.some(id=>typeof id!=='string')))return false;
  if(s.onboardingDraft!==undefined){const d=s.onboardingDraft;if(!plain(d)||![1,2,3].includes(d.step)||typeof d.name!=='string'||d.name.length>60||(d.step>1&&!d.name.trim())||!(d.steps===null||(Number.isSafeInteger(d.steps)&&d.steps>=0&&d.steps<=1000000))||!(d.date===null||(typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Date.parse(d.date+'T12:00:00Z'))&&new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)===d.date))||(d.steps!==null&&d.date===null))return false;}
  if(!plain(s.adventures)||!plain(s.skipped))return false;
  const ids=['CAVE-01','CAVE-02','CAVE-03','CAVE-04','EAGLE-01'];
  if(Object.keys(s.adventures).some(id=>!ids.includes(id)))return false;
  for(const [id,a] of Object.entries(s.adventures)){
   if(!plain(a)||!['locked','pending_choice','declined','active','completed'].includes(a.status)||!Number.isSafeInteger(a.progress)||a.progress<0||typeof a.resultViewed!=='boolean')return false;
   if(a.decision!==undefined&&!['accept','decline'].includes(a.decision))return false;
   if(['locked','pending_choice'].includes(a.status)&&a.decision!==undefined)return false;
   if(a.status==='declined'&&a.decision!=='decline')return false;
   if(['active','completed'].includes(a.status)&&a.decision!=='accept')return false;
   if(a.resultViewed&&a.status!=='completed')return false;
  }
  if(Object.entries(s.skipped).some(([id,status])=>!['misty-024','misty-025','misty-026'].includes(id)||status!=='skipped_by_shortcut'||s.viewed.includes(id)))return false;
  if(root.Progress&&root.Progress.total(s)<root.Progress.minimumSteps(s))return false;
  if(s.viewed.some(id=>typeof id!=='string')||new Set(s.viewed).size!==s.viewed.length)return false;
  return Object.entries(s.records).every(([date,steps])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date&&Number.isSafeInteger(steps)&&steps>=0&&steps<=1000000);
 }
 function load(){try{let raw=root.localStorage.getItem(KEY);if(raw!==null){const state=JSON.parse(raw);if(!valid(state)||state.version!==VERSION)throw Error('format');return {state};}
 return {state:null};
 }catch(error){blocked=true;return {state:null,error:'Не удалось прочитать сохранение: оно недоступно, повреждено или имеет другую версию. Существующие данные не изменены. Проверьте доступ к хранилищу и повторите загрузку.'};}}
 function serialize(state){const snapshot={version:VERSION,chapterId:'shire',rewards:state.rewards||[],name:state.name,records:state.records,viewed:state.viewed,tinted:state.tinted,onboardingComplete:state.onboardingComplete};snapshot.adventures=state.adventures||{};snapshot.skipped=state.skipped||{};if(!state.onboardingComplete&&state.onboardingDraft!==undefined)snapshot.onboardingDraft=state.onboardingDraft;return JSON.parse(JSON.stringify(snapshot));}
 function save(state){if(blocked)return {ok:false,error:'Сохранение заблокировано, чтобы не перезаписать непрочитанные данные. Повторите загрузку после проверки хранилища.'};try{const snapshot=serialize(state);if(!valid(snapshot))throw Error('invalid');root.localStorage.setItem(KEY,JSON.stringify(snapshot));return {ok:true};}catch(error){return {ok:false,error:'Не удалось сохранить изменения в этом браузере. Проверьте свободное место и разрешение на хранение данных. Не закрывайте страницу: последние изменения пока доступны только здесь.'};}}
 // Only called after explicit import confirmation. Keep an exact rollback copy.
 function restore(state,currentState){
  let previous,attempted=false;
  try{
   const candidate=serialize(state);if(!valid(candidate))throw Error('invalid');
   previous=root.localStorage.getItem(KEY);
   const backup={savedAt:new Date().toISOString(),stored:previous,current:serialize(currentState)};
   const encodedBackup=JSON.stringify(backup);root.localStorage.setItem(KEY+'.before-import',encodedBackup);
   if(root.localStorage.getItem(KEY+'.before-import')!==encodedBackup)throw Error('backup');
   const encoded=JSON.stringify(candidate);attempted=true;root.localStorage.setItem(KEY,encoded);
   if(root.localStorage.getItem(KEY)!==encoded)throw Error('verification');
   blocked=false;return {ok:true};
  }catch(error){
   let rolledBack=!attempted;
   if(attempted){try{if(root.localStorage.getItem(KEY)!==previous){if(previous===null)root.localStorage.removeItem(KEY);else root.localStorage.setItem(KEY,previous);}rolledBack=root.localStorage.getItem(KEY)===previous;}catch(rollbackError){rolledBack=false;}}
   return {ok:false,error:rolledBack?'Не удалось восстановить данные. Текущий прогресс сохранён.':'Не удалось подтвердить восстановление данных и выполнить откат. Не закрывайте страницу: прежнее прохождение осталось в памяти. Экспортируйте его; резервная копия также сохранена перед импортом.'};
  }
 }
 root.JourneyStorage={load,save,valid,serialize,restore,KEY,LEGACY_KEY,VERSION};
})(typeof window==='undefined'?globalThis:window);

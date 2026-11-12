/* One data model and event queue across all supported chapters. */
window.JOURNEY_READY=(async()=>{
 async function readChapter(slug,id){
  if(location.protocol==='file:'){
   const file=slug==='shire'?'shire-local.js':slug+'-local.js';
   await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='data/'+file;script.onload=resolve;script.onerror=()=>reject(Error('Не удалось загрузить данные главы: '+slug));document.head.append(script);});
   return id==='shire'?window.SHIRE_LOCAL:window.CHAPTER_LOCAL[id];
  }
  const response=await fetch('data/'+slug+'.json');if(!response.ok)throw Error('Не удалось загрузить главу: '+slug);return response.json();
 }
 const raw=await Promise.all([readChapter('shire','shire'),readChapter('bree','bree'),readChapter('lonely-lands','lonelylands'),readChapter('rivendell','rivendell'),readChapter('misty-mountains','misty'),readChapter('mirkwood','mirkwood'),readChapter('erebor','erebor')]);
 const expected=[33,20,22,38,31,37,25];
 const chapters=raw.map((chapter,i)=>{if(chapter.events.length!==expected[i])throw Error('Неполные данные главы '+chapter.title);return {...chapter,roman:['I','II','III','IV','V','VI','VII'][i],startSteps:i?raw[i-1].events.at(-1).steps:0,endSteps:chapter.events.at(-1).steps,events:chapter.events.map(e=>({...e,chapterId:chapter.id}))};});
 const events=chapters.flatMap(c=>c.events);
 if(new Set(events.map(e=>e.id)).size!==206||events.some((e,i)=>i&&e.steps<=events[i-1].steps))throw Error('Нарушен порядок событий путешествия.');
 let optional;
 if(location.protocol==='file:'){
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='data/optional-events-local.js';s.onload=resolve;s.onerror=()=>reject(Error('Не удалось загрузить необязательные события'));document.head.append(s);});optional=window.OPTIONAL_LOCAL;
 }else{const response=await fetch('data/optional-events.json');if(!response.ok)throw Error('Не удалось загрузить необязательные события');optional=await response.json();}
 if(optional.version!==1||optional.events.length!==5)throw Error('Неверные данные необязательных событий');
 for(const d of optional.events){const e=events.find(e=>e.id===d.eventId);if(!e||e.steps!==d.activationSteps||e.reward?.id!==d.rewardId)throw Error('Неверная привязка '+d.id);}
 window.JOURNEY={optionalEvents:optional.events,chapters,events,segments:chapters.flatMap(c=>c.segments),totalKm:chapters.reduce((sum,c)=>sum+c.totalKm,0),totalSteps:events.at(-1).steps,map:{src:'assets/map/dai2tpel4r8a1.jpg',width:4911,height:3472},route:SHIRE_GEOGRAPHY.anchors,geography:SHIRE_GEOGRAPHY};
})();

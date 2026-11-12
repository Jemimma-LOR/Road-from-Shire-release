(async()=>{
try{await window.JOURNEY_READY;}catch(error){document.querySelector('#welcome-content').textContent=error.message;return;}
const loaded=JourneyStorage.load();
const state=loaded.state||Progress.initial();
const optionalEvents=JOURNEY.optionalEvents;
const events=JOURNEY.events,content=document.querySelector('#content');
let page='home',queue=[],activeEvent=null,eventReturn=null;
const previewObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{updateMapPreview();declutterMapMarkers();});
const n=x=>new Intl.NumberFormat('ru-RU').format(x);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const total=()=>Progress.routeSteps(state,events);
const physicalTotal=()=>Progress.total(state);
const routeGeometry=RouteGeometry.create(JOURNEY.route,JOURNEY.segments.map(segment=>({...segment,...JOURNEY.geography.segments.find(g=>g.id===segment.id)})),JOURNEY.geography);
const reducedRouteMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let shownRouteDistance=routeGeometry.distanceAtSteps(total()),routeTarget=shownRouteDistance,routeFrame=0;
reducedRouteMotion.addEventListener('change',()=>{if(reducedRouteMotion.matches){cancelAnimationFrame(routeFrame);routeFrame=0;shownRouteDistance=routeTarget;paintRoute();}});
const playerName=()=>state.name.trim()||'Путешественник';
const km=()=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(physicalTotal()*0.75/1000);
const nextEvent=()=>events.find(e=>e.steps>total());
const nextLocation=()=>events.find(e=>e.isMajor&&e.steps>total());
const expeditionComplete=()=>total()>=JOURNEY.totalSteps&&state.viewed.includes(events.at(-1).id);
const currentChapter=()=>JOURNEY.chapters.find(c=>total()<=c.endSteps)||JOURNEY.chapters.at(-1);
const chapterLabel=()=>`Глава ${currentChapter().roman} · ${currentChapter().title}`;
const chapterPercent=()=>Math.max(0,Math.min(100,(total()-currentChapter().startSteps)/(currentChapter().endSteps-currentChapter().startSteps)*100));
const currentLocation=()=>events.filter(e=>e.isMajor&&e.steps<=total()).at(-1);
const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
const eventTypeLabel=type=>type==='Микрооткрытие'?'Путевая заметка':type;
const art=e=>e.imageAvailable?e.image:e.placeholder;
// Latest reached and reviewed event; replaying an archive card never changes this.
const bannerEvent=()=>openedStories().filter(e=>!e.isArtifact&&e.steps<=total()).at(-1)||events[0];
function heading(title,sub,extra=''){return `<div class="page-heading"><div><span class="eyebrow">${escapeHTML(chapterLabel().toUpperCase())}</span><h1>${title}</h1><p>${sub}</p></div>${extra}</div>`;}
function routeDash(){
 const flight=optionalEvents.find(d=>d.type==='flight'),length=routeGeometry.length+1;
 if(state.adventures[flight.id]?.status!=='completed')return shownRouteDistance+' '+length;
 const from=routeGeometry.distanceAtSteps(flight.activationSteps),to=routeGeometry.distanceAtSteps(flight.arrivalSteps);
 if(shownRouteDistance<=from)return shownRouteDistance+' '+length;
 if(shownRouteDistance<=to)return from+' '+length;
 return from+' '+(to-from)+' '+(shownRouteDistance-to)+' '+length;
}
function mapMarkup(interactive=true){const pos=routeGeometry.pointAtDistance(shownRouteDistance);return `<div class="map-stage${interactive?'':' map-preview'}"><div class="map-image ${state.tinted?'tinted':''}"><img src="${JOURNEY.map.src}" alt="Карта Средиземья" draggable="false"><svg viewBox="0 0 4911 3472" aria-label="Пройденный путь" role="group"><path class="route-line" d="${routeGeometry.d}" stroke-dasharray="${routeDash()}" style="visibility:${shownRouteDistance>0?'visible':'hidden'}"><title>Ваш пройденный путь</title></path>${events.filter(e=>JOURNEY.geography.markers[e.id]?.showOnMap&&e.steps<=total()&&!state.skipped?.[e.id]).map(e=>{const distance=routeGeometry.distanceAtSteps(e.steps),p=routeGeometry.pointAtDistance(distance);return `<g class="map-marker" data-map-priority="${JOURNEY.geography.markers[e.id].priority}" data-route-distance="${distance}" style="visibility:${distance<=shownRouteDistance?'visible':'hidden'}" ${interactive?`role="button" tabindex="0" data-event="${e.id}"`: ''} aria-label="${escapeHTML(e.title)}"><title>${escapeHTML(e.title)} · ${n(e.steps)} шагов</title><circle cx="${p.x}" cy="${p.y}" r="19"/></g>`;}).join('')}<circle class="current" cx="${pos.x}" cy="${pos.y}" r="16"><title>Вы здесь</title></circle></svg></div></div>`;}
// Preview coordinates use the original image pixels, just like the SVG route.
function previewTransform(width,height,pos){
 const map=JOURNEY.map;
 // Roughly 900 × 650 source pixels: a local area, not the whole atlas.
 const scale=Math.max(width/900,height/650,width/map.width,height/map.height);
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 return {scale,x:clamp(width/2-pos.x*scale,width-map.width*scale,0),y:clamp(height/2-pos.y*scale,height-map.height*scale,0)};
}
function updateMapPreview(){
 const viewport=document.querySelector('.map-preview');
 if(!viewport||!viewport.clientWidth||!viewport.clientHeight)return;
 const layer=viewport.querySelector('.map-image');
 const pos=routeGeometry.pointAtDistance(shownRouteDistance);
 const frame=previewTransform(viewport.clientWidth,viewport.clientHeight,pos);
 layer.style.width=JOURNEY.map.width+'px';layer.style.height=JOURNEY.map.height+'px';
 layer.style.transform=`translate(${frame.x}px, ${frame.y}px) scale(${frame.scale})`;
 layer.style.visibility='visible';
}
function observeMapPreview(){
 previewObserver?.disconnect();
 const viewport=document.querySelector('.map-preview');
 if(viewport){updateMapPreview();previewObserver?.observe(viewport);}
 document.querySelectorAll('.map-image svg').forEach(svg=>previewObserver?.observe(svg));
 declutterMapMarkers();
}

// One distance drives the stroke, marker, nearby location visibility and preview camera.
function paintRoute(){
 const pos=routeGeometry.pointAtDistance(shownRouteDistance);
 document.querySelectorAll('.route-line').forEach(path=>{path.setAttribute('stroke-dasharray',routeDash());path.style.visibility=shownRouteDistance>0?'visible':'hidden';});
 document.querySelectorAll('.current').forEach(marker=>{marker.setAttribute('cx',pos.x);marker.setAttribute('cy',pos.y);});
 updateMapPreview();
 declutterMapMarkers();
}
// Compare actual screen pixels, including preview transforms, not map units.
function declutterMapMarkers(){
 document.querySelectorAll('.map-image svg').forEach(svg=>{
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const screen=p=>({x:matrix.a*p.x+matrix.c*p.y+matrix.e,y:matrix.b*p.x+matrix.d*p.y+matrix.f});
  const occupied=[screen(routeGeometry.pointAtDistance(shownRouteDistance))];
  const markers=[...svg.querySelectorAll('[data-route-distance]')].sort((a,b)=>Number(b.dataset.mapPriority)-Number(a.dataset.mapPriority));
  for(const marker of markers){const distance=Number(marker.dataset.routeDistance),p=screen(routeGeometry.pointAtDistance(distance));const visible=distance<=shownRouteDistance+0.001&&!occupied.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<32);marker.style.visibility=visible?'visible':'hidden';if(visible)occupied.push(p);}
 });
}
function syncRouteAnimation(){
 const target=routeGeometry.distanceAtSteps(total());
 if(routeFrame&&target===routeTarget){paintRoute();return;}
 cancelAnimationFrame(routeFrame);routeFrame=0;routeTarget=target;
 // Corrections backwards and reduced-motion preferences apply immediately.
 if(reducedRouteMotion.matches||target<=shownRouteDistance){shownRouteDistance=target;paintRoute();return;}
 const from=shownRouteDistance,start=performance.now();
 paintRoute();
 const tick=now=>{const t=Math.min(1,Math.max(0,(now-start)/1000));const eased=t*t*(3-2*t);shownRouteDistance=from+(target-from)*eased;paintRoute();if(t<1)routeFrame=requestAnimationFrame(tick);else routeFrame=0;};
 routeFrame=requestAnimationFrame(tick);
}


const optionalFor=e=>optionalEvents.find(d=>d.eventId===e.id);
const cloneState=()=>JSON.parse(JSON.stringify(state));
function commitState(candidate){
 const result=JourneyStorage.save(candidate),notice=document.querySelector('#save-error');notice.hidden=result.ok;notice.textContent=result.ok?'':result.error;
 const inline=document.querySelector('#event-choice-error');if(inline)inline.textContent=result.ok?'':result.error;
 if(result.ok)Object.assign(state,candidate);return result.ok;
}
function synchronize(){const candidate=cloneState();Progress.reconcile(candidate);return JSON.stringify(candidate)===JSON.stringify(state)||commitState(candidate);}
function resultCard(d){const source=events.find(e=>e.id===d.eventId);return {id:d.resultId,resultOf:d.id,title:d.type==='flight'?d.resultTitle:source.reward.name,text:d.rewardText,type:d.type==='flight'?'Полёт на орлах':'Секретная находка',steps:d.activationSteps,orderKey:d.activationSteps+.1,image:d.resultImage,imageAvailable:d.type==='flight',placeholder:d.resultPlaceholder,icon:'◇',iconImage:d.resultIcon,isArtifact:d.type==='cave'};}
function artifactIcon(e){return e.iconImage?'<img src="'+escapeHTML(e.iconImage)+'" alt="" data-artifact-icon>':escapeHTML(e.icon||'◇');}
function openedStories(){return [...events.filter(e=>state.viewed.includes(e.id)&&!state.skipped?.[e.id]),...optionalEvents.filter(d=>state.adventures[d.id]?.status==='completed'&&(d.type==='cave'||state.adventures[d.id].resultViewed)).map(resultCard)].sort((a,b)=>(a.orderKey??a.steps)-(b.orderKey??b.steps));}
function optionalControls(e){
 const d=optionalFor(e);if(!d)return '';
 const value=state.adventures[d.id]||Progress.project(state).states[d.id];
 if(value.status==='pending_choice')return '<p class="muted">'+(d.type==='cave'?'Для исследования нужно '+n(d.costSteps)+' шагов.':'')+'</p><div class="optional-actions"><button class="primary" data-optional="accept">'+escapeHTML(d.choices.accept)+'</button><button class="secondary" data-optional="decline">'+escapeHTML(d.choices.decline)+'</button></div><p id="event-choice-error" role="alert"></p>';
 return '<p class="muted">'+(value.status==='declined'?'Вы решили продолжить путь.':value.status==='active'&&d.type==='cave'?'До тайника осталось '+n(d.costSteps-value.progress)+' шагов.':value.status==='completed'?'Приключение завершено.':'')+'</p>';
}
function chooseOptional(decision){
 const e=activeEvent?.e,d=e&&optionalFor(e);if(!d||!['accept','decline'].includes(decision)||state.adventures[d.id]?.status!=='pending_choice')return;
 if(pendingEvents()[0]?.id!==e.id){closeEvent();startPending();return;}
 const candidate=cloneState();candidate.adventures[d.id]={decision,status:decision==='decline'?'declined':'active',progress:0,resultViewed:false};
 if(!candidate.viewed.includes(e.id))candidate.viewed.push(e.id);
 Progress.reconcile(candidate);if(!commitState(candidate))return;closeEvent();startPending();
}
function roadStatus(){
 const projection=Progress.project(state),d=optionalEvents.find(d=>d.id===projection.blockedId);
 if(d){const value=projection.states[d.id];if(value.status==='pending_choice')return '<button class="text-button" data-event="'+d.eventId+'">'+escapeHTML(events.find(e=>e.id===d.eventId).title)+' — выбрать путь</button>';
 if(projection.resultId)return '<button class="text-button" data-resume-result>Продолжить приключение</button>';
 return 'До тайника осталось '+n(d.costSteps-value.progress)+' шагов';}
 const next=nextEvent();return next?'Ещё '+n(next.steps-total())+' шагов':(expeditionComplete()?'Экспедиция завершена':'Все путевые точки достигнуты');
}
function stats(){return `<div class="stats"><div class="stat"><label>Шагов сегодня</label><strong>${n(state.records[Progress.dateKey()]||0)}</strong><small>шагов</small></div><div class="stat"><label>Весь ваш путь</label><strong>${n(physicalTotal())}</strong><small>шагов</small></div><div class="stat"><label>За плечами</label><strong>${km()}</strong><small>км</small></div></div>`;}
function archive(){return '<div class="cards">'+openedStories().map(e=>'<button class="archive-card" data-event="'+e.id+'">'+(e.isArtifact?'<span class="archive-artifact" aria-hidden="true">'+artifactIcon(e)+'</span>':'<img loading="lazy" decoding="async" src="'+escapeHTML(e.thumbnail||art(e))+'" data-placeholder="'+escapeHTML(e.placeholder||'assets/illustrations/hills.svg')+'" alt="'+escapeHTML(e.title)+'">')+'<span class="card-body"><small>'+escapeHTML(eventTypeLabel(e.type).toUpperCase())+' · '+n(e.steps)+' ШАГОВ</small><h3>'+escapeHTML(e.title)+'</h3></span></button>').join('')+'</div>';}
function render(){document.querySelectorAll('.sidebar .chapter,.topbar .demo,footer span:nth-child(2)').forEach(el=>{el.textContent=chapterLabel();});document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});const next=nextEvent(),major=nextLocation(),heroEvent=bannerEvent();
if(page==='home')content.innerHTML=heading('Дорога из Шира',`Добро пожаловать, ${escapeHTML(playerName())}. Дорога ждёт вас.`,`<button class="primary steps-highlight" data-action="steps">＋ Записать шаги</button>`)+`<section class="hero"><div class="hero-copy"><span class="eyebrow">СЕЙЧАС ВЫ ЗДЕСЬ</span><h2>${escapeHTML(heroEvent.title)}</h2><p>${expeditionComplete()?escapeHTML(heroEvent.text):'За поворотом начинается новая история.<br>Пройдите ещё немного — и узнайте, что приготовила дорога.'}</p><span class="location-tag">◇ ${JOURNEY.chapters.indexOf(currentChapter())<4?'ЭРИАДОР':'РОВАНИОН'} · ${escapeHTML(chapterLabel().toUpperCase())}</span></div><div class="hero-art"><img class="hero-event-image" src="${escapeHTML(art(heroEvent))}" alt="${escapeHTML(heroEvent.title)}" data-placeholder="${escapeHTML(heroEvent.placeholder)}" style="object-position:${escapeHTML(heroEvent.heroObjectPosition||'center center')}" decoding="async"></div></section>`+stats()+`<div class="bottom-grid"><section class="panel"><div class="panel-title"><h3>Дорога впереди</h3><span class="muted">✧</span></div><div class="milestone"><span class="milestone-icon">❧</span><div><p>${roadStatus()}</p><small>${next?'до следующего путевого события':'Конец основного маршрута'}</small></div></div><div class="milestone"><span class="milestone-icon">♧</span><div><p>${major?`${n(major.steps-total())} шагов`:'Вы достигли Эребора'}</p><small>${major?'следующая крупная локация':'Конечная локация'}</small></div></div><div class="progress-track"><span style="width:${chapterPercent()}%"></span></div><div class="progress-label"><span>${escapeHTML(currentChapter().segments[0].from)}</span><span>${Math.floor(chapterPercent())}% главы</span><span>${escapeHTML(currentChapter().segments.at(-1).to)}</span></div></section><section class="panel mini" data-open-map role="link" tabindex="0" aria-label="Следы на карте — открыть атлас"><div class="panel-title"><h3>Следы на карте</h3><span class="text-button">Открыть атлас ↗</span></div>${mapMarkup(false)}</section></div>`;
if(page==='map')content.innerHTML=heading('Атлас Средиземья','На пергаменте остаются лишь те дороги, которые вы уже прошли.',`<div class="segmented" aria-label="Цвет карты"><button data-tone="original" class="${!state.tinted?'selected':''}" aria-pressed="${!state.tinted}">Оригинал</button><button data-tone="tinted" class="${state.tinted?'selected':''}" aria-pressed="${state.tinted}">Тонированная карта</button></div>`)+mapMarkup()+`<div class="map-note"><span class="map-legend">● Открытые локации &nbsp; ● Вы здесь &nbsp; ━ Пройденный путь</span><span>${escapeHTML(JOURNEY.geography.note)}</span></div>`;
if(page==='journal')content.innerHTML=heading('Дневник','Каждый день — ещё одна строка вашей истории.',`<button class="primary" data-action="steps">＋ Записать шаги</button>`)+`<div class="journal-grid"><section class="panel journal-records"><h3>Записи путешественника</h3><div class="journal-scroll" tabindex="0" role="region" aria-label="Записи шагов по датам"><table><thead><tr><th>ДАТА</th><th>ШАГИ</th><th></th></tr></thead><tbody>${Object.entries(state.records).sort(([a],[b])=>b.localeCompare(a)).map(([date,steps])=>`<tr><td>${dateLabel(date)}</td><td>${n(steps)}</td><td><button class="text-button" data-edit="${date}" aria-label="Изменить запись за ${dateLabel(date)}">Изменить</button></td></tr>`).join('')}</tbody></table></div></section><section class="panel"><span class="eyebrow">ПУТЬ В ЦИФРАХ</span><h2>${km()} км за плечами</h2><p class="muted">${n(physicalTotal())} шагов · ${Object.keys(state.records).length} дня с записями</p><p class="muted">Событий просмотрено: ${state.viewed.length}</p></section></div><h2>Страницы путешествия</h2>`+archive();
if(page==='hall')content.innerHTML=heading('Коллекция путешествия','Находки, реликвии и достижения, собранные по дороге.')+`<div class="cards">${events.filter(e=>e.reward).map(e=>{const unlocked=state.rewards.includes(e.reward.id);return `<article class="relic ${unlocked?'':'locked'}"><div class="medallion">${unlocked&&optionalFor(e)?artifactIcon(resultCard(optionalFor(e))):unlocked?e.reward.icon:'◇'}</div><span class="eyebrow">${unlocked?e.reward.kind:'ЕЩЁ НЕ НАЙДЕНО'}</span><h3>${unlocked?e.reward.name:'Тайна дороги'}</h3><p>${unlocked?e.reward.description:'Продолжайте путь: дорога хранит свои подарки.'}</p>${unlocked?`<button class="text-button" data-event="${optionalFor(e)?.resultId||e.id}">Вспомнить историю ↗</button>`:''}</article>`;}).join('')}</div>`;
if(page==='settings')content.innerHTML=`<div class="settings-layout"><figure class="settings-traveler"><img src="assets/illustrations/traveler-welcome.png" alt="Путешественница на тропе в Шире" width="1090" height="1443"></figure><div class="settings">${heading('Настройки','Несколько деталей перед следующей дорогой.')}<form id="settings-form" class="panel"><h3>О путешественнике</h3><label>Имя путешественника<input name="name" value="${escapeHTML(state.name)}" maxlength="60"></label><label><input type="checkbox" name="tinted" ${state.tinted?'checked':''}>Мягкая цветокоррекция карты</label><button class="primary" type="submit">Применить настройки</button><div class="settings-status" role="status"></div></form><section class="panel"><h3>Сохранение и восстановление</h3><p class="muted">Сохраните своё путешествие в файл, чтобы перенести его на другой компьютер или восстановить прогресс. Данные хранятся только в вашем браузере.</p><div class="actions backup-actions"><button type="button" class="secondary" data-backup-export>Экспортировать сохранение</button><button type="button" class="secondary" data-backup-import>Импортировать сохранение</button></div><p class="backup-status settings-status" role="status"></p></section><section class="panel"><h3>Начать путешествие заново</h3><p class="muted">Все записи шагов, открытые истории, находки и решения будут удалены. Перед сбросом рекомендуем экспортировать сохранение.</p><button type="button" class="secondary reset-danger" data-reset-progress>Сбросить прогресс</button></section></div></div>`;
syncRouteAnimation();
observeMapPreview();
}
function openSteps(date=Progress.dateKey()){const form=document.querySelector('#steps-form');form.elements.date.value=date;form.elements.date.max=Progress.dateKey();form.elements.steps.value=state.records[date]??0;document.querySelector('#steps-error').textContent='';document.querySelector('#steps-dialog').showModal();form.elements.steps.focus();form.elements.steps.select();}
function closeEvent(){activeEvent=null;document.querySelector('#event-dialog').close();render();if(eventReturn?.isConnected)eventReturn.focus();else document.querySelector('nav button.active')?.focus();}
function showEvent(e,queued=false){
 if(!e)return;activeEvent={e,queued,result:!!e.resultOf};const next=nextEvent();
 const image=e.isArtifact?'<div class="secret-emblem" aria-hidden="true">'+artifactIcon(e)+'</div>':'<img class="event-art" src="'+escapeHTML(art(e))+'" data-placeholder="'+escapeHTML(e.placeholder||'assets/illustrations/hills.svg')+'" alt="'+escapeHTML(e.title)+'">';
 const reward=e.reward&&(!e.reward.conditional||state.rewards.includes(e.reward.id))?'<div class="reward"><strong>'+e.reward.icon+' '+escapeHTML(e.reward.name)+'</strong><small>'+escapeHTML(e.reward.kind)+'</small></div>':'';
 const body='<span class="eyebrow">'+escapeHTML(eventTypeLabel(e.type))+'</span>'+(e.isArtifact?image:'')+'<h2 id="event-title">'+escapeHTML(e.title)+'</h2><p>'+escapeHTML(e.text)+'</p>'+(e.resultOf?'':optionalControls(e))+reward;
 document.querySelector('#event-content').innerHTML=(e.isArtifact?'':image)+'<div class="event-body">'+body+(e.resultOf?'<p id="event-choice-error" role="alert"></p>':'<p class="muted">'+(next?'До следующей путевой точки осталось '+n(next.steps-total())+' шагов':'Конечная точка маршрута — Эребор.')+'</p>')+'<button class="primary" data-action="continue">'+(optionalFor(e)&&state.adventures[optionalFor(e).id]?.status==='pending_choice'?'Закрыть без выбора':queued?'Продолжить путешествие':'Вернуться к путешествию')+'</button></div>';
 const dialog=document.querySelector('#event-dialog');if(!dialog.open){eventReturn=document.activeElement;dialog.showModal();}dialog.querySelector('button').focus();
}
function openStory(id){
 const d=optionalEvents.find(d=>d.resultId===id);
 if(d){if(state.adventures[d.id]?.status==='completed')showEvent(resultCard(d));return;}
 const e=events.find(e=>e.id===id);if(!e||e.steps>total()||state.skipped?.[id])return;
 if(optionalFor(e)&&state.adventures[optionalFor(e).id]?.status==='pending_choice'){startPending();return;}
 showEvent(e);
}
function finishEvent(){
 if(!activeEvent)return;
 const {e,queued}=activeEvent;
 if(!queued){closeEvent();return;}
 const d=e.resultOf?optionalEvents.find(d=>d.id===e.resultOf):optionalFor(e);
 if(d&&!e.resultOf&&state.adventures[d.id]?.status==='pending_choice'){closeEvent();queue=[];return;}
 const candidate=cloneState();
 if(e.resultOf){candidate.adventures[d.id].status='completed';candidate.adventures[d.id].resultViewed=true;}
 if(!candidate.viewed.includes(e.id))candidate.viewed.push(e.id);
 if(e.reward&&!e.reward.conditional&&!candidate.rewards.includes(e.reward.id))candidate.rewards.push(e.reward.id);
 Progress.reconcile(candidate);if(!commitState(candidate))return;
 if(e.resultOf&&d.type==='flight'){cancelAnimationFrame(routeFrame);routeFrame=0;shownRouteDistance=routeGeometry.distanceAtSteps(total());routeTarget=shownRouteDistance;}
 closeEvent();startPending();
}
document.addEventListener('click',event=>{if(event.target.closest('[data-open-map]')){page='map';render();window.scrollTo(0,0);return;}const el=event.target.closest('button,[data-event]');if(!el)return;if(el.dataset.page){page=el.dataset.page;render();window.scrollTo(0,0);}if(el.dataset.action==='steps')openSteps();if(el.dataset.edit)openSteps(el.dataset.edit);if(el.dataset.close)document.getElementById(el.dataset.close).close();if(el.dataset.tone){state.tinted=el.dataset.tone==='tinted';persist();render();}if(el.dataset.event)openStory(el.dataset.event);if(el.dataset.optional)chooseOptional(el.dataset.optional);if(el.hasAttribute('data-resume-result'))startPending();if(el.dataset.action==='continue')finishEvent();});
document.addEventListener('keydown',event=>{if(event.target.matches('[data-open-map]')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();page='map';render();window.scrollTo(0,0);return;}if(event.target.matches('g[data-event]')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openStory(event.target.dataset.event);}});
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();page='home';render();});
document.addEventListener('error',event=>{
 const image=event.target;
 if(image.matches?.('img[data-artifact-icon]')){image.parentElement.textContent='◇';return;}
 if(image.matches?.('img[data-placeholder]')&&image.dataset.placeholder){const fallback=image.dataset.placeholder;delete image.dataset.placeholder;image.src=fallback;}
},true);
document.querySelector('#steps-form').addEventListener('submit',e=>{e.preventDefault();const f=e.target;try{const candidate=cloneState();Progress.record(candidate,f.elements.date.value,Number(f.elements.steps.value),events);Progress.reconcile(candidate);if(!commitState(candidate)){document.querySelector('#steps-error').textContent='Не удалось сохранить запись. Повторите попытку.';return;}document.querySelector('#steps-dialog').close();startPending();render();}catch(error){document.querySelector('#steps-error').textContent=error.message;}});
document.querySelector('#steps-form [name=date]').addEventListener('change',e=>{document.querySelector('#steps-form').elements.steps.value=state.records[e.target.value]??0;});
document.addEventListener('submit',e=>{if(e.target.id!=='settings-form')return;e.preventDefault();const f=e.target;state.name=f.elements.name.value.trim().slice(0,60);state.tinted=f.elements.tinted.checked;const saved=persist();render();document.querySelector('.settings-status').textContent=saved?'Настройки сохранены в этом браузере.':'Настройки применены, но не сохранены. См. сообщение выше.';});
const eventDialog=document.querySelector('#event-dialog');
let backdropPressed=false;
const isEventBackdrop=e=>{const r=eventDialog.getBoundingClientRect();return e.target===eventDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
eventDialog.addEventListener('pointerdown',e=>{backdropPressed=e.button===0&&isEventBackdrop(e);});
eventDialog.addEventListener('pointercancel',()=>{backdropPressed=false;});
eventDialog.addEventListener('click',e=>{const close=backdropPressed&&isEventBackdrop(e);backdropPressed=false;if(close&&eventDialog.open)finishEvent();});
eventDialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.repeat){e.preventDefault();e.stopPropagation();}});
eventDialog.addEventListener('cancel',e=>{e.preventDefault();finishEvent();});

function persist(){const result=JourneyStorage.save(state);const notice=document.querySelector('#save-error');notice.hidden=result.ok;notice.textContent=result.ok?'':result.error;return result.ok;}
function pendingEvents(){return events.filter(e=>e.steps<=total()&&!state.viewed.includes(e.id)&&!state.skipped?.[e.id]);}
function startPending(){
 if(!synchronize())return;render();
 const projection=Progress.project(state);
 if(projection.resultId){const d=optionalEvents.find(d=>d.resultId===projection.resultId);showEvent(resultCard(d),true);return;}
 queue=pendingEvents();if(queue.length)showEvent(queue.shift(),true);
}
function setWelcomeActive(active){document.querySelector('.sidebar').inert=active;document.querySelector('main').inert=active;document.body.classList.toggle('starting',active);}
let welcomeStep=1,welcomeName='',welcomeSteps=null,welcomeDate=null,welcomeStarting=false;
function renderWelcome(){
 const target=document.querySelector('#welcome-content');
 document.querySelector('#welcome').classList.toggle('welcome-final',welcomeStep===3);
 const crest='<span class="welcome-crest" aria-hidden="true">✧</span><span class="eyebrow">ДОРОГА ИЗ ШИРА</span>';
 if(welcomeStep===1)target.innerHTML=crest+'<h1 id="welcome-title">Добро пожаловать<br>в Средиземье</h1><p class="welcome-copy">Впереди — долгие дороги, тихие тропинки и множество удивительных встреч. Но прежде чем отправиться в путь, давайте познакомимся.</p><form id="welcome-name-form" novalidate><label>Как к вам обращаться?<input name="traveler" maxlength="60" autocomplete="given-name" aria-describedby="welcome-error" value="'+escapeHTML(welcomeName)+'"></label><p id="welcome-error" class="welcome-error" role="alert"></p><button class="primary" type="submit">Продолжить</button></form>';
 if(welcomeStep===1)target.insertAdjacentHTML('beforeend','<button type="button" class="text-button" data-backup-import>Импортировать сохранение</button>');
 if(welcomeStep===2)target.innerHTML=crest+'<h1 id="welcome-title">Первые шаги</h1><p class="welcome-copy">Быть может, сегодня вы уже успели немного прогуляться? Эти шаги могут стать началом вашего путешествия.</p><form id="welcome-steps-form" novalidate><label>Сколько шагов вы прошли сегодня?<input name="firstSteps" value="'+(welcomeSteps??'')+'" type="number" min="0" max="1000000" step="1" aria-describedby="steps-hint welcome-error"></label><p id="steps-hint" class="muted">Необязательно. Чтобы записать шаги позже, нажмите «Пропустить».</p><p id="welcome-error" class="welcome-error" role="alert"></p><div class="welcome-actions"><button type="button" class="secondary" data-welcome="skip">Пропустить</button><button class="primary" type="submit">Продолжить</button></div><button type="button" class="text-button welcome-back" data-welcome="back">← Исправить имя</button></form>';
 if(welcomeStep===3)target.innerHTML='<img class="traveler-final-art" src="assets/illustrations/traveler-welcome.png" alt="Путешественница идёт по Ширу; вверху — цитата Толкина" width="1090" height="1443"><p id="welcome-title" class="welcome-final-caption">Ваша дорога начинается здесь</p><button class="journey-start" data-welcome="start"><span aria-hidden="true">❧</span> Начать путешествие <span aria-hidden="true">❧</span></button><p id="welcome-error" class="welcome-error" role="alert"></p>';
 if(!reducedRouteMotion.matches)target.animate?.([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
 target.querySelector('input,button')?.focus();
}
document.addEventListener('submit',e=>{
 if(e.target.id==='welcome-name-form'){e.preventDefault();const field=e.target.elements.traveler;const value=field.value.trim();if(!value||value.length>60){document.querySelector('#welcome-error').textContent='Введите имя путешественника — от 1 до 60 символов.';field.setAttribute('aria-invalid','true');field.focus();return;}saveWelcomeDraft({step:2,name:value,steps:welcomeSteps,date:welcomeDate});}
 if(e.target.id==='welcome-steps-form'){e.preventDefault();const field=e.target.elements.firstSteps;const raw=field.value.trim();const steps=raw===''?null:Number(raw);if(raw===''||field.validity.badInput||!Number.isSafeInteger(steps)||steps<0||steps>1000000){document.querySelector('#welcome-error').textContent='Введите целое число от 0 до 1 000 000 или нажмите «Пропустить».';field.setAttribute('aria-invalid','true');field.focus();return;}saveWelcomeDraft({step:3,name:welcomeName,steps,date:Progress.dateKey()});}
});
document.addEventListener('click',e=>{const action=e.target.closest('[data-welcome]')?.dataset.welcome;if(action==='skip')saveWelcomeDraft({step:3,name:welcomeName,steps:null,date:null});if(action==='back')saveWelcomeDraft({step:1,name:welcomeName,steps:welcomeSteps,date:welcomeDate});if(action==='start')completeWelcome();});
function saveWelcomeDraft(draft){
 const candidate={...state,onboardingDraft:draft};
 const result=JourneyStorage.save(candidate);
 if(!result.ok){document.querySelector('#welcome-error').textContent=result.error;return;}
 state.onboardingDraft=draft;welcomeStep=draft.step;welcomeName=draft.name;welcomeSteps=draft.steps;welcomeDate=draft.date;renderWelcome();
}
function completeWelcome(){
 if(welcomeStarting||state.onboardingComplete)return;
 welcomeStarting=true;
 const startButton=document.querySelector('.journey-start');startButton.disabled=true;
 const candidate={...state,name:welcomeName,onboardingComplete:true,records:{...state.records}};
 delete candidate.onboardingDraft;
 if(welcomeSteps!==null)candidate.records[welcomeDate||Progress.dateKey()]=welcomeSteps;
 const result=JourneyStorage.save(candidate);
 if(!result.ok){welcomeStarting=false;startButton.disabled=false;document.querySelector('#welcome-error').textContent=result.error;return;}
 delete state.onboardingDraft;Object.assign(state,candidate);page='home';render();const welcome=document.querySelector('#welcome');welcome.classList.add('leaving');document.querySelector('.journey-start').disabled=true;
 setTimeout(()=>{welcome.hidden=true;setWelcomeActive(false);document.querySelector('nav button.active')?.focus();startPending();},220);
}
function initialize(){
 render();
 if(loaded.error){setWelcomeActive(true);document.querySelector('#welcome-content').innerHTML='<span class="welcome-crest">✧</span><h1 id="welcome-title">Сбережём вашу историю</h1><p class="welcome-error" role="alert">'+escapeHTML(loaded.error)+'</p><button class="secondary" id="retry-load">Повторить загрузку</button>';document.querySelector('#retry-load').addEventListener('click',()=>location.reload());return;}
 if(state.onboardingComplete){document.querySelector('#welcome').hidden=true;setWelcomeActive(false);startPending();}
 else{const draft=state.onboardingDraft;welcomeName=draft?.name??state.name;welcomeStep=draft?.step??1;welcomeSteps=draft?.steps??null;welcomeDate=draft?.date??null;setWelcomeActive(true);renderWelcome();}
}

// The dialog never changes state until the explicit confirmation succeeds.
const resetDialog=document.querySelector('#reset-dialog'),resetError=document.querySelector('#reset-error'),resetConfirm=document.querySelector('#reset-confirm');
let resetBusy=false,resetStartedOutside=false,resetOpener=null;
function cancelReset(){if(resetBusy)return;resetDialog.close();resetError.textContent='';resetStartedOutside=false;resetOpener?.focus();}
document.addEventListener('click',e=>{const button=e.target.closest('[data-reset-progress]');if(!button||resetBusy)return;resetOpener=button;resetError.textContent='';resetStartedOutside=false;resetConfirm.disabled=false;resetDialog.showModal();document.querySelector('#reset-cancel').focus();});
document.querySelector('#reset-cancel').addEventListener('click',cancelReset);
document.querySelector('#reset-close').addEventListener('click',cancelReset);
resetDialog.addEventListener('cancel',e=>{e.preventDefault();cancelReset();});
const outsideReset=e=>{const r=resetDialog.getBoundingClientRect();return e.target===resetDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
resetDialog.addEventListener('pointerdown',e=>{resetStartedOutside=e.button===0&&outsideReset(e);});
resetDialog.addEventListener('pointercancel',()=>{resetStartedOutside=false;});
resetDialog.addEventListener('click',e=>{if(resetStartedOutside&&outsideReset(e))cancelReset();resetStartedOutside=false;});
resetConfirm.addEventListener('click',()=>{
 if(resetBusy||!resetDialog.open)return;
 resetBusy=true;resetConfirm.disabled=true;
 const result=JourneyStorage.reset();
 if(!result.ok){resetError.textContent=result.error;resetBusy=false;resetConfirm.disabled=false;return;}
 // Replace the live object too: no handler can save the previous journey again.
 for(const key of Object.keys(state))delete state[key];Object.assign(state,result.state);
 queue=[];activeEvent=null;eventReturn=null;page='home';
 cancelAnimationFrame(routeFrame);routeFrame=0;shownRouteDistance=0;routeTarget=0;
 welcomeStep=1;welcomeName='';welcomeSteps=null;welcomeDate=null;welcomeStarting=false;
 document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
 resetDialog.close();
 render();const welcome=document.querySelector('#welcome');welcome.hidden=false;welcome.classList.remove('leaving');setWelcomeActive(true);renderWelcome();
 location.reload();
});
JourneyBackup.bind(()=>state);
initialize();


})();


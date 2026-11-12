const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const root=require('node:path').resolve(__dirname,'..');const chapter=JSON.parse(fs.readFileSync(root+'/data/shire.json','utf8'));
class MetricPath{setAttribute(k,v){if(k!=='d')return;this.d=v;const n=v.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);let a={x:n[0],y:n[1]};this.samples=[{...a,l:0}];for(let i=2;i<n.length;i+=6){const b={x:n[i],y:n[i+1]},c={x:n[i+2],y:n[i+3]},d={x:n[i+4],y:n[i+5]};for(let j=1;j<=500;j++){const t=j/500,u=1-t,p={x:u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*d.x,y:u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*d.y},last=this.samples.at(-1);p.l=last.l+Math.hypot(p.x-last.x,p.y-last.y);this.samples.push(p);}a=d;}}getTotalLength(){return this.samples.at(-1).l}getPointAtLength(l){if(l<=0)return this.samples[0];const i=this.samples.findIndex(p=>p.l>=l);if(i<0)return this.samples.at(-1);const a=this.samples[Math.max(0,i-1)],b=this.samples[i],t=b.l===a.l?0:(l-a.l)/(b.l-a.l);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}}


function boot(memory=new Map(),fail=false){const nodes=new Map(),listeners={};const node=k=>{if(!nodes.has(k))nodes.set(k,{innerHTML:'',insertAdjacentHTML(where,html){this.innerHTML+=html},hidden:false,style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},addEventListener(t,f){this[t]=f},focus(){},querySelector:s=>node(k+' '+s),showModal(){this.open=true},close(){this.open=false}});return nodes.get(k)};const ctx={console,Intl,Date,Math,Set,JSON,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},matchMedia:()=>({matches:true,addEventListener(){}}),localStorage:{getItem:k=>memory.get(k)??null,setItem(k,v){if(fail)throw Error('quota');memory.set(k,v)}},scrollTo(){},setTimeout:f=>f(),document:{createElementNS:()=>new MetricPath(),querySelector:node,querySelectorAll:()=>[],body:node('body'),addEventListener(t,f){(listeners[t]??=[]).push(f)}}};ctx.location={reload(){ctx.reloadCount=(ctx.reloadCount||0)+1}};ctx.Blob=Blob;ctx.downloadLog=[];ctx.URL={createObjectURL(blob){ctx.lastBlob=blob;ctx.downloadLog.push('create');return 'blob:test'},revokeObjectURL(){ctx.downloadLog.push('revoke')}};ctx.document.createElement=()=>({remove(){ctx.downloadLog.push('remove')},click(){ctx.downloadLog.push('click');ctx.lastFilename=this.download}});ctx.document.body.append=()=>ctx.downloadLog.push('append');ctx.localStorage.removeItem=k=>memory.delete(k);ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/js/geography.js','utf8'),ctx);const chapters=[chapter,...["bree","lonely-lands","rivendell","misty-mountains","mirkwood","erebor"].map(s=>JSON.parse(fs.readFileSync(root+"/data/"+s+".json","utf8")))].map((c,i,a)=>({...c,roman:["I","II","III","IV","V","VI","VII"][i],startSteps:i?a[i-1].events.at(-1).steps:0,endSteps:c.events.at(-1).steps}));ctx.JOURNEY={optionalEvents:JSON.parse(fs.readFileSync(root+"/data/optional-events.json","utf8")).events,chapters,events:chapters.flatMap(c=>c.events),segments:chapters.flatMap(c=>c.segments),totalKm:1654,totalSteps:2205333,map:{width:4911,height:3472,src:'assets/map/dai2tpel4r8a1.jpg'},route:ctx.SHIRE_GEOGRAPHY.anchors,geography:ctx.SHIRE_GEOGRAPHY};for(const f of ['progress','storage','route','backup'])vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),ctx);let app=fs.readFileSync(root+'/js/app.js','utf8');app=app.slice(app.indexOf('const loaded='),app.lastIndexOf('})();'));vm.runInContext(app,ctx);return{run:s=>vm.runInContext(s,ctx),node,memory,listeners};}

const KEY='road-from-shire.state.v3',plain=x=>JSON.parse(JSON.stringify(x));
const samples=[];
function sample(t){samples.push(plain(t.run('JourneyBackup.create(state)')));}
let t=boot();t.run("welcomeName='Бильбо';welcomeSteps=36000;welcomeDate='2026-01-01';completeWelcome()");while(t.run('activeEvent'))t.run('finishEvent()');sample(t);
// Declined caves, active research, completed finds, accepted and declined flight.
for(const decision of ['accept','decline']){
 t=boot();t.run("welcomeName='Фродо';welcomeSteps=1000000;welcomeDate='2026-01-01';completeWelcome();Progress.record(state,'2026-01-02',1000000,events);persist();startPending()");
 let guard=0;
 while(t.run('activeEvent')){
  assert.ok(++guard<300);
  if(t.run('!activeEvent.e.resultOf&&!!optionalFor(activeEvent.e)')){t.run('chooseOptional('+JSON.stringify(decision)+')');sample(t);}
  else {const result=t.run('!!activeEvent.e.resultOf');t.run('finishEvent()');if(result)sample(t);}
 }
 sample(t);
}
t=boot();t.run("welcomeName='Сэм';welcomeSteps=244000;welcomeDate='2026-01-01';completeWelcome()");while(t.run('activeEvent.e.id')!=='bree-014')t.run('finishEvent()');t.run("chooseOptional('accept');Progress.record(state,'2026-01-02',2000,events);persist();startPending()");sample(t);
function openReset(t){const opener={focus(){}};const event={target:{closest:selector=>selector==='[data-reset-progress]'?opener:null}};for(const listener of t.listeners.click)listener(event);assert.equal(t.node('#reset-dialog').open,true);}
for(const backup of samples){
 const memory=new Map([[KEY,JSON.stringify(backup.data)],[KEY+'.before-import','old backup'],['road-from-shire.state','legacy'],['teyvat.state','untouched'],['other','untouched']]);
 t=boot(memory);const original=t.run('JSON.stringify(state)');openReset(t);t.node('#reset-confirm').click();
 assert.deepEqual(JSON.parse(memory.get(KEY)),plain(t.run('Progress.initial()')));
 assert.equal(memory.get('teyvat.state'),'untouched');assert.equal(memory.get('other'),'untouched');assert.equal(memory.has(KEY+'.before-import'),false);assert.equal(memory.has('road-from-shire.state'),false);
 assert.equal(t.run('physicalTotal()'),0);assert.equal(t.run('total()'),0);assert.equal(t.run('activeEvent'),null);assert.equal(t.run('queue.length'),0);assert.equal(t.run('shownRouteDistance'),0);assert.equal(t.node('#welcome').hidden,false);assert.equal(t.run('reloadCount'),1);
 t=boot(memory);assert.equal(t.run('state.onboardingComplete'),false);assert.equal(t.run('state.name'),'');assert.equal(t.run('Object.keys(state.records).length'),0);assert.equal(t.run('Progress.project(state).states["EAGLE-01"].status'),'locked');
 const result=t.run('JourneyStorage.restore(JourneyBackup.parse('+JSON.stringify(JSON.stringify(backup))+').data,state)');assert.equal(result.ok,true);
 t=boot(memory);assert.deepEqual(plain(t.run('JourneyBackup.create(state).data')),backup.data);
}
// Cancellation via button, close icon, Escape, backdrop; no writes.
for(const mode of ['button','close','escape','backdrop','inside']){
 t=boot(new Map([[KEY,JSON.stringify(samples[0].data)]]));const before=JSON.stringify([...t.memory]);openReset(t);const d=t.node('#reset-dialog');
 if(mode==='button')t.node('#reset-cancel').click();if(mode==='close')t.node('#reset-close').click();if(mode==='escape')d.cancel({preventDefault(){}});
 if(['backdrop','inside'].includes(mode)){d.getBoundingClientRect=()=>({left:10,top:10,right:110,bottom:110});const e={target:d,button:0,clientX:mode==='inside'?50:0,clientY:mode==='inside'?50:0};d.pointerdown(e);d.click(e);}
 assert.equal(JSON.stringify([...t.memory]),before);
 assert.equal(d.open,mode==='inside');
}
// Failures and failed verification roll back every touched key and retain live state.
for(const mode of ['quota','verification','remove','rollback']){
 t=boot(new Map([[KEY,JSON.stringify(samples[0].data)],[KEY+'.before-import','copy'],['other','safe']]));const before=JSON.stringify([...t.memory]),stateBefore=t.run('JSON.stringify(state)');
 t.run('const realSet=localStorage.setItem,realRemove=localStorage.removeItem;let writes=0;');
 if(mode==='quota')t.run("localStorage.setItem=()=>{throw Error('quota')}");
 if(mode==='verification'||mode==='rollback')t.run("localStorage.setItem=(k,v)=>{writes++;if(writes===1){realSet(k,'bad');return;}"+(mode==='rollback'?"throw Error('rollback')":"realSet(k,v)")+"}");
 if(mode==='remove')t.run("localStorage.removeItem=k=>{if(k.endsWith('before-import'))throw Error('denied');realRemove(k)}");
 openReset(t);t.node('#reset-confirm').click();assert.equal(t.run('JSON.stringify(state)'),stateBefore);assert.ok(t.node('#reset-error').textContent);assert.equal(t.run('typeof reloadCount'),'undefined');assert.equal(t.node('#reset-confirm').disabled,false);
 if(mode!=='rollback')assert.equal(JSON.stringify([...t.memory]),before);
}
// Restart at zero then all five decisions and all 206 main events remain available.
t=boot(new Map([[KEY,JSON.stringify(samples.at(-2).data)]]));openReset(t);t.node('#reset-confirm').click();t=boot(t.memory);t.run("welcomeName='Новый путь';welcomeSteps=null;completeWelcome()");assert.equal(t.run('activeEvent.e.id'),'shire-001');assert.equal(t.run('total()'),0);
t.run("Progress.record(state,'2026-01-01',1000000,events);Progress.record(state,'2026-01-02',1000000,events);Progress.record(state,'2026-01-03',205333,events);persist();startPending()");let choices=0;while(t.run('activeEvent')){if(t.run('!activeEvent.e.resultOf&&!!optionalFor(activeEvent.e)')){choices++;t.run("chooseOptional('decline')");}else t.run('finishEvent()');}assert.equal(choices,5);assert.equal(t.run('state.viewed.length'),206);
assert.ok(!fs.readFileSync(root+'/js/storage.js','utf8').includes('localStorage.clear('));
console.log('PASS reset: '+samples.length+' journey states; clean reload; export-reset-import; unrelated keys; 4 cancellation methods; storage failures/rollback; fresh onboarding; 5 decisions and 206 events available again.');

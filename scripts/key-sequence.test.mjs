import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const source=fs.readFileSync('switch-scene.js','utf8');
const motion=fs.readFileSync('motion.js','utf8');
const poseSource=motion.match(/function inputPose\(p\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(poseSource,'Opening pose mapping is present');
const inputPose=vm.runInNewContext(`const clamp=n=>Math.max(0,Math.min(1,n));const part=(p,a,b)=>clamp((p-a)/(b-a));const ease=t=>t*t*(3-2*t);const mix=(a,b,t)=>a+(b-a)*t;${poseSource};inputPose`);
assert.equal(inputPose(.05),0,'Keystroke story starts at its first pose');
assert.equal(inputPose(.65),1,'Keystroke story completes before the gameplay handoff');
assert.ok(Math.abs(inputPose(.35)-.5)<1e-9,'Input story uses the full scroll interval');
assert.equal(inputPose(.84),1,'Input story holds its final pose through the handoff');
for(const p of[.05,.65])assert.ok(Math.abs(inputPose(p-1e-8)-inputPose(p+1e-8))<.00001,'Pose mapping remains continuous');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture({code=source,latency=70,decodeLatency=25,width=760,height=665,viewportWidth=1280,dpr=1,change,saveData=false,failFirst=false,study='processor',onFrameReady}={}){
  let now=0,fetches=0,decoders=0,maxFetches=0,maxDecoders=0,cancelled=0;
  const events=[],requests=[],bitmaps=[],draws=[],samples=[],decodeOptions=[];
  const later=(delay,run)=>events.push({at:now+delay,run});
  class Element extends EventTarget{
    constructor(){super();this.dataset={};this.children=[];}
    append(child){this.children.push(child);child.parent=this;}
    remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
    setAttribute(){}
  }
  class Canvas extends Element{
    width=300;height=150;
    getContext(){return{clearRect(){},drawImage(bitmap){assert.ok(!bitmap.closed);draws.push({index:bitmap.index,time:now});}};}
  }
  class Doc extends EventTarget{
    hidden=false;documentElement={classList:{contains:()=>false}};
    createElement(){return new Canvas();}
  }
  const doc=new Doc(),reduced=new EventTarget();reduced.matches=false;
  const manifest={version:1,width:1280,height:1120,frameCount:121,initialIndex:0,frames:Array.from({length:121},(_,index)=>({index,file:`key-${String(index).padStart(3,'0')}.webp`,progress:index/120,width:1280,height:1120,bytes:60000,sha256:index.toString(16).padStart(64,'0')}))};
  change?.(manifest);
  let observer;
  class ResizeObserver{constructor(fn){this.fn=fn;observer=this;}observe(){this.fn([{contentRect:{width,height}}]);}disconnect(){}}
  const fetch=async(url,{signal}={})=>{
    if(url.pathname.endsWith('manifest.json'))return{ok:true,json:async()=>manifest};
    const index=Number(url.pathname.match(/key-(\d+)(?:-960|-1280|-1600)?\.webp$/)[1]);
    const frame=(url.pathname.includes('-1280.webp')||url.pathname.includes('-1600.webp'))?manifest.balanced.frames[index]:url.pathname.includes('-960.webp')?manifest.compact.frames[index]:manifest.frames[index];
    requests.push({index,time:now,file:url.pathname});fetches++;maxFetches=Math.max(maxFetches,fetches);
    return new Promise((resolve,reject)=>{
      let done=false;
      const abort=()=>{if(done)return;done=true;fetches--;cancelled++;reject(new Error('aborted'));};
      signal.addEventListener('abort',abort,{once:true});
      const ok=!(failFirst&&requests.length===1);
      later(latency,()=>{if(done)return;done=true;fetches--;signal.removeEventListener('abort',abort);resolve({ok,blob:async()=>({index,size:frame.bytes,width:frame.width,height:frame.height})});});
    });
  };
  const createImageBitmap=(blob,options)=>new Promise(resolve=>{
    decodeOptions.push(options);decoders++;maxDecoders=Math.max(maxDecoders,decoders);
    later(decodeLatency,()=>{decoders--;const bitmap={index:blob.index,width:options.resizeWidth||blob.width,height:options.resizeHeight||blob.height,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);resolve(bitmap);});
  });
  const scope=vm.createContext({Element,document:doc,matchMedia:()=>reduced,ResizeObserver,fetch,createImageBitmap,AbortController,URL,innerWidth:viewportWidth,devicePixelRatio:dpr,performance:{now:()=>now},navigator:{connection:{saveData}},console});
  const module=new vm.SourceTextModule(code,{context:scope,initializeImportMeta(meta){meta.url=pathToFileURL(process.cwd()+'/switch-scene.js').href;}});
  await module.link(()=>{throw Error('Unexpected import');});await module.evaluate();
  const host=new Element(),abort=new AbortController(),api=await module.namespace.createSwitchScene(host,{signal:abort.signal,study,onFrameReady});await flush();
  async function advance(ms){
    const end=now+ms;let count=0;
    while(true){events.sort((a,b)=>a.at-b.at);if(!events.length||events[0].at>end)break;if(++count>100000)throw Error('Runaway decode queue');const event=events.shift();now=event.at;event.run();await flush();}
    now=end;await flush();
  }
  async function move(index){api.setProgress(index/(manifest.frameCount-1));await advance(1000/60);samples.push({target:index,shown:Number(host.dataset.switchFrame),time:now});}
  return{host,api,abort,doc,reduced,requests,bitmaps,draws,samples,decodeOptions,advance,move,resize(w,h){width=w;height=h;observer.observe();},stats:()=>({now,fetches,decoders,maxFetches,maxDecoders,cancelled})};
}

async function benchmark(code){
  const f=await fixture({code});await f.advance(4500);
  const start=f.draws.length,fetchStart=f.requests.length;
  for(let i=0;i<=120;i++)await f.move(i);
  for(let i=119;i>=0;i--)await f.move(i);
  await f.advance(200);
  const lags=f.samples.map(s=>Math.abs(s.target-s.shown)).sort((a,b)=>a-b);
  const result={steps:f.samples.length,paints:f.draws.length-start,exact:f.samples.filter(s=>s.target===s.shown).length,p95FrameLag:lags[Math.floor(lags.length*.95)],networkRequestsDuringScroll:f.requests.length-fetchStart,...f.stats()};
  assert.equal(Number(f.host.dataset.switchFrame),0,'Reverse settles on requested pose');
  f.api.dispose();await f.advance(500);assert.ok(f.bitmaps.every(b=>b.closed));
  return result;
}

const initial=await fixture();
assert.equal(initial.requests.length,1,'Opening frame owns first request');
await initial.advance(80);assert.equal(initial.draws.length,0,'Poster retained until decode completes');
await initial.advance(5000);assert.equal(initial.draws.at(-1).index,0);
assert.equal(initial.requests.length,121,'Compressed sequence warms once');
assert.ok(initial.stats().maxFetches<=4&&initial.stats().maxDecoders<=2);
const idle=initial.bitmaps.length;await initial.advance(1000);assert.equal(initial.bitmaps.length,idle,'Stable cache does not churn');
const calls=initial.requests.length;
await initial.move(20);await initial.advance(400);assert.equal(initial.draws.at(-1).index,20);
await initial.move(100);await initial.advance(400);await initial.move(20);await initial.advance(400);
assert.equal(initial.requests.length,calls,'Evicted decoded frames are rebuilt without refetching');
assert.equal(initial.draws.at(-1).index,20);
assert.ok(Number(initial.host.dataset.switchBitmapBytes)<=48*1024*1024);
assert.ok(Number(initial.host.dataset.switchEncodedBytes)<=32*1024*1024);
assert.ok(Number(initial.host.dataset.switchBitmapBytes)+32*1024*1024+2*1280*1120*4+960*840*4<=112*1024*1024);
initial.api.dispose();await initial.advance(500);assert.ok(initial.bitmaps.every(b=>b.closed));assert.equal(initial.host.children.length,0);assert.equal(initial.host.dataset.switchEncodedBytes,'0');

const fast=await fixture();await fast.advance(100);fast.api.setProgress(.1);await fast.advance(5);fast.api.setProgress(.8);await fast.advance(500);assert.equal(fast.draws.at(-1).index,96,'Rapid jump cannot flash an obsolete completion');
const before=fast.draws.length;fast.doc.hidden=true;fast.doc.dispatchEvent(new Event('visibilitychange'));fast.api.setProgress(.3);await fast.advance(1000);assert.equal(fast.draws.length,before,'Hidden scene stops decoding and painting');
fast.doc.hidden=false;fast.doc.dispatchEvent(new Event('visibilitychange'));await fast.advance(1000);assert.equal(fast.draws.at(-1).index,36);
fast.doc.dispatchEvent(Object.assign(new Event('portfolio:motion'),{detail:{off:true}}));await fast.advance(300);assert.ok(fast.bitmaps.every(b=>b.closed));assert.equal(fast.host.children.length,0);
const aborted=await fixture();aborted.abort.abort();await aborted.advance(500);assert.equal(aborted.draws.length,0);assert.equal(aborted.host.children.length,0);

const invalid=await fixture({change:m=>{m.frames[3].file='../bad.webp';}});assert.equal(invalid.host.dataset.switchState,'fallback');assert.equal(invalid.requests.length,0);
const unordered=await fixture({change:m=>{m.frames[3].progress=m.frames[2].progress;}});assert.equal(unordered.host.dataset.switchState,'fallback');assert.equal(unordered.requests.length,0);
const nonuniform=await fixture({change:m=>{
  const positions=m.frames.map(f=>f.progress);
  for(let p=291;p<380;p++)if(!positions.includes(p/1000))positions.push(p/1000);
  positions.sort((a,b)=>a-b);
  m.frames=positions.map((progress,index)=>({index,progress,file:`key-${String(index).padStart(3,'0')}.webp`,width:1280,height:1120,bytes:60000,sha256:index.toString(16).padStart(64,'0')}));
  m.frameCount=m.frames.length;m.initialIndex=positions.indexOf(0);
}});
await nonuniform.advance(6500);assert.equal(nonuniform.host.dataset.switchProgress,'0.0000','Initial source pose survives nonuniform indexing');
for(const progress of[.379,.335,.291,.335,.379]){nonuniform.api.setProgress(progress);await nonuniform.advance(300);assert.equal(nonuniform.host.dataset.switchProgress,progress.toFixed(4),'Nonuniform pose is selected by scene progress');}
nonuniform.api.setProgress(.3354);await nonuniform.advance(300);assert.equal(nonuniform.host.dataset.switchProgress,'0.3350','Nearest physical pose selected between dense samples');
nonuniform.api.setProgress(.38);await nonuniform.advance(300);
const denseErrors=[];
for(let step=0;step<=360;step++){
  const target=step<=180?.38-.09*step/180:.29+.09*(step-180)/180;
  nonuniform.api.setProgress(target);await nonuniform.advance(1000/60);
  denseErrors.push(Math.abs(target-Number(nonuniform.host.dataset.switchProgress)));
}
denseErrors.sort((a,b)=>a-b);
assert.ok(denseErrors[Math.floor(denseErrors.length*.95)]<=.00101,'Nonuniform movement and reversal stay within one physical pose at 60 Hz input');
nonuniform.api.dispose();await nonuniform.advance(300);assert.ok(nonuniform.bitmaps.every(b=>b.closed));
const oversize=await fixture({change:m=>{m.frames.forEach(f=>f.bytes=500000);}});assert.equal(oversize.host.dataset.switchState,'fallback');assert.equal(oversize.requests.length,0);
const dedup=await fixture({change:m=>{m.frames[1].sha256=m.frames[0].sha256;}});await dedup.advance(5000);assert.equal(dedup.requests.length,120,'Identical held poses share compressed storage');dedup.api.dispose();await dedup.advance(300);
const saver=await fixture({saveData:true});await saver.advance(5000);assert.ok(saver.requests.length<30,'Save-Data limits downloads to the nearby window');saver.api.dispose();await saver.advance(300);
const failed=await fixture({failFirst:true});await failed.advance(1000);assert.equal(failed.draws.length,0);assert.equal(failed.host.dataset.switchState,'fallback');await failed.move(20);await failed.advance(500);assert.equal(failed.draws.at(-1).index,20);failed.api.dispose();await failed.advance(100);

const improved=await benchmark(source);
assert.equal(improved.networkRequestsDuringScroll,0);
assert.ok(improved.p95FrameLag<=1,'Warm 60 Hz traversal remains within one pose');
assert.ok(improved.exact/improved.steps>.95,'At least 95% of warm targets present within a display interval');
const compact=await fixture({change:m=>{m.compact={width:960,height:840,frames:m.frames.map(f=>({...f,width:960,height:840,file:f.file.replace('.webp','-960.webp'),bytes:20000,sha256:'c'+f.sha256.slice(1)}))};}});await compact.advance(5000);assert.equal(compact.draws.at(-1).index,0);assert.ok(compact.bitmaps.every(b=>b.width===960));assert.equal(Number(compact.host.dataset.switchEncodedBytes),121*20000);
compact.resize(1800,1575);await compact.advance(5000);assert.ok(compact.bitmaps.some(b=>!b.closed&&b.width===1280),'Larger display upgrades to original frames');assert.equal(Number(compact.host.dataset.switchEncodedBytes),121*80000);assert.ok(Number(compact.host.dataset.switchBitmapBytes)<=48*1024*1024);compact.api.dispose();await compact.advance(300);
const report={passed:true,conditions:'Deterministic 60 Hz input, 70 ms network latency, 25 ms decode, 4.5 s initial dwell; not measured browser FPS',improved};
// A second authored scene must retain the same bounded decoder and lifecycle.
const trumpet=await fixture({study:'trumpet',width:1320,height:742,change:m=>{
  m.width=1920;m.height=1080;
  m.frames=m.frames.map(f=>({...f,width:1920,height:1080}));
  m.compact={width:960,height:540,frames:m.frames.map(f=>({...f,width:960,height:540,file:f.file.replace('.webp','-960.webp'),bytes:20000,sha256:'c'+f.sha256.slice(1)}))};
}});
await trumpet.advance(5000);
for(const index of [0,30,100,45,0]){await trumpet.move(index);await trumpet.advance(400);assert.equal(trumpet.draws.at(-1).index,index);}
assert.ok(Number(trumpet.host.dataset.switchBitmapBytes)<=48*1024*1024,'Landscape frames remain within the decoded budget');
assert.ok(trumpet.stats().maxFetches<=4&&trumpet.stats().maxDecoders<=2);
trumpet.api.dispose();await trumpet.advance(500);assert.ok(trumpet.bitmaps.every(b=>b.closed));
const wrongStudy=await fixture({study:'trumpet'});assert.equal(wrongStudy.host.dataset.switchState,'fallback');assert.equal(wrongStudy.requests.length,0,'A processor manifest cannot masquerade as a trumpet sequence');
await assert.rejects(()=>fixture({study:'https://untrusted.invalid/manifest.json'}),/Unknown authored study/);
if(process.argv[2])report.before=await benchmark(fs.readFileSync(process.argv[2],'utf8'));
console.log(JSON.stringify(report,null,2));

const typingScene=await fixture({study:'keystroke',change:m=>{m.width=1600;m.height=1400;m.frameCount=181;m.frames=Array.from({length:181},(_,index)=>({index,file:`key-${String(index).padStart(3,'0')}.webp`,progress:index/180,width:1600,height:1400,bytes:65000,sha256:index.toString(16).padStart(64,'0')}));}});
await typingScene.advance(5000);for(const index of [0,50,150,25,180]){await typingScene.move(index);await typingScene.advance(400);assert.equal(typingScene.draws.at(-1).index,index);}
assert.ok(Number(typingScene.host.dataset.switchBitmapBytes)<=48*1024*1024);typingScene.api.dispose();await typingScene.advance(500);assert.ok(typingScene.bitmaps.every(b=>b.closed));

const phone=await fixture({viewportWidth:390,dpr:3,width:390,height:341,change:m=>{m.compact={width:960,height:840,frames:m.frames.map(f=>({...f,width:960,height:840,file:f.file.replace('.webp','-960.webp'),bytes:20000,sha256:'c'+f.sha256.slice(1)}))};}});
await phone.advance(5000);
for(const index of [0,40,100,20,120,0]){await phone.move(index);await phone.advance(400);assert.equal(phone.draws.at(-1).index,index);assert.ok(Number(phone.host.dataset.switchBitmapBytes)<=24*1024*1024,'Phone decoded frames stay within 24 MiB');}
assert.ok(phone.requests.every(r=>r.file.endsWith('-960.webp')),'High-DPR phone downloads compact frames');
assert.ok(phone.bitmaps.every(b=>b.width<=960),'Phone decodes within the compact tier');
phone.api.dispose();await phone.advance(300);assert.ok(phone.bitmaps.every(b=>b.closed));

let notifications=0;
const coordinated=await fixture({onFrameReady:()=>notifications++});
await coordinated.advance(5000);
assert.ok(notifications>0,'Decoded frames wake the page frame owner');
assert.equal(coordinated.draws.length,0,'Decode completion never paints outside the page frame');
coordinated.api.setProgress(0);await coordinated.advance(5000);
assert.equal(coordinated.draws.at(-1).index,0);
const paints=coordinated.draws.length;
coordinated.api.setProgress(.8);await coordinated.advance(500);
assert.equal(coordinated.draws.length,paints,'Async completion waits for display frame');
coordinated.api.setProgress(.8);assert.equal(coordinated.draws.at(-1).index,96);
assert.ok(coordinated.decodeOptions.every(o=>!o.resizeWidth&&!o.resizeHeight),'Authored native tiers avoid per-frame bitmap resampling');
const stable=coordinated.bitmaps.length;
for(let i=0;i<100;i++)coordinated.api.setProgress(.8);
await coordinated.advance(1000);assert.equal(coordinated.bitmaps.length,stable,'Unchanged pose does not restart decode work');
coordinated.api.dispose();const closedNotifications=notifications;await coordinated.advance(500);
assert.equal(notifications,closedNotifications);assert.ok(coordinated.bitmaps.every(b=>b.closed));
console.log('Native decode tiers and page-owned frame presentation passed.');

let resizeSignals=0;
const ownerResize=await fixture({width:760,height:665,onFrameReady:()=>resizeSignals++,change:m=>{m.compact={width:960,height:840,frames:m.frames.map(f=>({...f,width:960,height:840,file:f.file.replace('.webp','-960.webp'),bytes:20000,sha256:'c'+f.sha256.slice(1)}))};}});
await ownerResize.advance(5000);ownerResize.api.setProgress(0);await ownerResize.advance(5000);
ownerResize.resize(1800,1575);await ownerResize.advance(5000);
const oldPaints=ownerResize.draws.length;ownerResize.api.setProgress(0);
assert.equal(ownerResize.draws.length,oldPaints+1,'Same-pose sharp replacement paints on the owner frame');
assert.ok(ownerResize.bitmaps.some(b=>!b.closed&&b.index===0&&b.width===1280));ownerResize.api.dispose();
const balanced=await fixture({study:'keystroke',width:1100,height:962,change:m=>{
 m.width=1600;m.height=1400;m.frames=m.frames.map(f=>({...f,width:1600,height:1400}));
 m.balanced={width:1280,height:1120,frames:m.frames.map(f=>({...f,width:1280,height:1120,file:f.file.replace('.webp','-1280.webp'),bytes:30000,sha256:'b'+f.sha256.slice(1)}))};
}});
await balanced.advance(5000);assert.ok(balanced.requests.every(r=>!r.file.includes('-1280')),'Full-size display preserves original source');
balanced.resize(800,700);await balanced.advance(5000);assert.ok(balanced.requests.some(r=>r.file.endsWith('-1280.webp')),'Intermediate display uses pre-sized desktop tier');
assert.ok(balanced.decodeOptions.every(o=>!o.resizeWidth));balanced.api.dispose();
const invalidBalanced=await fixture({change:m=>{m.balanced={width:1280,height:1120,frames:m.frames};}});
assert.equal(invalidBalanced.host.dataset.switchState,'fallback','Unexpected delivery tiers fail closed');

let ownerPending=false;
const movingOwner=await fixture({onFrameReady:()=>{ownerPending=true;}});
await movingOwner.advance(4500);movingOwner.api.setProgress(0);await movingOwner.advance(4500);
const ownerLags=[];
for(const index of [...Array.from({length:121},(_,i)=>i),...Array.from({length:120},(_,i)=>119-i)]){
 movingOwner.api.setProgress(index/120);ownerPending=false;await movingOwner.advance(1000/60);
 if(ownerPending)movingOwner.api.setProgress(index/120);
 ownerLags.push(Math.abs(index-Number(movingOwner.host.dataset.switchFrame)));
}
ownerLags.sort((a,b)=>a-b);assert.ok(ownerLags[Math.floor(ownerLags.length*.95)]<=1,'Page-owned continuous forward/reverse traversal stays within one pose');
movingOwner.api.dispose();await movingOwner.advance(300);assert.ok(movingOwner.bitmaps.every(b=>b.closed));

const fastTrumpet=await fixture({study:'trumpet',width:1320,height:742,change:m=>{
 m.width=1920;m.height=1080;m.frames=m.frames.map(f=>({...f,width:1920,height:1080}));
 m.balanced={width:1600,height:900,frames:m.frames.map(f=>({...f,width:1600,height:900,file:f.file.replace('.webp','-1600.webp'),bytes:40000,sha256:'b'+f.sha256.slice(1)}))};
}});
await fastTrumpet.advance(4500);
assert.ok(fastTrumpet.requests.every(r=>r.file.endsWith('-1600.webp')),'Desktop trumpet selects ready-sized native tier');
for(const i of [0,40,100,30,120,0]){await fastTrumpet.move(i);await fastTrumpet.advance(250);assert.equal(fastTrumpet.api.getFrame(),i);}
assert.ok(fastTrumpet.decodeOptions.every(o=>!o.resizeWidth));assert.ok(Number(fastTrumpet.host.dataset.switchBitmapBytes)<=48*1024*1024);
fastTrumpet.api.dispose();await fastTrumpet.advance(300);assert.ok(fastTrumpet.bitmaps.every(b=>b.closed));
const warming=await fixture({onFrameReady:()=>{}});await warming.advance(5000);
assert.equal(warming.draws.length,0);assert.equal(warming.requests.length,121,'Offscreen warmup does not wait for its first paint');warming.api.dispose();

assert.equal(fastTrumpet.api.getFrame(),-1,'Disposed or failed scene exposes the poster frame, never a stale monitor pose');

let fallbackWakes=0;
const lost=await fixture({onFrameReady:()=>fallbackWakes++});await lost.advance(5000);lost.api.setProgress(0);
const wakesBefore=fallbackWakes;
lost.host.children[0].dispatchEvent(new Event('contextlost',{cancelable:true}));
assert.equal(lost.api.getFrame(),-1);assert.equal(fallbackWakes,wakesBefore+1,'Internal context failure wakes the owner to hide its stale projection');assert.equal(lost.host.children.length,0);

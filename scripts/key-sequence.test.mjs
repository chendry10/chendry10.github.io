import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const source=fs.readFileSync('switch-scene.js','utf8');
const motion=fs.readFileSync('motion.js','utf8');
const poseSource=motion.match(/function inputPose\(p\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(poseSource,'Opening pose mapping is present');
const inputPose=vm.runInNewContext(`const clamp=n=>Math.max(0,Math.min(1,n));const part=(p,a,b)=>clamp((p-a)/(b-a));const ease=t=>t*t*(3-2*t);const mix=(a,b,t)=>a+(b-a)*t;${poseSource};inputPose`);
assert.equal(inputPose(.05),0,'CPU starts closed');
assert.equal(inputPose(.65),1,'CPU fully opens before the gameplay handoff');
assert.ok(Math.abs(inputPose(.35)-.5)<1e-9,'Layer reveal uses the full scroll interval');
assert.equal(inputPose(.84),1,'CPU holds its final pose through the handoff');
for(const p of[.05,.65])assert.ok(Math.abs(inputPose(p-1e-8)-inputPose(p+1e-8))<.00001,'Pose mapping remains continuous');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture({code=source,latency=70,decodeLatency=25,width=760,height=665,change,saveData=false,failFirst=false}={}){
  let now=0,fetches=0,decoders=0,maxFetches=0,maxDecoders=0,cancelled=0;
  const events=[],requests=[],bitmaps=[],draws=[],samples=[];
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
    const index=Number(url.pathname.match(/key-(\d+)(?:-960)?\.webp$/)[1]);
    const frame=url.pathname.includes('-960.webp')?manifest.compact.frames[index]:manifest.frames[index];
    requests.push({index,time:now});fetches++;maxFetches=Math.max(maxFetches,fetches);
    return new Promise((resolve,reject)=>{
      let done=false;
      const abort=()=>{if(done)return;done=true;fetches--;cancelled++;reject(new Error('aborted'));};
      signal.addEventListener('abort',abort,{once:true});
      const ok=!(failFirst&&requests.length===1);
      later(latency,()=>{if(done)return;done=true;fetches--;signal.removeEventListener('abort',abort);resolve({ok,blob:async()=>({index,size:frame.bytes,width:frame.width,height:frame.height})});});
    });
  };
  const createImageBitmap=(blob,options)=>new Promise(resolve=>{
    decoders++;maxDecoders=Math.max(maxDecoders,decoders);
    later(decodeLatency,()=>{decoders--;const bitmap={index:blob.index,width:options.resizeWidth||blob.width,height:options.resizeHeight||blob.height,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);resolve(bitmap);});
  });
  const scope=vm.createContext({Element,document:doc,matchMedia:()=>reduced,ResizeObserver,fetch,createImageBitmap,AbortController,URL,devicePixelRatio:1,performance:{now:()=>now},navigator:{connection:{saveData}},console});
  const module=new vm.SourceTextModule(code,{context:scope,initializeImportMeta(meta){meta.url=pathToFileURL(process.cwd()+'/switch-scene.js').href;}});
  await module.link(()=>{throw Error('Unexpected import');});await module.evaluate();
  const host=new Element(),abort=new AbortController(),api=await module.namespace.createSwitchScene(host,{signal:abort.signal});await flush();
  async function advance(ms){
    const end=now+ms;let count=0;
    while(true){events.sort((a,b)=>a.at-b.at);if(!events.length||events[0].at>end)break;if(++count>100000)throw Error('Runaway decode queue');const event=events.shift();now=event.at;event.run();await flush();}
    now=end;await flush();
  }
  async function move(index){api.setProgress(index/120);await advance(1000/60);samples.push({target:index,shown:Number(host.dataset.switchFrame),time:now});}
  return{host,api,abort,doc,reduced,requests,bitmaps,draws,samples,advance,move,resize(w,h){width=w;height=h;observer.observe();},stats:()=>({now,fetches,decoders,maxFetches,maxDecoders,cancelled})};
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
if(process.argv[2])report.before=await benchmark(fs.readFileSync(process.argv[2],'utf8'));
console.log(JSON.stringify(report,null,2));

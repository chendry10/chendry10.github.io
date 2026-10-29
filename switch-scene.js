/**
 * Blender-rendered product studies. Native scrolling owns time and progress;
 * compressed images warm ahead of scrolling; a bounded moving decode window
 * paints complete frames without putting network round trips in the scroll path.
 * No decoder seek loop, WebGL context, wheel interception or animation loop.
 */
const scenes=new WeakMap();
const MANIFEST_URL=new URL('./shared/assets/product/processor-sequence/manifest.json',import.meta.url);
const MAX_CANVAS_PIXELS=1_500_000;
const MAX_BITMAP_BYTES=48*1024*1024;
const MAX_ENCODED_BYTES=32*1024*1024;
const MAX_WORKING_BYTES=112*1024*1024;
const CONCURRENCY=2;
const FETCH_CONCURRENCY=4;
const MAX_FRAME_LAG=8;
const TIERS=[640,960,1280,1600];
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));

export async function createSwitchScene(host,{signal,study='processor'}={}){
  if(!['processor','trumpet','keystroke'].includes(study))throw new TypeError('Unknown authored study.');
  const sequenceURL=study==='trumpet'?new URL('./shared/assets/product/trumpet-sequence/manifest.json',import.meta.url):study==='keystroke'?new URL('./shared/assets/product/keystroke-sequence/manifest.json',import.meta.url):MANIFEST_URL;
  const dimensions=study==='trumpet'?[1920,1080,960,540]:study==='keystroke'?[1600,1400,960,840]:[1280,1120,960,840];
  if(!(host instanceof Element))throw new TypeError('A sized switch host is required.');
  scenes.get(host)?.dispose();
  const canvas=document.createElement('canvas');
  canvas.className='switch-canvas';
  canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');
  host.append(canvas);
  let context=null;
  try{context=canvas.getContext('2d',{alpha:true,desynchronized:true});}catch{}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const manifestAbort=new AbortController();
  const cache=new Map(),pending=new Map(),encoded=new Map(),network=new Map(),failures=new Map();
  const networkFailures=new Set();
  const saveData=typeof navigator==='object'&&navigator.connection?.saveData===true;
  let manifest=null,resizeObserver=null,dead=false,visible=!document.hidden;
  let width=0,height=0,sizeDirty=true,bitmapBytes=0,clock=0,renderCount=0;
  let progress=0,wanted=0,painted=-1,direction=1,drawTier=640;
  let lastDrawWidth=0,lastDrawHeight=0,encodedBytes=0,fetchCount=0,decodeCount=0,decodeTotal=0;
  const owned=()=>scenes.get(host)===api;
  const quiet=()=>document.documentElement.classList.contains('motion-off')||reduced.matches;
  const data=(key,value)=>{if(owned()&&host.dataset[key]!==value)host.dataset[key]=value;};
  const diagnostics=()=>{
    data('switchBitmapBytes',String(bitmapBytes));
    data('switchCacheCount',String(cache.size));
    data('switchInflight',String(pending.size));
    data('switchFetches',String(network.size));
    data('switchEncodedBytes',String(encodedBytes));
    data('switchEncodedCount',String(encoded.size));
    data('switchFetchCount',String(fetchCount));
    data('switchDecodeMs',decodeCount?(decodeTotal/decodeCount).toFixed(2):'0');
  };
  const phase=value=>value<.1?'closed':value<.8?'opening':'expanded';
  const frameFor=(index,tier=drawTier)=>tier<=960&&manifest.compact?manifest.compact.frames[index]:manifest.frames[index];
  // Use physical scene progress so the player also supports denser sampling
  // where a future render needs it, without changing its scroll choreography.
  function nearestFrame(value){
    if(!manifest)return Math.round(value*100);
    const frames=manifest.frames;
    let lo=0,hi=frames.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid].progress<value)lo=mid+1;else hi=mid;}
    return lo>0&&value-frames[lo-1].progress<frames[lo].progress-value?lo-1:lo;
  }
  function canvasSize(){
    if(dead||!context||width<2||height<2)return false;
    if(!sizeDirty)return true;
    // The enlarged keyboard opening needs enough pixels for its 1.25x intro pose.
    const ratio=study==='keystroke'?1.5:Math.min(devicePixelRatio||1,1.5);
    const scale=Math.min(1,Math.sqrt(MAX_CANVAS_PIXELS/(width*height*ratio*ratio)));
    const w=Math.max(1,Math.floor(width*ratio*scale)),h=Math.max(1,Math.floor(height*ratio*scale));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    if(manifest){
      const fittedWidth=Math.max(w,h*manifest.width/manifest.height);
      drawTier=Math.min(manifest.width,TIERS.find(tier=>tier>=fittedWidth)||manifest.width);
    }
    data('switchPixels',String(w*h));
    sizeDirty=false;
    return true;
  }
  // Reserve room for the canvas and two full source decodes as well as the
  // retained bitmaps. This is an owned-resource budget, not a browser RSS claim.
  function retainedLimit(){
    const reserved=MAX_ENCODED_BYTES+canvas.width*canvas.height*4+CONCURRENCY*(manifest?.width||1600)*(manifest?.height||1400)*4;
    return Math.max(12*1024*1024,Math.min(MAX_BITMAP_BYTES,MAX_WORKING_BYTES-reserved));
  }
  function drop(index){
    const entry=cache.get(index);if(!entry)return;
    cache.delete(index);bitmapBytes-=entry.bytes;entry.bitmap.close();
  }
  function trim(){
    const limit=retainedLimit();
    while(bitmapBytes>limit){
      const victim=[...cache].filter(([index])=>index!==painted).sort((a,b)=>a[1].used-b[1].used)[0];
      if(!victim)break;
      drop(victim[0]);
    }
    diagnostics();
  }
  function paint(index){
    if(dead||!visible||quiet()||!canvasSize())return false;
    const entry=cache.get(index);if(!entry)return false;
    const resize=lastDrawWidth!==canvas.width||lastDrawHeight!==canvas.height;
    if(painted===index&&!resize&&entry.painted)return true;
    const scale=Math.max(canvas.width/entry.bitmap.width,canvas.height/entry.bitmap.height);
    const w=entry.bitmap.width*scale,h=entry.bitmap.height*scale;
    try{
      context.clearRect(0,0,canvas.width,canvas.height);
      context.drawImage(entry.bitmap,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    }catch{fallback('canvas-unavailable');return false;}
    entry.used=++clock;entry.painted=true;painted=index;
    lastDrawWidth=canvas.width;lastDrawHeight=canvas.height;
    data('switchState','ready');data('switchFrame',String(index));
    if(owned())delete host.dataset.switchFallback;
    const shown=manifest.frames[index].progress;
    data('switchProgress',shown.toFixed(4));data('switchPhase',phase(shown));
    data('switchFrameLag',String(Math.abs(wanted-index)));
    data('switchRenderCount',String(++renderCount));data('switchDrawcalls','0');
    return true;
  }
  function present(){
    if(cache.has(wanted))return paint(wanted);
    const reference=painted<0?(manifest?.initialIndex??0):painted;
    const distance=Math.abs(wanted-reference),catchingUp=distance>MAX_FRAME_LAG;
    let nearest=null,nearestDistance=Infinity;
    for(const index of cache.keys()){
      const lag=Math.abs(wanted-index);
      // Stay behind the moving target. Future-side completions would flash
      // the wrong pose during a reversal, even when their numeric lag is small.
      if(lag>MAX_FRAME_LAG||(index-wanted)*direction>0||lag>=distance)continue;
      // Within the current range, every new image must move monotonically
      // toward the target. A large scroll jump can establish a near-range
      // baseline first; subsequent images again follow the current direction.
      if(!catchingUp&&(index-reference)*direction<=0)continue;
      if(lag<nearestDistance){nearest=index;nearestDistance=lag;}
    }
    return nearest===null?false:paint(nearest);
  }
  function cancelFarRequests(){
    for(const [index,job]of pending){
      if(Math.abs(index-wanted)>MAX_FRAME_LAG)job.controller.abort();
    }
  }
  function fallback(reason){
    const wasOwned=owned();api.dispose();
    if(wasOwned&&!scenes.has(host)&&!signal?.aborted){host.dataset.switchState='fallback';host.dataset.switchFallback=reason;}
  }
  function candidates(){
    const list=[wanted];
    // Fit the entire decode window plus the displayed frame and two jobs.
    // Previously an evicted neighbour was permanently marked "prefetched",
    // so reversing a warm sequence still waited for an exact-target decode.
    const bytes=drawTier*Math.round(drawTier*manifest.height/manifest.width)*4;
    const count=Math.max(3,Math.min(24,Math.floor(retainedLimit()/bytes)-3));
    for(let offset=1;list.length<count&&offset<manifest.frameCount;offset++){
      for(const delta of[offset*direction,-offset*direction]){
        const index=wanted+delta;
        if(index>=0&&index<manifest.frameCount&&list.length<count)list.push(index);
      }
    }
    return list;
  }
  function fetchAhead(indices){
    // The hero gets the first request. Only after it paints do background
    // transfers begin; identical held poses share one compressed Blob.
    const limit=painted<0?1:FETCH_CONCURRENCY;
    const order=[...indices];
    if(painted>=0&&!saveData){
      for(let offset=1;offset<manifest.frameCount;offset++){
        for(const index of[wanted+offset*direction,wanted-offset*direction]){
          if(index>=0&&index<manifest.frameCount)order.push(index);
        }
      }
    }
    for(const index of order){
      if(network.size>=limit)break;
      const frame=frameFor(index),hash=frame.sha256;
      if(encoded.has(hash)||network.has(hash)||networkFailures.has(hash))continue;
      const controller=new AbortController();network.set(hash,controller);fetchCount++;
      void fetchFrame(frame,controller);
    }
  }
  async function fetchFrame(frame,controller){
    try{
      const url=new URL(frame.file,sequenceURL);url.searchParams.set('v',frame.sha256.slice(0,12));
      const response=await fetch(url,{signal:controller.signal,priority:painted<0?'high':'low'});
      if(!response.ok)throw new Error('Frame unavailable');
      const blob=await response.blob();
      if(blob.size!==frame.bytes)throw new Error('Frame size differs from manifest');
      if(dead||controller.signal.aborted)return;
      if(encodedBytes+blob.size>MAX_ENCODED_BYTES)throw new Error('Encoded sequence budget exceeded');
      encoded.set(frame.sha256,blob);encodedBytes+=blob.size;
    }catch{
      if(!dead&&!controller.signal.aborted){
        networkFailures.add(frame.sha256);
        if(painted<0)data('switchState','fallback');
        data('switchFallback','frame-unavailable');
      }
    }finally{
      if(network.get(frame.sha256)===controller)network.delete(frame.sha256);
      if(!dead){diagnostics();pump();}
    }
  }
  function pump(){
    if(dead||!manifest||!visible||quiet()||!canvasSize())return;
    const indices=candidates();fetchAhead(indices);
    for(const index of indices){
      if(pending.size>=CONCURRENCY)break;
      const entry=cache.get(index),key=`${index}:${drawTier}`;
      if(entry&&entry.bitmap.width>=drawTier)continue;
      if(pending.has(index)||!encoded.has(frameFor(index).sha256))continue;
      if(failures.has(key))continue;
      const controller=new AbortController(),job={controller,key,tier:drawTier};
      pending.set(index,job);diagnostics();
      void load(index,job);
    }
  }
  async function load(index,job){
    let bitmap=null;
    try{
      const sourceFrame=frameFor(index,job.tier),blob=encoded.get(sourceFrame.sha256);
      if(dead||job.controller.signal.aborted)return;
      const decodeHeight=Math.round(job.tier*manifest.height/manifest.width);
      const started=performance.now();
      bitmap=await createImageBitmap(blob,sourceFrame.width===job.tier?{}:{resizeWidth:job.tier,resizeHeight:decodeHeight,resizeQuality:'high'});
      decodeTotal+=performance.now()-started;decodeCount++;
      if(dead||job.controller.signal.aborted){bitmap.close();bitmap=null;return;}
      if(bitmap.width!==job.tier||bitmap.height!==decodeHeight)throw new Error('Frame decoder dimensions unavailable');
      // Decode completion normally trails moving scroll progress. A complete
      // nearby image can advance the pose without waiting for scrolling to stop.
      drop(index);
      const entry={bitmap,bytes:bitmap.width*bitmap.height*4,used:++clock,painted:false};
      cache.set(index,entry);bitmapBytes+=entry.bytes;bitmap=null;
      present();trim();
    }catch(error){
      bitmap?.close();
      if(!dead&&!job.controller.signal.aborted){
        failures.set(job.key,true);
        if(painted<0)data('switchState','fallback');
        data('switchFallback','frame-unavailable');
      }
    }finally{
      if(pending.get(index)===job)pending.delete(index);
      if(!dead){diagnostics();pump();}
    }
  }
  function redraw(){
    if(dead||!visible||quiet())return;
    canvasSize();
    if(!present()&&painted>=0&&cache.has(painted)){
      // A resize may repaint the last complete image while its sharper
      // replacement loads. It does not change the requested progress.
      paint(painted);
    }
    trim();pump();
  }
  const api={
    setProgress(value){
      if(dead)return;
      progress=clamp(Number(value));
      const next=nearestFrame(progress);
      if(next!==wanted){direction=Math.sign(next-wanted)||direction;wanted=next;failures.delete(`${wanted}:${drawTier}`);if(manifest)networkFailures.delete(frameFor(wanted).sha256);cancelFarRequests();}
      data('switchTargetProgress',progress.toFixed(4));
      data('switchFrameLag',String(painted<0?0:Math.abs(wanted-painted)));
      if(visible&&!quiet()){present();pump();}
    },
    resize(){if(dead)return;sizeDirty=true;redraw();},
    dispose(){
      if(dead)return;dead=true;
      manifestAbort.abort();for(const job of pending.values())job.controller.abort();pending.clear();
      for(const controller of network.values())controller.abort();network.clear();
      resizeObserver?.disconnect();
      document.removeEventListener('portfolio:motion',onMotion);
      document.removeEventListener('visibilitychange',onVisibility);
      reduced.removeEventListener('change',onReduced);
      signal?.removeEventListener('abort',onAbort);canvas.removeEventListener('contextlost',onContextLost);
      for(const index of [...cache.keys()])drop(index);
      encoded.clear();encodedBytes=0;networkFailures.clear();failures.clear();manifest=null;
      try{canvas.width=canvas.height=1;}catch{}
      canvas.remove();
      if(owned()){scenes.delete(host);host.dataset.switchState='disposed';host.dataset.switchBitmapBytes='0';host.dataset.switchCacheCount='0';host.dataset.switchInflight='0';host.dataset.switchEncodedBytes='0';host.dataset.switchEncodedCount='0';host.dataset.switchFetches='0';}
    }
  };
  function onAbort(){api.dispose();}
  function onMotion(event){if(event.detail?.off)api.dispose();}
  function onReduced(){if(reduced.matches)api.dispose();}
  function onContextLost(event){event.preventDefault();fallback('canvas-unavailable');}
  function onVisibility(){
    visible=!document.hidden;
    if(!visible){for(const job of pending.values())job.controller.abort();for(const controller of network.values())controller.abort();return;}
    failures.clear();networkFailures.clear();sizeDirty=true;redraw();
  }
  scenes.set(host,api);
  data('switchState','loading');data('switchProgress',progress.toFixed(4));
  document.addEventListener('portfolio:motion',onMotion);document.addEventListener('visibilitychange',onVisibility);
  reduced.addEventListener('change',onReduced);signal?.addEventListener('abort',onAbort,{once:true});
  canvas.addEventListener('contextlost',onContextLost);
  try{
    if(signal?.aborted||quiet()){api.dispose();return api;}
    if(!context||typeof createImageBitmap!=='function'||typeof ResizeObserver!=='function')throw new Error('Canvas unavailable');
    resizeObserver=new ResizeObserver(entries=>{
      if(dead)return;
      const box=entries[0]?.contentRect;if(!box)return;
      width=box.width;height=box.height;sizeDirty=true;redraw();
    });
    resizeObserver.observe(host);
    const response=await fetch(sequenceURL,{signal:manifestAbort.signal,cache:'no-cache'});
    if(!response.ok)throw new Error('Manifest unavailable');
    const source=await response.json();
    if(dead||signal?.aborted)return api;
    if(source.version!==1||source.width!==dimensions[0]||source.height!==dimensions[1]||!Number.isInteger(source.frameCount)||source.frameCount<101||source.frameCount>401||!Number.isInteger(source.initialIndex)||!Array.isArray(source.frames)||source.frames.length!==source.frameCount||source.frames[0]?.progress!==0||source.frames.at(-1)?.progress!==1||source.frames[source.initialIndex]?.progress!==0)throw new Error('Invalid sequence manifest');
    for(let index=0;index<source.frameCount;index++){
      const frame=source.frames[index];
      if(frame.index!==index||frame.file!==`key-${String(index).padStart(3,'0')}.webp`||frame.width!==source.width||frame.height!==source.height||typeof frame.progress!=='number'||!Number.isFinite(frame.progress)||frame.progress<0||frame.progress>1||(index&&frame.progress<=source.frames[index-1].progress)||!Number.isInteger(frame.bytes)||frame.bytes<1||frame.bytes>4*1024*1024||!/^[a-f0-9]{64}$/.test(frame.sha256))throw new Error('Invalid sequence frame');
    }
    if(source.compact){
      const compact=source.compact;
      if(compact.width!==dimensions[2]||compact.height!==dimensions[3]||!Array.isArray(compact.frames)||compact.frames.length!==source.frameCount)throw new Error('Invalid compact sequence');
      for(let index=0;index<source.frameCount;index++){
        const frame=compact.frames[index];
        if(frame.index!==index||frame.file!==`key-${String(index).padStart(3,'0')}-960.webp`||frame.width!==dimensions[2]||frame.height!==dimensions[3]||frame.progress!==source.frames[index].progress||!Number.isInteger(frame.bytes)||frame.bytes<1||frame.bytes>4*1024*1024||!/^[a-f0-9]{64}$/.test(frame.sha256))throw new Error('Invalid compact frame');
      }
    }
    const unique=new Map([...source.frames,...(source.compact?.frames||[])].map(frame=>[frame.sha256,frame.bytes]));
    if([...unique.values()].reduce((sum,bytes)=>sum+bytes,0)>MAX_ENCODED_BYTES)throw new Error('Sequence exceeds preload budget');
    manifest=source;wanted=nearestFrame(progress);sizeDirty=true;
    data('switchState','prepared');redraw();
    return api;
  }catch(error){
    if(!dead)fallback('sequence-unavailable');
    return api;
  }
}

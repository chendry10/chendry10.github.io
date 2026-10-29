import {createScoreFolio} from './score-folio.js';
import {createScoreJourney,scoreFolioProgress,scoreRevealPose} from './score-journey.js?v=434bb2ff8d46';
import {createGameplayFilm} from './gameplay-film.js?v=a71be8c3dbb1';
import {screenHandoffMatrix} from './input-handoff.js?v=a9845ab20e0d';
import {createProductBridge} from './product-bridge.js?v=56f1707e86cc';

// One native, demand-driven scheduler owns all decorative poses.
const root=document.documentElement;
const opening=document.querySelector('.concerto-opening');
const relay=document.querySelector('.relay-scene');
const hero=document.querySelector('.hero-identity');
const identity=[...document.querySelectorAll('.hero-identity,.hero-caption,.scroll-cue')];
const keyHost=document.querySelector('.relay-key');
const heading=document.querySelector('.relay-heading');
const responseHeading=document.querySelector('.relay-response-heading');
const product=document.querySelector('.relay-product');
const bay=document.querySelector('[data-product-bay]');
const productShell=product.querySelector('.relay-product-shell');
const phases=[...document.querySelectorAll('[data-relay-step]')];
const phaseGuide=document.querySelector('.relay-phase');
const disclosure=document.querySelector('.relay-disclosure');
const music=document.querySelector('.lyre-interlude');
const trumpetHost=document.querySelector('.trumpet-sequence');
const trumpetPaper=music.querySelector('.hero-score');
const scoreAct=document.querySelector('.score-routing');
const demo=document.querySelector('[data-lyre-demo]');
let folio=createScoreFolio(scoreAct);
let journey=createScoreJourney({music,scoreAct,demo});
let bridge=createProductBridge({product,bay,opening});
const filmVideo=product.querySelector('[data-gameplay-video]');
const filmButton=product.querySelector('[data-film-toggle]');
let film=createGameplayFilm(filmVideo,filmButton,{startTime:4.8});
const osReduced=matchMedia('(prefers-reduced-motion:reduce)');
const clamp=n=>Math.max(0,Math.min(1,n));
const part=(p,a,b)=>clamp((p-a)/(b-a));
const ease=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;
const style=(el,key,value)=>{if(el&&el.style[key]!==value)el.style[key]=value;};
const data=(el,key,value)=>{if(el.dataset[key]!==value)el.dataset[key]=value;};
let metrics={},width=innerWidth,height=innerHeight,still=true,layoutDirty=true;
let frame=0,lastTime=0,poses=null,hidden=document.hidden,renderCount=0;
let key=null,keyAbort=null,keyTicket=0,keyLoading=false,keyLatest=0,idle=0;
let trumpet=null,trumpetAbort=null,trumpetTicket=0,trumpetLoading=false;
const quiet=()=>root.classList.contains('motion-off')||osReduced.matches||innerWidth<=900;
function schedule(){if(!hidden&&!frame)frame=requestAnimationFrame(render);}
function measure(){
  width=innerWidth;height=innerHeight;still=quiet();
  root.classList.toggle('concerto-motion',!still);
  root.classList.toggle('concerto-still',still);
  data(root,'scrollEngine',still?'off':'concerto-native');
  const y=scrollY;
  const bounds=[opening,music,scoreAct].map(el=>{const r=el.getBoundingClientRect();return {top:r.top+y,height:r.height,range:Math.max(1,r.height-height)};});
  metrics={opening:bounds[0],music:bounds[1],scores:bounds[2],keyBox:{x:keyHost.offsetLeft,y:keyHost.offsetTop,w:keyHost.offsetWidth,h:keyHost.offsetHeight},productWidth:Math.min(width*.90,Math.min(height*.72,Math.max(160,height-240))*32/27,1200)};
  folio.measure();journey.measure();bridge.measure();key?.resize();trumpet?.resize();layoutDirty=false;poses=null;
}
function releaseKey(){
  keyTicket++;keyAbort?.abort();keyAbort=null;key?.dispose();key=null;keyLoading=false;
  if(idle){if('cancelIdleCallback'in window)cancelIdleCallback(idle);else clearTimeout(idle);idle=0;}
}
function warmKey(){
  if(still||hidden||key||keyLoading)return;
  keyLoading=true;const ticket=++keyTicket;keyAbort=new AbortController();const signal=keyAbort.signal;
  import('./switch-scene.js?v=7de696442440').then(({createSwitchScene})=>createSwitchScene(keyHost,{signal,study:'keystroke'})).then(controller=>{
    if(signal.aborted||ticket!==keyTicket||quiet()){controller.dispose();return;}
    key=controller;keyLoading=false;controller.setProgress(keyLatest);schedule();
  }).catch(()=>{if(ticket===keyTicket){keyLoading=false;data(keyHost,'switchState','fallback');}});
}
function releaseTrumpet(){trumpetTicket++;trumpetAbort?.abort();trumpetAbort=null;trumpet?.dispose();trumpet=null;trumpetLoading=false;}
function warmTrumpet(){
  if(still||hidden||trumpet||trumpetLoading)return;
  trumpetLoading=true;const ticket=++trumpetTicket;trumpetAbort=new AbortController();const signal=trumpetAbort.signal;
  import('./switch-scene.js?v=7de696442440').then(({createSwitchScene})=>createSwitchScene(trumpetHost,{signal,study:'trumpet'})).then(controller=>{
    if(signal.aborted||ticket!==trumpetTicket||quiet()){controller.dispose();return;}
    trumpet=controller;trumpetLoading=false;controller.setProgress(poses?.music||0);schedule();
  }).catch(()=>{if(ticket===trumpetTicket){trumpetLoading=false;data(trumpetHost,'switchState','fallback');}});
}
function prewarm(){
  if(idle||key||keyLoading||quiet()||hidden||(metrics.opening&&scrollY>=metrics.opening.top+metrics.opening.height+height))return;
  const run=()=>{idle=0;warmKey();};
  idle='requestIdleCallback'in window?requestIdleCallback(run,{timeout:700}):setTimeout(run,120);
}
function targetPose(y){
  const progress=m=>clamp((y-m.top)/m.range);
  return {opening:still?0:progress(metrics.opening),scores:still?1:scoreFolioProgress(progress(metrics.scores)),music:still?1:progress(metrics.music)};
}
function near(m,y){return y+height*1.25>m.top&&y-height*.25<m.top+m.height;}
function inputPose(p){
  // Follow the recorded keystrokes into their real game response, then hold
  // the completed scene through the handoff. Native scrolling owns time.
  return ease(part(p,.05,.65));
}
function render(now){
  frame=0;if(hidden)return;
  if(layoutDirty)measure();
  const y=scrollY,target=targetPose(y),dt=lastTime?Math.min(64,now-lastTime):64;lastTime=now;
  const jump=!poses||Object.keys(target).some(k=>Math.abs(target[k]-poses[k])>.22);
  let settling=false;
  if(jump||still)poses={...target};
  else for(const name of Object.keys(target)){
    const difference=target[name]-poses[name];
    poses[name]=Math.abs(difference)<.00015?target[name]:mix(poses[name],target[name],1-Math.exp(-dt/48));
    if(Math.abs(target[name]-poses[name])>.00015)settling=true;
  }
  const p=poses.opening,ownsProduct=bridge.render(y,still,p);
  if(ownsProduct)style(productShell,'clipPath','none');
  if(near(metrics.opening,y)||still){
    keyLatest=inputPose(p);
    style(relay,'visibility','visible');style(relay,'opacity','1');
    const nameExit=ease(part(p,.025,.12));
    identity.forEach(el=>{style(el,'opacity',(1-nameExit).toFixed(4));style(el,'visibility',nameExit>.999?'hidden':'visible');});
    style(hero,'transform',width<=700?'none':`translateY(-45%) translate3d(0,${(-nameExit*42).toFixed(2)}px,0)`);
    const titleIn=ease(part(p,.15,.24)),titleOut=ease(part(p,.61,.74));
    const mechanism=ease(part(p,.12,.20));
    const depart=ease(part(y,metrics.opening.top+metrics.opening.range,metrics.opening.top+metrics.opening.range+height*.25));
    const guideOpacity=mechanism*(1-ease(part(p,.74,.84)))*(1-depart);
    style(phaseGuide,'opacity',guideOpacity.toFixed(4));style(disclosure,'opacity',guideOpacity.toFixed(4));
    style(heading,'opacity',(titleIn*(1-titleOut)).toFixed(4));
    style(heading,'transform',`translate3d(0,${((1-titleIn)*22-titleOut*30).toFixed(2)}px,0)`);
    const arrival=ease(part(p,.68,.84));
    const introScale=1+.25*(1-ease(part(p,.08,.22)));
    style(keyHost,'opacity',(1-ease(part(arrival,.03,.35))).toFixed(4));
    style(keyHost,'transform',`scale(${introScale.toFixed(4)})`);
    if(!ownsProduct){
      style(product,'opacity',ease(part(arrival,0,.18)).toFixed(4));style(product,'visibility',arrival>.001?'visible':'hidden');
      style(product,'transformOrigin','0 0');
      style(product,'transform',`matrix3d(${screenHandoffMatrix({keyBox:metrics.keyBox,productWidth:metrics.productWidth,viewportWidth:width,viewportHeight:height},arrival).join(',')})`);
      style(productShell,'clipPath',`inset(0 0 ${(100*(1-1326/2160)*(1-ease(part(arrival,.15,1)))).toFixed(4)}% 0)`);
      if(product.inert!==(arrival<.985))product.inert=arrival<.985;
    }
    style(responseHeading,'opacity',ease(part(p,.76,.84)).toFixed(4));
    const phase=p<.22?0:p<.46?1:p<.73?2:3;
    data(opening,'narrativePhase',p<.12?'identity':['assembly','contact','signal','response'][phase]);
    phases.forEach((el,i)=>data(el,'active',String(i===phase)));
    if(key&&!still&&p<.9)key.setProgress(keyLatest);
  }
  if(near(metrics.music,y)||still){
    trumpet?.setProgress(poses.music);
    // Raw scroll also owns the journey handoff; never hand off a lagging paper pose.
    const paperPose=scoreRevealPose(still?1:target.music);
    style(trumpetPaper,'opacity',paperPose.opacity.toFixed(4));
    style(trumpetPaper,'transform',still?'none':`translate3d(${paperPose.x.toFixed(2)}px,${paperPose.y.toFixed(2)}px,0) rotate(${paperPose.rz.toFixed(2)}deg) scale(${paperPose.scale.toFixed(4)})`);
  }
  if(!still&&y>=metrics.opening.top+metrics.opening.height+height&&y+height*2>metrics.music.top&&y<metrics.music.top+metrics.music.height+height){releaseKey();warmTrumpet();}
  else releaseTrumpet();
  if(near(metrics.scores,y)||still)folio.render(poses.scores,still);
  journey.render(y,still,poses.scores);
  if(!still&&near(metrics.opening,y)&&p>.52)film.prepare();
  film.setActive(!root.classList.contains('motion-off')&&!osReduced.matches&&(still||p>=.84));
  if(!still&&y<metrics.opening.top+metrics.opening.height+height)prewarm();
  else if(still||y>metrics.opening.top+metrics.opening.height+height*2)releaseKey();
  data(root,'motionFrames',String(++renderCount));
  if(settling&&!still)schedule();
}
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}},{rootMargin:'0px 0px -30px',threshold:.08});
document.querySelectorAll('[data-sc-in],.production-responsibilities>article,.background-heading,.demo-intro').forEach(el=>{el.classList.add('concerto-reveal');revealObserver.observe(el);});
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',()=>{layoutDirty=true;schedule();},{passive:true});
document.addEventListener('portfolio:motion',()=>{if(quiet()){releaseKey();releaseTrumpet();}layoutDirty=true;schedule();});
for(const name of ['portfolio:journey-layout','portfolio:product-layout'])document.addEventListener(name,()=>{layoutDirty=true;schedule();});
osReduced.addEventListener('change',()=>{layoutDirty=true;schedule();});
document.fonts.ready.then(()=>{layoutDirty=true;schedule();prewarm();});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){cancelAnimationFrame(frame);frame=0;}else{lastTime=0;schedule();}});
addEventListener('pagehide',()=>{releaseKey();releaseTrumpet();cancelAnimationFrame(frame);frame=0;bridge.dispose();journey.dispose();folio.dispose();film.dispose();});
addEventListener('pageshow',event=>{if(event.persisted){folio=createScoreFolio(scoreAct);journey=createScoreJourney({music,scoreAct,demo});bridge=createProductBridge({product,bay,opening});film=createGameplayFilm(filmVideo,filmButton,{startTime:4.8});}hidden=document.hidden;layoutDirty=true;schedule();});
document.querySelector('.scroll-cue')?.addEventListener('click',event=>{if(still)return;event.preventDefault();scrollTo({top:metrics.opening.top+metrics.opening.range*.22,behavior:'smooth'});});
schedule();

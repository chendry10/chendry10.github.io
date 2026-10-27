import {createScoreFolio} from './score-folio.js';
import {createScoreJourney} from './score-journey.js';
import {createGameplayFilm} from './gameplay-film.js';
import {createProductBridge} from './product-bridge.js';

// One native, demand-driven scheduler owns all decorative poses.
const root=document.documentElement;
const opening=document.querySelector('.concerto-opening');
const relay=document.querySelector('.relay-scene');
const hero=document.querySelector('.hero-identity');
const identity=[...document.querySelectorAll('.hero-identity,.hero-caption,.scroll-cue')];
const keyHost=document.querySelector('.relay-key');
const heading=document.querySelector('.relay-heading');
const responseHeading=document.querySelector('.relay-response-heading');
const circuit=document.querySelector('.relay-circuit');
const current=document.querySelector('.relay-current');
const product=document.querySelector('.relay-product');
const bay=document.querySelector('[data-product-bay]');
const phases=[...document.querySelectorAll('[data-relay-step]')];
const phaseGuide=document.querySelector('.relay-phase');
const disclosure=document.querySelector('.relay-disclosure');
const music=document.querySelector('.lyre-interlude');
const musicCamera=document.querySelector('.scene-camera');
const scoreAct=document.querySelector('.score-routing');
const demo=document.querySelector('[data-lyre-demo]');
let folio=createScoreFolio(scoreAct);
let journey=createScoreJourney({music,scoreAct,demo});
let bridge=createProductBridge({product,bay,opening});
const filmVideo=product.querySelector('[data-gameplay-video]');
const filmButton=product.querySelector('[data-film-toggle]');
let film=createGameplayFilm(filmVideo,filmButton);
const osReduced=matchMedia('(prefers-reduced-motion:reduce)');
const clamp=n=>Math.max(0,Math.min(1,n));
const part=(p,a,b)=>clamp((p-a)/(b-a));
const ease=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;
const style=(el,key,value)=>{if(el&&el.style[key]!==value)el.style[key]=value;};
const data=(el,key,value)=>{if(el.dataset[key]!==value)el.dataset[key]=value;};
let metrics={},width=innerWidth,height=innerHeight,still=true,layoutDirty=true;
let frame=0,lastTime=0,poses=null,hidden=document.hidden,renderCount=0;
let key=null,keyAbort=null,keyTicket=0,keyLoading=false,keyLatest=.42,idle=0;
const quiet=()=>root.classList.contains('motion-off')||osReduced.matches||innerWidth<=900;
function schedule(){if(!hidden&&!frame)frame=requestAnimationFrame(render);}
function measure(){
  width=innerWidth;height=innerHeight;still=quiet();
  root.classList.toggle('concerto-motion',!still);
  root.classList.toggle('concerto-still',still);
  data(root,'scrollEngine',still?'off':'concerto-native');
  const y=scrollY;
  const bounds=[opening,music,scoreAct].map(el=>{const r=el.getBoundingClientRect();return {top:r.top+y,height:r.height,range:Math.max(1,r.height-height)};});
  metrics={opening:bounds[0],music:bounds[1],scores:bounds[2]};
  folio.measure();journey.measure();bridge.measure();key?.resize();layoutDirty=false;poses=null;
}
function releaseKey(){
  keyTicket++;keyAbort?.abort();keyAbort=null;key?.dispose();key=null;keyLoading=false;
  if(idle){if('cancelIdleCallback'in window)cancelIdleCallback(idle);else clearTimeout(idle);idle=0;}
}
function warmKey(){
  if(still||hidden||key||keyLoading)return;
  keyLoading=true;const ticket=++keyTicket;keyAbort=new AbortController();const signal=keyAbort.signal;
  import('./switch-scene.js').then(({createSwitchScene})=>createSwitchScene(keyHost,{signal})).then(controller=>{
    if(signal.aborted||ticket!==keyTicket||quiet()){controller.dispose();return;}
    key=controller;keyLoading=false;controller.setProgress(keyLatest);schedule();
  }).catch(()=>{if(ticket===keyTicket){keyLoading=false;data(keyHost,'switchState','fallback');}});
}
function prewarm(){
  if(idle||key||keyLoading||quiet()||hidden)return;
  const run=()=>{idle=0;warmKey();};
  idle='requestIdleCallback'in window?requestIdleCallback(run,{timeout:700}):setTimeout(run,120);
}
function targetPose(y){
  const progress=m=>clamp((y-m.top)/m.range);
  return {opening:still?0:progress(metrics.opening),scores:still?1:progress(metrics.scores),music:still?1:clamp((y+height-metrics.music.top)/(height+metrics.music.height))};
}
function near(m,y){return y+height*1.25>m.top&&y-height*.25<m.top+m.height;}
function inputPose(p){
  if(p<.04)return .42;
  if(p<.19)return mix(.42,.04,ease(part(p,.04,.19)));
  if(p<.54)return mix(.04,.60,ease(part(p,.19,.54)));
  if(p<.70)return mix(.60,.80,ease(part(p,.54,.70)));
  return mix(.80,1,ease(part(p,.70,.90)));
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
    style(keyHost,'opacity',(1-ease(part(p,.67,.82))).toFixed(4));
    style(keyHost,'transform',`translate3d(${(-arrival*width*.14).toFixed(2)}px,${(-arrival*height*.035).toFixed(2)}px,0) scale(${(1-.16*arrival).toFixed(4)})`);
    style(circuit,'opacity',(ease(part(p,.52,.59))*(1-ease(part(p,.79,.88)))).toFixed(4));
    style(current,'strokeDashoffset',(1-part(p,.54,.73)).toFixed(4));
    if(!ownsProduct){
      style(product,'opacity',arrival.toFixed(4));style(product,'visibility',arrival>.001?'visible':'hidden');
      style(product,'transform',`translate(-50%,-50%) translate3d(${((1-arrival)*width*.13).toFixed(2)}px,${((1-arrival)*65).toFixed(2)}px,0) rotateY(${(-12*(1-arrival)).toFixed(2)}deg) scale(${(.80+.20*arrival).toFixed(4)})`);
      if(product.inert!==(arrival<.985))product.inert=arrival<.985;
    }
    style(responseHeading,'opacity',ease(part(p,.76,.84)).toFixed(4));
    const phase=p<.41?0:p<.54?1:p<.73?2:3;
    data(opening,'narrativePhase',p<.12?'identity':['assembly','contact','signal','response'][phase]);
    phases.forEach((el,i)=>data(el,'active',String(i===phase)));
    if(key&&!still&&p<.9)key.setProgress(keyLatest);
  }
  if(near(metrics.music,y)||still){const reveal=ease(part(poses.music,.12,.7));style(musicCamera,'transform',still?'none':`translate3d(${((1-reveal)*-40).toFixed(2)}px,0,0)`);}
  if(near(metrics.scores,y)||still)folio.render(poses.scores,still);
  journey.render(y,still,poses.scores);
  if(!still&&near(metrics.opening,y)&&p>.52)film.prepare();
  film.setActive(!root.classList.contains('motion-off')&&!osReduced.matches&&(still||p>.72));
  if(!still&&y<metrics.opening.top+metrics.opening.height+height)prewarm();
  else if(still||y>metrics.opening.top+metrics.opening.height+height*2)releaseKey();
  data(root,'motionFrames',String(++renderCount));
  if(settling&&!still)schedule();
}
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}},{rootMargin:'0px 0px -30px',threshold:.08});
document.querySelectorAll('[data-sc-in],.production-responsibilities>article,.background-heading,.demo-intro').forEach(el=>{el.classList.add('concerto-reveal');revealObserver.observe(el);});
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',()=>{layoutDirty=true;schedule();},{passive:true});
document.addEventListener('portfolio:motion',()=>{if(quiet())releaseKey();layoutDirty=true;schedule();});
for(const name of ['portfolio:journey-layout','portfolio:product-layout'])document.addEventListener(name,()=>{layoutDirty=true;schedule();});
osReduced.addEventListener('change',()=>{layoutDirty=true;schedule();});
document.fonts.ready.then(()=>{layoutDirty=true;schedule();prewarm();});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){cancelAnimationFrame(frame);frame=0;}else{lastTime=0;schedule();}});
addEventListener('pagehide',()=>{releaseKey();cancelAnimationFrame(frame);frame=0;bridge.dispose();journey.dispose();folio.dispose();film.dispose();});
addEventListener('pageshow',event=>{if(event.persisted){folio=createScoreFolio(scoreAct);journey=createScoreJourney({music,scoreAct,demo});bridge=createProductBridge({product,bay,opening});film=createGameplayFilm(filmVideo,filmButton);}hidden=document.hidden;layoutDirty=true;schedule();});
document.querySelector('.scroll-cue')?.addEventListener('click',event=>{if(still)return;event.preventDefault();scrollTo({top:metrics.opening.top+metrics.opening.range*.22,behavior:'smooth'});});
schedule();

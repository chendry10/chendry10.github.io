import {createScoreFolio} from './score-folio.js';
import {createScoreJourney} from './score-journey.js';
import {createGameplayFilm} from './gameplay-film.js';

// Option 1 owns one native, demand-driven scheduler. No wheel interception,
// image-mask repaint, video loop or layout measurement during a scroll frame.
const root=document.documentElement;
const opening=document.querySelector('.concerto-opening');
const relay=document.querySelector('.relay-scene');
const identity=[...document.querySelectorAll('.typing-plane,.hero-software,.hero-identity,.identity-scrim,.hero-caption,.scroll-cue')];
const photo=document.querySelector('.typing-camera');
const keyHost=document.querySelector('.relay-key');
const heading=document.querySelector('.relay-heading');
const responseHeading=document.querySelector('.relay-response-heading');
const circuit=document.querySelector('.relay-circuit');
const current=document.querySelector('.relay-current');
const product=document.querySelector('.relay-product');
const gameplay=document.querySelector('.relay-game-reveal');
const phases=[...document.querySelectorAll('[data-relay-step]')];
const evidence=document.querySelector('.evidence');
const rail=document.querySelector('.evidence-rail');
const music=document.querySelector('.lyre-interlude');
const musicCamera=document.querySelector('.scene-camera');
const scoreAct=document.querySelector('.score-routing');
let folio=createScoreFolio(scoreAct);
const demo=document.querySelector('[data-lyre-demo]');
let journey=createScoreJourney({music,scoreAct,demo});
const filmVideo=document.querySelector('.relay-product [data-gameplay-video]');
const filmButton=document.querySelector('[data-film-toggle]');
let film=createGameplayFilm(filmVideo,filmButton);
const evidenceVideo=document.querySelector('[data-evidence-video]');
const evidenceFilmButton=document.querySelector('[data-evidence-film-toggle]');
let evidenceFilm=createGameplayFilm(evidenceVideo,evidenceFilmButton);
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
const quiet=()=>root.classList.contains('motion-off')||osReduced.matches||innerWidth<=700;

function schedule(){if(!hidden&&!frame)frame=requestAnimationFrame(render);}
function measure(){
  width=innerWidth;height=innerHeight;still=quiet();
  root.classList.toggle('concerto-motion',!still);
  root.classList.toggle('concerto-still',still);
  data(root,'scrollEngine',still?'off':'concerto-native');
  const y=scrollY;
  // All geometry is collected together, before any scene style writes.
  const bounds=[opening,evidence,music,scoreAct].map(el=>{const r=el.getBoundingClientRect();return {top:r.top+y,height:r.height,range:Math.max(1,r.height-height)};});
  metrics={opening:bounds[0],evidence:bounds[1],music:bounds[2],scores:bounds[3],overflow:Math.max(0,rail.scrollWidth-width)};
  folio.measure();journey.measure();key?.resize();layoutDirty=false;poses=null;
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
  idle='requestIdleCallback'in window?requestIdleCallback(run,{timeout:1200}):setTimeout(run,200);
}
function targetPose(y){
  const progress=m=>clamp((y-m.top)/m.range);
  return {opening:still?0:progress(metrics.opening),evidence:still?0:progress(metrics.evidence),scores:still?1:progress(metrics.scores),music:still?1:clamp((y+height-metrics.music.top)/(height+metrics.music.height))};
}
function near(m,y){return y+height*1.25>m.top&&y-height*.25<m.top+m.height;}
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
  if(near(metrics.opening,y)||still){
    const p=poses.opening,enter=ease(part(p,.045,.17)),q=part(p,.14,.94);
    keyLatest=q;
    style(relay,'visibility',enter>.001?'visible':'hidden');
    style(relay,'opacity',enter.toFixed(4));
    identity.forEach(el=>{
      style(el,'opacity',(1-enter).toFixed(4));
      style(el,'visibility',enter>.999?'hidden':'visible');
    });
    style(photo,'transform',still?'none':`translate3d(0,${(-part(p,0,.16)*35).toFixed(2)}px,0)`);
    const arrival=ease(part(q,.73,.93));
    const signal=part(q,.59,.77);
    style(keyHost,'opacity',(1-ease(part(q,.74,.90))).toFixed(4));
    style(keyHost,'transform',`translate3d(${(-arrival*width*.17).toFixed(2)}px,${(-arrival*height*.04).toFixed(2)}px,0) scale(${(1-.22*arrival).toFixed(4)})`);
    style(heading,'opacity',(1-ease(part(q,.66,.79))).toFixed(4));
    style(heading,'transform',`translate3d(0,${(-arrival*45).toFixed(2)}px,0)`);
    style(circuit,'opacity',(ease(part(q,.57,.63))*(1-ease(part(q,.83,.94)))).toFixed(4));
    style(current,'strokeDashoffset',(1-signal).toFixed(4));
    style(product,'opacity',arrival.toFixed(4));
    style(product,'visibility',arrival>.001?'visible':'hidden');
    style(product,'transform',`translate(-50%,-50%) translate3d(${((1-arrival)*width*.16).toFixed(2)}px,${((1-arrival)*90).toFixed(2)}px,0) rotateY(${(-18*(1-arrival)).toFixed(2)}deg) rotateX(${(8*(1-arrival)).toFixed(2)}deg) scale(${(.76+.24*arrival).toFixed(4)})`);
    // The payoff is one clear real capture; never overlap two game states.
    style(gameplay,'opacity','1');
    style(responseHeading,'opacity',ease(part(q,.81,.93)).toFixed(4));
    const phase=q<.42?0:q<.6?1:q<.8?2:3;
    data(opening,'narrativePhase',p<.14?'identity':['assembly','contact','signal','response'][phase]);
    phases.forEach((el,i)=>data(el,'active',String(i===phase)));
    if(key&&!still&&enter>.001&&q<.91)key.setProgress(q);
  }
  if(near(metrics.evidence,y)||still)style(rail,'transform',still?'none':`translate3d(${(-metrics.overflow*poses.evidence).toFixed(2)}px,0,0)`);
  if(near(metrics.music,y)||still){
    const reveal=ease(part(poses.music,.12,.7));
    style(musicCamera,'transform',still?'none':`translate3d(${((1-reveal)*-70).toFixed(2)}px,0,0)`);
  }
  if(near(metrics.scores,y)||still)folio.render(poses.scores,still);
  journey.render(y,still,poses.scores);
  if(!still&&near(metrics.opening,y)&&poses.opening>.55)film.prepare();
  film.setActive(!still&&poses.opening>.84&&y<metrics.opening.top+metrics.opening.height-height*.25);
  evidenceFilm.setActive(width<=700&&!root.classList.contains('motion-off')&&!osReduced.matches);
  if(!still&&y<metrics.opening.top+metrics.opening.height+height)prewarm();
  else if(still||y>metrics.opening.top+metrics.opening.height+height*3)releaseKey();
  data(root,'motionFrames',String(++renderCount));
  if(settling&&!still)schedule();
}
// Native reading reveals have their own compositor transitions, no scroll loop.
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}},{rootMargin:'0px 0px -35px',threshold:.08});
document.querySelectorAll('[data-sc-in],.background-heading,.demo-intro').forEach(el=>{el.classList.add('concerto-reveal');revealObserver.observe(el);});
document.querySelectorAll('[data-responsibility]').forEach(el=>data(el,'active','true'));
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',()=>{layoutDirty=true;schedule();},{passive:true});
document.addEventListener('portfolio:motion',()=>{if(quiet())releaseKey();layoutDirty=true;schedule();});
document.addEventListener('portfolio:journey-layout',()=>{layoutDirty=true;schedule();});
osReduced.addEventListener('change',()=>{layoutDirty=true;schedule();});
document.fonts.ready.then(()=>{layoutDirty=true;schedule();const img=document.querySelector('.typing-camera img');Promise.resolve(img.decode?.()).catch(()=>{}).then(prewarm);});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){cancelAnimationFrame(frame);frame=0;}else{lastTime=0;schedule();}});
addEventListener('pagehide',()=>{releaseKey();cancelAnimationFrame(frame);frame=0;journey.dispose();folio.dispose();film.dispose();evidenceFilm.dispose();});
addEventListener('pageshow',event=>{if(event.persisted){folio=createScoreFolio(scoreAct);journey=createScoreJourney({music,scoreAct,demo});film=createGameplayFilm(filmVideo,filmButton);evidenceFilm=createGameplayFilm(evidenceVideo,evidenceFilmButton);}hidden=document.hidden;layoutDirty=true;schedule();});
document.querySelector('.scroll-cue')?.addEventListener('click',event=>{if(still)return;event.preventDefault();scrollTo({top:metrics.opening.top+metrics.opening.range*.23,behavior:'smooth'});});
rail.addEventListener('focusin',event=>{
  if(still)return;const item=event.target.closest('.evidence-rail > *');if(!item)return;
  const ratio=clamp((item.offsetLeft-width*.1)/Math.max(1,metrics.overflow));
  scrollTo({top:metrics.evidence.top+ratio*metrics.evidence.range,behavior:'instant'});
});
schedule();

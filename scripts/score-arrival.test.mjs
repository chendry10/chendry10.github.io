import assert from 'node:assert/strict';
import {createScoreJourney,scoreArrivalPose,scoreFolioProgress,scoreRevealPose,SCORE_ARRIVAL_END} from '../score-journey.js';

// Exercise continuous motion at desktop aspect ratios, including the old
// halfway snap and the arrival-to-folio ownership boundary.
for(const [width,height] of [[1024,900],[1280,720],[1631,844],[2095,1051]]){
  const paperWidth=Math.min(330,width*.23);
  const from={x:width*.63,y:height*.37,w:Math.min(400,width*.28)};
  const to={x:(width-paperWidth)/2,y:height*.41,z:18,rx:-9,ry:-23,rz:-4.8};
  const layout={from,to,paperWidth,width,height};
  const travel=height*1.8;
  let previous=scoreArrivalPose(layout,0),maxStep=0;
  assert.equal(previous.x,from.x);assert.equal(previous.y,from.y);
  assert.equal(previous.s,from.w/paperWidth);
  for(let scroll=1;scroll<=Math.ceil(travel);scroll++){
    const next=scoreArrivalPose(layout,Math.min(1,scroll/travel));
    maxStep=Math.max(maxStep,Math.hypot(next.x-previous.x,next.y-previous.y));
    assert.ok(Object.values(next).every(Number.isFinite));
    previous=next;
  }
  assert.ok(maxStep<1.5,`No large sheet displacement per scroll pixel at ${width}: ${maxStep}`);
  for(const t of [.001,.25,.52,.75,.999]){
    const a=scoreArrivalPose(layout,t-1e-7),b=scoreArrivalPose(layout,t+1e-7);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001,'No threshold teleport');
  }
  const end=scoreArrivalPose(layout,1);
  for(const key of ['x','y','z','rx','ry','rz'])assert.ok(Math.abs(end[key]-to[key])<1e-9,`Exact folio handoff ${key}`);
  assert.equal(end.s,1);
}
assert.equal(scoreFolioProgress(0),0);
assert.equal(scoreFolioProgress(SCORE_ARRIVAL_END),0,'Stack waits for the travelling page');
assert.ok(scoreFolioProgress(SCORE_ARRIVAL_END+1e-7)<1e-6,'Folio starts continuously');
assert.equal(scoreFolioProgress(1),1,'Full parts sequence is retained');
// The source reaches its exact anchor before raw scroll transfers ownership,
// even if the separate decorative camera is still catching up.
for(const raw of [.98,.99,1,1.2]){
  const pose=scoreRevealPose(raw);
  assert.equal(pose.opacity,1);assert.equal(pose.x,0);assert.equal(pose.y,0);assert.equal(pose.scale,1);
}
assert.equal(scoreRevealPose(.73).opacity,0);
// Exercise the actual DOM renderer with raw scroll at the ownership boundary
// while the scheduler still carries a later pose after reversing direction.
class Element extends EventTarget{
  style={opacity:'',getPropertyValue:()=>'',};dataset={};children=[];
  classList={add(){},remove(){}};
  selectors=new Map();
  querySelector(s){return this.selectors.get(s)||null;}
  querySelectorAll(){return [];}
  setAttribute(){} removeAttribute(){}
  append(...children){this.children.push(...children);}
  prepend(child){this.children.unshift(child);}
  remove(){}
  cloneNode(){const clone=new Element();clone.selectors.set('img',new Element());clone.selectors.set('figcaption',new Element());return clone;}
  getBoundingClientRect(){return this.rect;}
}
const element=rect=>Object.assign(new Element(),{rect});
const source=element({left:800,top:6978,width:358,height:277});
const field=element({left:36,top:7750,width:1198,height:377});
field.style.getPropertyValue=()=>330;
const stage=element({top:7500,height:720});
const heading=element({bottom:7730});
const nativePaper=new Element();
const music=new Element();music.selectors.set('.hero-score > img',source);
const section=element({top:7500,height:2592});
for(const [selector,el] of [['.score-routing-field',field],['.score-routing-stage',stage],['.score-routing-heading',heading],['[data-score-part="0"] .score-paper',nativePaper]])section.selectors.set(selector,el);
const documentStub=Object.assign(new EventTarget(),{body:new Element(),createElement:()=>new Element()});
Object.assign(globalThis,{document:documentStub,scrollY:0,innerHeight:720,innerWidth:1280});
const journey=createScoreJourney({music,scoreAct:section,demo:new Element()});
const scene=documentStub.body.children[0].children[0],track=scene.children[0],paper=track.children[0];
const transform=()=>[scene,track,paper].flatMap(el=>el.style.transform.match(/-?\d+(?:\.\d+)?/g).map(Number));
const boundary=7500+(2592-720)*SCORE_ARRIVAL_END;
for(const laggingProgress of [0,.15,.4]){
  journey.render(boundary-1e-5,false,laggingProgress);const before=transform();
  journey.render(boundary+1e-5,false,laggingProgress);const after=transform();
  assert.equal(before.length,after.length);
  assert.ok(before.every((value,i)=>Math.abs(value-after[i])<.01),`No ownership jump with lagging folio progress ${laggingProgress}`);
}
journey.dispose();
// Measuring halfway through a sticky scene must retain the same final anchor.
const anchor=element({left:800,top:6200,width:358,height:277});
const musicStage=element({top:6000});music.rect={top:6000,height:1440};
music.selectors.set('[data-score-origin]',anchor);music.selectors.set('.lyre-stage',musicStage);
documentStub.documentElement={classList:{contains:()=>true}};
const pinnedJourney=createScoreJourney({music,scoreAct:section,demo:new Element()});
const pinnedScene=documentStub.body.children.at(-1).children[0];
const pinnedTrack=pinnedScene.children[0];
pinnedJourney.render(6720,false,0);
const beforeMeasure=[pinnedScene.style.transform,pinnedTrack.style.transform];
globalThis.scrollY=6400;music.rect.top=-400;musicStage.rect.top=0;anchor.rect.top=200;
for(const el of [section,stage,field])el.rect.top-=6400;heading.rect.bottom-=6400;
pinnedJourney.measure();pinnedJourney.render(6720,false,0);
assert.deepEqual([pinnedScene.style.transform,pinnedTrack.style.transform],beforeMeasure,'Sticky-source geometry stays stable after mid-scroll remeasurement');
pinnedJourney.dispose();
for(const key of ['document','scrollY','innerHeight','innerWidth'])delete globalThis[key];
console.log('Score arrival: continuous path, bounded speed, exact endpoints and delayed folio passed.');

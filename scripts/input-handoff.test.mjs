import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MONITOR_QUADS} from '../monitor-quads.js';
import {SCREEN_QUAD,screenHandoffMatrix,monitorImageBox} from '../input-handoff.js';
assert.deepEqual(SCREEN_QUAD,JSON.parse(fs.readFileSync(new URL('../shared/assets/product/keystroke-sequence/projection.json',import.meta.url))).screenQuad);
for(const [width,height] of [[390,844],[375,667],[820,1180],[844,390],[1280,720],[1024,900],[1920,1080]]){
 const w=Math.min(width*.9,Math.min(height*.72,Math.max(160,height-240))*32/27,1200),h=w*1326/2560;
 const box={x:width*.44,y:height*.14,w:width*.5,h:width*.5*7/8};
 const args={keyBox:box,productWidth:w,viewportWidth:width,viewportHeight:height};
 const corners=[[0,0],[w,0],[w,h],[0,h]];
 let previous;
 for(let i=0;i<=1000;i++){
  const t=i/1000,m=screenHandoffMatrix(args,t);assert.ok(m.every(Number.isFinite));
  const projected=corners.map(([x,y])=>{const z=m[3]*x+m[7]*y+1;assert.ok(z>.5);return[(m[0]*x+m[4]*y+m[12])/z+width/2,(m[1]*x+m[5]*y+m[13])/z+height/2+80];});
  if(i===0)projected.forEach((p,j)=>{assert.ok(Math.abs(p[0]-(box.x+SCREEN_QUAD[j][0]*box.w))<1e-8);assert.ok(Math.abs(p[1]-(box.y+SCREEN_QUAD[j][1]*box.h))<1e-8);});
  if(previous)projected.forEach((p,j)=>assert.ok(Math.hypot(p[0]-previous[j][0],p[1]-previous[j][1])<3));
  previous=projected;
 }
 const m=screenHandoffMatrix(args,1);assert.ok(Math.abs(m[0]-1)<1e-10&&Math.abs(m[5]-1)<1e-10);assert.ok(Math.abs(m[12]+w/2)<1e-8&&Math.abs(m[13]+w*27/64)<1e-8);
}
console.log('Display handoff: exact rendered corners, continuous projection, and exact existing bridge endpoint passed.');

assert.equal(MONITOR_QUADS.length,181);
MONITOR_QUADS.at(-1).forEach((p,i)=>p.forEach((v,j)=>assert.ok(Math.abs(v-SCREEN_QUAD[i][j])<1e-6,'Blender export matches audited handoff')));
for(const quad of MONITOR_QUADS){
 const w=900,h=w*1326/2560,box={x:500,y:120,w:820,h:717.5};
 const m=screenHandoffMatrix({keyBox:box,productWidth:w,viewportWidth:1440,viewportHeight:900,quad},0);
 assert.ok(m.every(Number.isFinite));
 [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y],i)=>{const d=m[3]*x+m[7]*y+1;assert.ok(Math.abs(d)>.05);const px=(m[0]*x+m[4]*y+m[12])/d+720,py=(m[1]*x+m[5]*y+m[13])/d+530;assert.ok(Math.abs(px-(box.x+quad[i][0]*box.w))<1e-6);assert.ok(Math.abs(py-(box.y+quad[i][1]*box.h))<1e-6);});
}
console.log('All 181 moving monitor projections match the rendered screen corners.');

for(const [hostWidth,hostHeight,viewportWidth] of [[600,375,600],[700,375,700],[380,333,380],[900,788,1430]]){
 const host={x:20,y:120,w:hostWidth,h:hostHeight},box=monitorImageBox(host),quad=MONITOR_QUADS[120],w=viewportWidth*.9,h=w*1326/2560;
 assert.ok(box.w>=host.w&&box.h>=host.h);assert.ok(Math.abs(box.w/box.h-8/7)<1e-9);
 assert.ok(Math.abs(box.x+box.w/2-(host.x+host.w/2))<1e-9);
 const m=screenHandoffMatrix({keyBox:box,productWidth:w,viewportWidth,viewportHeight:900,quad},0);
 [[0,0],[w,0],[w,h],[0,h]].forEach(([x,y],i)=>{const d=m[3]*x+m[7]*y+1;assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/d+viewportWidth/2-(box.x+quad[i][0]*box.w))<1e-6);assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/d+530-(box.y+quad[i][1]*box.h))<1e-6);});
}
console.log('Cover-cropped hosts and scrollbar-width projection checks passed.');

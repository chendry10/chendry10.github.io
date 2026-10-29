import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCREEN_QUAD,screenHandoffMatrix} from '../input-handoff.js';
assert.deepEqual(SCREEN_QUAD,JSON.parse(fs.readFileSync(new URL('../shared/assets/product/keystroke-sequence/projection.json',import.meta.url))).screenQuad);
for(const [width,height] of [[1280,720],[1024,900],[1920,1080]]){
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

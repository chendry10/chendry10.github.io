import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve('.');
const errors=[];let checks=0;
const check=(ok,label)=>{checks++;if(!ok)errors.push(label);};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function webpSize(bytes){
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')return null;
  const format=bytes.toString('ascii',12,16);
  if(format==='VP8X')return [bytes.readUIntLE(24,3)+1,bytes.readUIntLE(27,3)+1];
  if(format==='VP8 ')return [bytes.readUInt16LE(26)&16383,bytes.readUInt16LE(28)&16383];
  if(format==='VP8L'){const bits=bytes.readUInt32LE(21);return [(bits&16383)+1,((bits>>>14)&16383)+1];}
  return null;
}
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=[...walk(path.join(root,'shared')),...fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(?:html|css|js|pdf|txt|xml)$/.test(e.name)).map(e=>path.join(root,e.name))],html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const localURL='https://portfolio.invalid/';
const omitted=new Set(['.git','qa','node_modules','key-renders']);
const publicationInventory=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>omitted.has(entry.name)?[]:entry.isDirectory()?publicationInventory(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
for(const file of publicationInventory(root)){
  const relative=path.relative(root,file).replaceAll(path.sep,'/');
  check(!/\.(?:blend\d*|exr|hdr|fbx|step|stp|key|pem|sqlite|csv|xlsx)$|(^|\/)\.env(?:\.|$)|^shared\/assets\/product\/key-sequence\/.*\.png$/i.test(relative),`No raw or private publication file: ${relative}`);
}
const allowedHosts=new Set(['chendry10.github.io','lyrelink.com','typingagent.com','github.com','www.linkedin.com','unsplash.com']);
function reference(ref,from){
  if(ref.startsWith('#')){check(new RegExp(`\\bid=["']${ref.slice(1)}["']`).test(html),`Anchor ${ref}`);return;}
  if(ref.startsWith('mailto:')){check(ref==='mailto:cameron.hendry@hotmail.com','Authorized email link');return;}
  const u=new URL(ref,new URL(path.relative(root,from).replaceAll(path.sep,'/'),localURL));
  if(u.origin!==new URL(localURL).origin){check(u.protocol==='https:'&&allowedHosts.has(u.hostname)&&!u.username&&!u.password,`External link ${u.hostname}`);return;}
  let dest=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(fs.existsSync(dest)&&fs.statSync(dest).isDirectory())dest=path.join(dest,'index.html');
  check(dest.startsWith(root+path.sep)&&fs.existsSync(dest)&&fs.statSync(dest).isFile(),`Resource ${u.pathname}`);
}
check((html.match(/<h1\b/g)||[]).length===1,'One identity heading');
check(html.includes('Cameron Hendry | Software Engineer'),'Official title');
check(html.includes('rel="canonical" href="https://chendry10.github.io/"'),'Canonical portfolio URL');
check(!/Compare all five|\/options\/|\/qa\//.test(html),'Selected site has no comparison or QA navigation');
check(html.includes('data-initial-song="victory"')&&html.includes('data-lyre-demo'),'Real preselected demo');
check(html.indexOf('class="live-demo"')<html.indexOf('class="music-engineering"'),'Demo directly follows the score journey');
check(html.includes('SwingVision')&&html.includes('command-line'),'Accurate compact Tennis');
check(html.includes('<noscript>'),'Native no-JS fallback');
check((html.match(/<video\b/g)||[]).length===1&&html.includes('data-product-bay'),'One genuine game instance with a reading destination');
const moduleVersion=file=>hash(fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n')).slice(0,12);
check(html.includes(`src="./motion.js?v=${moduleVersion('motion.js')}"`),'Animation entry URL matches its content for returning visitors');
check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes(`import('./switch-scene.js?v=${moduleVersion('switch-scene.js')}')`),'Deferred key renderer URL matches its content');
for(const m of html.matchAll(/\b(?:href|src|poster|data-source|data-source-small)="([^"]+)"/g))reference(m[1],path.join(root,'index.html'));
for(const m of html.matchAll(/\bsrcset="([^"]+)"/g))for(const item of m[1].split(','))reference(item.trim().split(/\s+/)[0],path.join(root,'index.html'));
for(const file of files){
  const relative=path.relative(root,file).replaceAll(path.sep,'/');
  check(!fs.lstatSync(file).isSymbolicLink(),`No symlink: ${relative}`);
  check(!/(^|\/)(qa|capture-frames|capture-direct|node_modules|\.git)(\/|$)|\.(?:csv|xlsx|sqlite|key|pem|blend\d*|exr|hdr|fbx|step|stp)$|(^|\/)\.env|^shared\/assets\/product\/key-sequence\/.*\.png$/i.test(relative),`Public artifact only: ${relative}`);
  if(/\.(?:html|css|js|json|xml|md|txt)$/.test(file)){
    try{new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(file));check(true,`UTF-8 ${relative}`);}
    catch{check(false,`Invalid UTF-8 ${relative}`);}
  }
  if(!/\.(js|css)$/.test(file))continue;
  const source=fs.readFileSync(file,'utf8');
  if(file.endsWith('.js')){
    check(spawnSync(process.execPath,['--check',file],{encoding:'utf8'}).status===0,`Syntax ${relative}`);
    for(const re of [/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g,/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g])for(const m of source.matchAll(re))reference(m[1],file);
    check(!/\b(?:eval|Function)\s*\(/.test(source),`No evaluated code: ${relative}`);
  }else for(const m of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g))if(!decodeURIComponent(m[1]).startsWith('#')&&!m[1].startsWith('data:'))reference(m[1],file);
}
const media=JSON.parse(fs.readFileSync(path.join(root,'shared/assets/product/blizzard-recording-provenance.json')));
for(const asset of media.assets)check(hash(fs.readFileSync(path.join(root,'shared/assets/product',asset.file)))===asset.sha256,`Genuine recording ${asset.file}`);
const photos=JSON.parse(fs.readFileSync(path.join(root,'shared/assets/photography/provenance.json')));
for(const asset of photos.assets)check(hash(fs.readFileSync(path.join(root,'shared/assets/photography',asset.file)))===asset.sha256,`Licensed photo ${asset.file}`);
const scores=JSON.parse(fs.readFileSync(path.join(root,'shared/assets/lyrelink/manifest.json')));
check(scores.length===9&&scores.every(s=>fs.existsSync(path.join(root,'shared/assets/lyrelink',s.file))),'All nine complete public parts');
const pdf=fs.readFileSync(path.join(root,'shared/assets/Cameron-Hendry-Resume.pdf'));
const keyStill=JSON.parse(fs.readFileSync(path.join(root,'shared/assets/product/keystroke-still-provenance.json')));
const cadNotice=JSON.parse(fs.readFileSync(path.join(root,'shared/assets/product/cherry-keycaps-source.json')));
check(cadNotice.license==='MIT'&&hash(fs.readFileSync(path.join(root,'shared/assets/product',cadNotice.licenseFile)))===cadNotice.licenseSHA256,'Licensed keycap CAD keeps its complete upstream MIT notice');
check(hash(fs.readFileSync(path.join(root,'shared/assets/product',keyStill.file)))===keyStill.sha256,'Authored key fallback matches its provenance');
const posterSize=webpSize(fs.readFileSync(path.join(root,'shared/assets/product',keyStill.file)));
check(keyStill.file.endsWith('.webp')&&posterSize?.[0]===keyStill.width&&posterSize?.[1]===keyStill.height,'Hero still WebP dimensions agree with its provenance');
for(const variant of keyStill.variants||[]){
  const bytes=fs.readFileSync(path.join(root,'shared/assets/product',variant.file)),size=webpSize(bytes);
  check(hash(bytes)===variant.sha256&&bytes.length===variant.bytes&&size?.[0]===variant.width&&size?.[1]===variant.height,`Responsive hero integrity ${variant.width}`);
}
check(hash(fs.readFileSync(path.join(root,keyStill.source),'utf8').replaceAll('\r\n','\n'))===keyStill.sourceSHA256,'Reproducible Blender source matches hero provenance');
const sequenceRoot=path.join(root,'shared/assets/product/key-sequence');
const sequence=JSON.parse(fs.readFileSync(path.join(sequenceRoot,'manifest.json')));
check(sequence.frameCount===keyStill.sequence.frames&&sequence.width===keyStill.sequence.width&&sequence.height===keyStill.sequence.height,'Sequence agrees with its rendering provenance');
const mechanical=keyStill.mechanismValidation;
check(mechanical?.sourceSHA256===keyStill.sourceSHA256&&mechanical?.positions===1001&&mechanical?.surfaceIntersections===0&&mechanical?.framingFailures===0&&mechanical?.minimumCapFrameMargin>=.045&&mechanical?.springMinimumTurnClearanceMm>0,'Current rendered mechanism has matching clearance and framing evidence');
if(mechanical?.auditSource)check(hash(fs.readFileSync(path.join(root,mechanical.auditSource),'utf8').replaceAll('\r\n','\n'))===mechanical.auditSHA256,'Mechanical audit source matches its recorded result');
check(sequence.frames.length===sequence.frameCount&&Number.isInteger(sequence.frameCount)&&sequence.frameCount>=101&&sequence.frameCount<=401,'Complete bounded key sequence');
check(sequence.frames[0].progress===0&&sequence.frames.at(-1).progress===1&&sequence.frames[sequence.initialIndex].progress===.42,'Sequence covers the full mechanism and exact hero pose');
let sequenceBytes=0;
for(const [index,frame]of sequence.frames.entries()){
  const safe=/^key-\d{3}\.webp$/.test(frame.file);check(safe,`Safe key frame ${index}`);if(!safe)continue;
  const bytes=fs.readFileSync(path.join(sequenceRoot,frame.file)),size=webpSize(bytes);sequenceBytes+=bytes.length;
  check(frame.index===index&&frame.progress>=0&&frame.progress<=1&&(!index||frame.progress>sequence.frames[index-1].progress),`Ordered key frame ${index}`);
  check(hash(bytes)===frame.sha256&&bytes.length===frame.bytes,`Key frame integrity ${index}`);
  check(size?.[0]===sequence.width&&size?.[1]===sequence.height&&frame.width===sequence.width&&frame.height===sequence.height,`Native key frame dimensions ${index}`);
}
check(sequenceBytes<=32*1024*1024,'Compressed key sequence stays within its delivery budget');
if(sequence.compact){
  check(sequence.compact.width===960&&sequence.compact.height===840&&sequence.compact.frames.length===sequence.frameCount,'Complete pre-sized medium sequence');
  for(const [index,frame]of sequence.compact.frames.entries()){
    const safe=frame.file===`key-${String(index).padStart(3,'0')}-960.webp`;check(safe,`Safe compact key frame ${index}`);if(!safe)continue;
    const bytes=fs.readFileSync(path.join(sequenceRoot,frame.file)),size=webpSize(bytes);
    check(frame.index===index&&frame.progress===sequence.frames[index].progress,`Compact pose matches original ${index}`);
    check(hash(bytes)===frame.sha256&&bytes.length===frame.bytes,`Compact key integrity ${index}`);
    check(size?.[0]===960&&size?.[1]===840&&frame.width===960&&frame.height===840,`Compact key dimensions ${index}`);
  }
  const unique=new Map([...sequence.frames,...sequence.compact.frames].map(f=>[f.sha256,f.bytes]));
  check([...unique.values()].reduce((sum,n)=>sum+n,0)<=32*1024*1024,'Both sequence tiers fit bounded compressed cache');
}
check(hash(pdf)==='1e9c5a727407089a81f3761cc1530ab8eddbfad3993c7ba137d8e52020909f9d','Approved one-page PDF with verified portfolio link');
check(fs.existsSync('.nojekyll'),'Buildless GitHub Pages deployment');
check(!fs.existsSync('.openai'),'No former hosting configuration');
check(fs.readFileSync('Cameron_Hendry_Resume.pdf').equals(pdf),'Existing public resume address serves the current PDF');
console.log(JSON.stringify({checks,passed:checks-errors.length,files:files.length,runtimeBytes:files.reduce((sum,f)=>sum+fs.statSync(f).size,0),errors},null,2));
if(errors.length)process.exitCode=1;

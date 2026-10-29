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
  check(!/\.(?:blend\d*|exr|hdr|fbx|glb|gltf|step|stp|key|pem|sqlite|csv|xlsx)$|(^|\/)\.env(?:\.|$)|^shared\/assets\/product\/key-sequence\/.*\.png$/i.test(relative),`No raw or private publication file: ${relative}`);
}
const allowedHosts=new Set(['chendry10.github.io','lyrelink.com','typingagent.com','github.com','www.linkedin.com','unsplash.com','sketchfab.com','creativecommons.org']);
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
check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes(`from './score-journey.js?v=${moduleVersion('score-journey.js')}'`),'Score journey URL matches its content for returning visitors');
check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes(`import('./switch-scene.js?v=${moduleVersion('switch-scene.js')}')`),'Deferred key renderer URL matches its content');
for(const m of html.matchAll(/\b(?:href|src|poster|data-source|data-source-small)="([^"]+)"/g))reference(m[1],path.join(root,'index.html'));
for(const m of html.matchAll(/\bsrcset="([^"]+)"/g))for(const item of m[1].split(','))reference(item.trim().split(/\s+/)[0],path.join(root,'index.html'));
for(const file of files){
  const relative=path.relative(root,file).replaceAll(path.sep,'/');
  check(!fs.lstatSync(file).isSymbolicLink(),`No symlink: ${relative}`);
  check(!/(^|\/)(qa|capture-frames|capture-direct|node_modules|\.git)(\/|$)|\.(?:csv|xlsx|sqlite|key|pem|blend\d*|exr|hdr|fbx|glb|gltf|step|stp)$|(^|\/)\.env|^shared\/assets\/product\/key-sequence\/.*\.png$/i.test(relative),`Public artifact only: ${relative}`);
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
const typing=JSON.parse(fs.readFileSync(path.join(root,'shared/assets/product/typing-keyboard-provenance.json')));
const typingRoot=path.join(root,'shared/assets/product');
for(const asset of typing.assets){
  const bytes=fs.readFileSync(path.join(typingRoot,asset.file));
  check(hash(bytes)===asset.sha256&&bytes.length===asset.bytes,`Synchronized film integrity ${asset.file}`);
  if(asset.file.endsWith('.webp'))check(webpSize(bytes)?.join('x')===`${asset.width}x${asset.height}`,`Synchronized poster dimensions ${asset.file}`);
  else check(asset.r_frame_rate==='60/1'&&Number(asset.nb_frames)===456&&bytes.length<4*1024*1024,`Bounded 60 fps film ${asset.file}`);
}
for(const source of typing.sources)check(hash(fs.readFileSync(path.join(root,source.file),'utf8').replaceAll('\r\n','\n'))===source.sha256,`Typing production source ${source.file}`);
const typingBytes=fs.readFileSync(path.join(typingRoot,typing.timing.timeline));
check(hash(typingBytes)===typing.timing.sha256,'Captured key timeline integrity');
const typingTimeline=JSON.parse(typingBytes),downs=typingTimeline.events.filter(e=>e.type==='keydown'&&e.at>=0);
const gaps=downs.slice(1).map((e,i)=>e.at-downs[i].at);
check(downs.length===19&&Math.abs(gaps.reduce((a,b)=>a+b,0)/gaps.length-400)<1&&gaps.every(g=>g>=380&&g<=420),'Captured typing maintains 30 WPM without bursts');
check(typingTimeline.events.every(e=>['keydown','keyup'].includes(e.type)&&/^[a-z]$/.test(e.key)&&Number.isFinite(e.at)),'Published timeline contains only game key timing');
check(downs.every(e=>typingTimeline.events.some(up=>up.type==='keyup'&&up.key===e.key&&up.at>e.at&&up.at-e.at<150)),'Every key has a captured release');
check(html.includes('blizzard-keyboard.mp4')&&html.includes('blizzard-keyboard-1280.mp4'),'Both synchronized movie tiers are wired into the site');
check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes(`from './product-bridge.js?v=${moduleVersion('product-bridge.js')}'`),'Updated product bridge is cache-versioned');
for(const css of ['story.css','production.css'])check(html.includes(`${css}?v=${moduleVersion(css)}`),`Updated layout is cache-versioned: ${css}`);
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
const processorRoot=path.join(root,'shared/assets/product/processor-sequence');
const processor=JSON.parse(fs.readFileSync(path.join(processorRoot,'manifest.json')));
const processorNotice=JSON.parse(fs.readFileSync(path.join(processorRoot,'source-notice.json')));
check(processor.frameCount===121&&processor.width===1280&&processor.height===1120&&processor.initialIndex===0,'Selected CPU dimensions and opening pose');
check(processor.frames[0].progress===0&&processor.frames.at(-1).progress===1,'CPU covers complete opening');
for(const [tier,width,height,suffix] of [[processor,1280,1120,''],[processor.compact,960,840,'-960']]){
  check(tier.frames.length===121,'Complete CPU tier');
  for(const [index,frame] of tier.frames.entries()){
    const safe=frame.file===`key-${String(index).padStart(3,'0')}${suffix}.webp`;
    check(safe,`Safe CPU frame ${suffix}/${index}`);if(!safe)continue;
    const bytes=fs.readFileSync(path.join(processorRoot,frame.file)),size=webpSize(bytes);
    check(frame.index===index&&frame.progress===processor.frames[index].progress&&(!index||frame.progress>tier.frames[index-1].progress),`Ordered CPU pose ${suffix}/${index}`);
    check(hash(bytes)===frame.sha256&&bytes.length===frame.bytes&&size?.[0]===width&&size?.[1]===height&&frame.width===width&&frame.height===height,`CPU asset integrity ${suffix}/${index}`);
  }
}
check([...processor.frames,...processor.compact.frames].reduce((sum,f)=>sum+f.bytes,0)<=32*1024*1024,'CPU compressed tiers fit cache');
const cpuHero=fs.readFileSync(path.join(processorRoot,'hero.webp'));
check(hash(cpuHero)===processorNotice.heroSHA256&&webpSize(cpuHero)?.join('x')==='2560x2240','Selected CPU hero integrity');
for(const variant of processorNotice.variants){
  const bytes=fs.readFileSync(path.join(processorRoot,variant.file));
  check(hash(bytes)===variant.sha256&&bytes.length===variant.bytes&&webpSize(bytes)?.join('x')===`${variant.width}x${variant.height}`,`CPU responsive hero ${variant.width}`);
}
check(hash(fs.readFileSync(path.join(root,processorNotice.source),'utf8').replaceAll('\r\n','\n'))===processorNotice.sourceSHA256,'CPU authored source provenance');
check(html.includes('keystroke-sequence/hero.webp')&&!html.includes('processor-sequence/hero.webp'),'Keystroke story is the active opening image');
check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes("study:'keystroke'"),'Keystroke story is the active scroll sequence');
const inputRoot=path.join(root,'shared/assets/product/keystroke-sequence');
const inputManifest=JSON.parse(fs.readFileSync(path.join(inputRoot,'manifest.json'))),inputNotice=JSON.parse(fs.readFileSync(path.join(inputRoot,'provenance.json')));
check(inputManifest.frameCount===181&&inputManifest.initialIndex===0,'Full keystroke narrative');
check(hash(fs.readFileSync(path.join(root,inputNotice.source),'utf8').replaceAll('\r\n','\n'))===inputNotice.sourceSHA256,'Keystroke renderer provenance');
check(hash(fs.readFileSync(path.join(inputRoot,'manifest.json')))===inputNotice.manifestSHA256,'Keystroke manifest provenance');
let inputBytes=0;
for(const [tier,w,h,suffix]of [[inputManifest,1600,1400,''],[inputManifest.compact,960,840,'-960']]){
 check(tier.width===w&&tier.height===h&&tier.frames.length===181,'Keystroke responsive tier');
 for(const [i,f]of tier.frames.entries()){
  const safe=f.file===`key-${String(i).padStart(3,'0')}${suffix}.webp`;check(safe,'Safe keystroke filename');if(!safe)continue;
  const b=fs.readFileSync(path.join(inputRoot,f.file));inputBytes+=b.length;
  check(f.index===i&&f.progress===i/180&&f.width===w&&f.height===h,'Ordered keystroke frames');
  check(hash(b)===f.sha256&&b.length===f.bytes&&webpSize(b)?.join('x')===`${w}x${h}`,'Keystroke image integrity');
 }
}
check(inputBytes===inputNotice.sequenceBytes&&inputBytes<=32*1024*1024,'Keystroke sequence fits encoded cache');
for(const f of inputNotice.hero){const b=fs.readFileSync(path.join(inputRoot,f.file));check(hash(b)===f.sha256&&b.length===f.bytes&&webpSize(b)?.join('x')===`${f.width}x${f.height}`,'High resolution opening image integrity');}
check(inputNotice.gameplay.keys.map(x=>x.key).join('')==='bowl'&&inputNotice.gameplay.originalDimensions.join('x')==='2560x1326','Real recorded word and source aspect ratio');
check(hash(fs.readFileSync(path.join(inputRoot,'projection.json')))===inputNotice.projection.sha256,'Audited Blender projection integrity');
const projection=JSON.parse(fs.readFileSync(path.join(inputRoot,'projection.json')));
check(projection.keyboardFrameMargin>.02,'Final keyboard stays inside the frame');
for(const asset of inputNotice.handoff.posters){const bytes=fs.readFileSync(path.join(inputRoot,asset.file));check(hash(bytes)===asset.sha256&&bytes.length===asset.bytes,'Matching gameplay handoff poster integrity');}
for(const file of ['input-handoff.js','gameplay-film.js'])check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes(`from './${file}?v=${moduleVersion(file)}'`),'Handoff module cache version');
check(html.includes(`./keystroke.css?v=${moduleVersion('keystroke.css')}`),'Opening style cache version');
check(html.includes(`./mobile-motion.css?v=${moduleVersion('mobile-motion.css')}`),'Mobile style cache version');
for(const file of ['scroll-viewport.js','product-bridge.js'])check(fs.readFileSync(path.join(root,'motion.js'),'utf8').includes(`from './${file}?v=${moduleVersion(file)}'`),'Mobile layout module cache version');
check(fs.readFileSync(path.join(root,'product-bridge.js'),'utf8').includes(`from './scroll-viewport.js?v=${moduleVersion('scroll-viewport.js')}'`),'Bridge viewport cache version');
const trumpetRoot=path.join(root,'shared/assets/product/trumpet-sequence');
const trumpet=JSON.parse(fs.readFileSync(path.join(trumpetRoot,'manifest.json')));
const trumpetNotice=JSON.parse(fs.readFileSync(path.join(trumpetRoot,'provenance.json')));
check(trumpet.frameCount===121&&trumpet.frames.length===121&&trumpet.compact.frames.length===121,'Complete trumpet sequence and compact alternative');
check(trumpetNotice.model.license==='CC BY 4.0'&&html.includes('Trumpet model by Pakaku')&&html.includes(trumpetNotice.model.licenseURL),'Visible original model attribution and license');
check(hash(fs.readFileSync(path.join(root,trumpetNotice.source),'utf8').replaceAll('\r\n','\n'))===trumpetNotice.sourceSHA256,'Trumpet renderer provenance');
check(hash(fs.readFileSync(path.join(trumpetRoot,'manifest.json')))===trumpetNotice.manifestSHA256,'Trumpet manifest provenance');
let trumpetBytes=0;
for(const [frames,width,height,suffix] of [[trumpet.frames,1920,1080,''],[trumpet.compact.frames,960,540,'-960']]){
  for(const [index,asset] of frames.entries()){
    const bytes=fs.readFileSync(path.join(trumpetRoot,asset.file));trumpetBytes+=bytes.length;
    check(asset.file===`key-${String(index).padStart(3,'0')}${suffix}.webp`&&asset.index===index&&asset.progress===index/120,'Ordered trumpet frames');
    check(hash(bytes)===asset.sha256&&bytes.length===asset.bytes&&webpSize(bytes)?.join('x')===`${width}x${height}`,'Trumpet frame dimensions and integrity');
  }
}
check(trumpetBytes<=32*1024*1024&&trumpetBytes===trumpetNotice.sequenceBytes,'Trumpet encoded sequence fits the player budget');
for(const asset of trumpetNotice.posters){const bytes=fs.readFileSync(path.join(trumpetRoot,asset.file));check(hash(bytes)===asset.sha256&&webpSize(bytes)?.join('x')===`${asset.width}x${asset.height}`,'Responsive trumpet poster integrity');}
check(hash(pdf)==='1e9c5a727407089a81f3761cc1530ab8eddbfad3993c7ba137d8e52020909f9d','Approved one-page PDF with verified portfolio link');
check(fs.existsSync('.nojekyll'),'Buildless GitHub Pages deployment');
check(!fs.existsSync('.openai'),'No former hosting configuration');
check(fs.readFileSync('Cameron_Hendry_Resume.pdf').equals(pdf),'Existing public resume address serves the current PDF');
console.log(JSON.stringify({checks,passed:checks-errors.length,files:files.length,runtimeBytes:files.reduce((sum,f)=>sum+fs.statSync(f).size,0),errors},null,2));
if(errors.length)process.exitCode=1;

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve('.');
const errors=[];let checks=0;
const check=(ok,label)=>{checks++;if(!ok)errors.push(label);};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=[...walk(path.join(root,'shared')),...fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(?:html|css|js|pdf|txt|xml)$/.test(e.name)).map(e=>path.join(root,e.name))],html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const localURL='https://portfolio.invalid/';
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
for(const m of html.matchAll(/\b(?:href|src|poster|data-source|data-source-small)="([^"]+)"/g))reference(m[1],path.join(root,'index.html'));
for(const m of html.matchAll(/\bsrcset="([^"]+)"/g))for(const item of m[1].split(','))reference(item.trim().split(/\s+/)[0],path.join(root,'index.html'));
for(const file of files){
  const relative=path.relative(root,file).replaceAll(path.sep,'/');
  check(!fs.lstatSync(file).isSymbolicLink(),`No symlink: ${relative}`);
  check(!/(^|\/)(qa|capture-frames|capture-direct|node_modules|\.git)(\/|$)|\.(?:csv|xlsx|sqlite|key|pem)$|(^|\/)\.env/i.test(relative),`Public artifact only: ${relative}`);
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
check(hash(fs.readFileSync(path.join(root,'shared/assets/product',keyStill.file)))===keyStill.sha256,'Authored key fallback matches its provenance');
check(keyStill.file.endsWith('.jpg')&&fs.readFileSync(path.join(root,'shared/assets/product',keyStill.file)).subarray(0,3).equals(Buffer.from([255,216,255])),'Hero still format agrees with its JPEG content type');
check(hash(pdf)==='1e9c5a727407089a81f3761cc1530ab8eddbfad3993c7ba137d8e52020909f9d','Approved one-page PDF with verified portfolio link');
check(fs.existsSync('.nojekyll'),'Buildless GitHub Pages deployment');
check(!fs.existsSync('.openai'),'No former hosting configuration');
check(fs.readFileSync('Cameron_Hendry_Resume.pdf').equals(pdf),'Existing public resume address serves the current PDF');
console.log(JSON.stringify({checks,passed:checks-errors.length,files:files.length,runtimeBytes:files.reduce((sum,f)=>sum+fs.statSync(f).size,0),errors},null,2));
if(errors.length)process.exitCode=1;

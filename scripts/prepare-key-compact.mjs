// Optional authoring step: pre-size the medium display sequence once rather
// than resize every 1600px source image in each visitor's scroll decoder.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='shared/assets/product/key-sequence';
const sourceDirectory=process.argv[2];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const generated=new Map();
const frames=manifest.frames.map(frame=>{
  const file=frame.file.replace('.webp','-960.webp'),output=path.join(root,file);
  const previous=generated.get(frame.sha256);
  if(previous)fs.copyFileSync(previous,output);
  else{
    const input=sourceDirectory?path.join(sourceDirectory,frame.file.replace('.webp','.png')):path.join(root,frame.file);
    if(!fs.existsSync(input))throw Error(`Missing source: ${input}`);
    const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf','scale=960:840:flags=lanczos','-c:v','libwebp','-quality','93','-compression_level','6','-map_metadata','-1',output],{encoding:'utf8'});
    if(result.status!==0)throw Error(result.stderr||'FFmpeg conversion failed');
    generated.set(frame.sha256,output);
  }
  const bytes=fs.readFileSync(output);
  return{...frame,file,width:960,height:840,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
manifest.compact={width:960,height:840,encoding:'Lanczos resampling, libwebp quality93; same original Cycles poses',frames};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({frames:frames.length,unique:generated.size,totalBytes:frames.reduce((n,f)=>n+f.bytes,0)}));

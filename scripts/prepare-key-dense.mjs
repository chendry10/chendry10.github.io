// Insert physically rendered .001 cap-lift poses into the original .005 sequence.
// Existing encoded frames are reused byte-for-byte, never recompressed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const directory=process.argv[2];
if(!directory)throw Error('Pass the dense-lift PNG directory');
const root='shared/assets/product/key-sequence';
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
if(manifest.frameCount!==201)throw Error('Start with the original 201-frame sequence');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const originals=manifest.frames.map((frame,i)=>{
  const medium=manifest.compact.frames[i],full=fs.readFileSync(path.join(root,frame.file)),compact=fs.readFileSync(path.join(root,medium.file));
  if(full.length!==frame.bytes||hash(full)!==frame.sha256||compact.length!==medium.bytes||hash(compact)!==medium.sha256)throw Error(`Original frame ${i} differs from its manifest. Restore the original sequence before retrying.`);
  return{progress:frame.progress,full,compact};
});
const additions=[];
for(let p=291;p<380;p++){
  if(p%5===0)continue;
  const input=path.join(directory,`lift-${p}.png`),bytes=fs.readFileSync(input);
  if(bytes.readUInt32BE(16)!==1600||bytes.readUInt32BE(20)!==1400||bytes.toString('ascii',bytes.length-8,bytes.length-4)!=='IEND')throw Error(`Invalid render ${input}`);
  additions.push({progress:p/1000,input});
}
const ordered=[...originals,...additions].sort((a,b)=>a.progress-b.progress),frames=[],compact=[];
// Conversion failures cannot leave half-reindexed public frames. Keep the
// candidate outside the served site until every output has been produced.
const tempPrefix=path.join(os.tmpdir(),'portfolio-key-dense-');
const staging=fs.mkdtempSync(tempPrefix);
try{
for(const [index,pose]of ordered.entries()){
  for(const small of[false,true]){
    const file=`key-${String(index).padStart(3,'0')}${small?'-960':''}.webp`,output=path.join(staging,file);
    if(pose.input){
      const scale=small?['-vf','scale=960:840:flags=lanczos']:[];
      const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',pose.input,...scale,'-map_metadata','-1','-frames:v','1','-c:v','libwebp','-quality',small?'93':'91','-compression_level','6',output],{encoding:'utf8'});
      if(r.status!==0)throw Error(r.stderr||'Encoding failed');
    }else fs.writeFileSync(output,small?pose.compact:pose.full);
    const bytes=fs.readFileSync(output);
    (small?compact:frames).push({index,progress:pose.progress,file,width:small?960:1600,height:small?840:1400,sha256:hash(bytes),bytes:bytes.length});
  }
}
manifest.frameCount=frames.length;manifest.initialIndex=frames.findIndex(f=>f.progress===.42);manifest.frames=frames;manifest.compact.frames=compact;
manifest.sampling='Original .005 samples plus .001 samples across the first keycap lift (.29-.38). All frames rendered in Blender Cycles.';
for(const frame of[...frames,...compact])fs.copyFileSync(path.join(staging,frame.file),path.join(root,frame.file));
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const provenanceFile='shared/assets/product/keystroke-still-provenance.json',provenance=JSON.parse(fs.readFileSync(provenanceFile));
provenance.sequence.frames=frames.length;provenance.sequence.sampling=manifest.sampling;
fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({frames:frames.length,initialIndex:manifest.initialIndex,added:additions.length,uniqueEncodedBytes:[...new Map([...frames,...compact].map(f=>[f.sha256,f.bytes])).values()].reduce((s,n)=>s+n,0)}));
}finally{
  if(path.resolve(staging).startsWith(path.resolve(tempPrefix)))fs.rmSync(staging,{recursive:true,force:true});
}

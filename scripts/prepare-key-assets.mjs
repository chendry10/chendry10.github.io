/** Convert locally rendered Blender PNGs; raw scene, HDRI and .blend stay off the site. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const [renderDirectory,heroPNG,...flags]=process.argv.slice(2);
if(!renderDirectory||!heroPNG)throw new Error('Usage: node scripts/prepare-key-assets.mjs <render-directory> <hero.png> [--wait] [--output-root <directory>]');
const outputFlag=flags.indexOf('--output-root');
if(outputFlag>=0&&(!flags[outputFlag+1]||flags[outputFlag+1].startsWith('--')))throw new Error('Output root needs a directory');
const root=path.resolve(outputFlag<0?'shared/assets/product':flags[outputFlag+1]),output=path.join(root,'key-sequence');
fs.mkdirSync(output,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const size=b=>[b.readUInt32BE(16),b.readUInt32BE(20)];
async function completePNG(input){
  const deadline=Date.now()+60_000;
  do{
    if(fs.existsSync(input)){
      const bytes=fs.readFileSync(input);
      if(bytes.length>24&&bytes.toString('ascii',bytes.length-8,bytes.length-4)==='IEND')return bytes;
    }
    if(!flags.includes('--wait')||Date.now()>deadline)throw new Error(`Missing or incomplete render: ${input}`);
    await new Promise(resolve=>setTimeout(resolve,500));
  }while(true);
}
function convert(input,destination,width){
  const scale=width?['-vf',`scale=${width}:-2:flags=lanczos`]:[];
  const conversion=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,...scale,'-map_metadata','-1','-frames:v','1','-c:v','libwebp','-quality','91','-compression_level','6',destination],{encoding:'utf8'});
  if(conversion.error||conversion.status!==0)throw new Error(conversion.error?.message||conversion.stderr||`Conversion failed: ${input}`);
}
const frames=[];
const countFlag=flags.indexOf('--frames');
const frameCount=countFlag<0?201:Number(flags[countFlag+1]);
if(![101,201].includes(frameCount))throw new Error('Frame count must be 101 or 201');
for(let index=0;index<frameCount;index++){
  const file=`key-${String(index).padStart(3,'0')}.webp`,input=path.join(renderDirectory,file.replace('.webp','.png'));
  const [width,height]=size(await completePNG(input));
  if(width!==1600||height!==1400)throw new Error(`Unexpected native dimensions in ${input}`);
  convert(input,path.join(output,file));
  const bytes=fs.readFileSync(path.join(output,file));
  frames.push({index,progress:index/(frameCount-1),file,width,height,sha256:hash(bytes),bytes:bytes.length});
  if(index%20===0)process.stdout.write(`Compressed ${index+1}/${frameCount} key frames\n`);
}
const manifest={version:1,width:1600,height:1400,frameCount:frames.length,initialIndex:Math.round(.42*(frameCount-1)),frames};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const [width,height]=size(fs.readFileSync(heroPNG));
convert(heroPNG,path.join(root,'keystroke-cycles-hero.webp'));
for(const width of[1600,2400])convert(heroPNG,path.join(root,`keystroke-cycles-hero-${width}.webp`),width);
const heroBytes=fs.readFileSync(path.join(root,'keystroke-cycles-hero.webp'));
process.stdout.write(JSON.stringify({frames:frames.length,totalBytes:frames.reduce((n,f)=>n+f.bytes,0),poster:{file:'keystroke-cycles-hero.webp',width,height,bytes:heroBytes.length,sha256:hash(heroBytes)}},null,2)+'\n');

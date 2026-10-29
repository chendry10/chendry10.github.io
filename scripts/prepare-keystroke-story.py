"""Package Blender key-to-game renders; keep raw captures and scenes local."""
import argparse,hashlib,json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--renders',required=True);p.add_argument('--hero',required=True);p.add_argument('--events',required=True);p.add_argument('--output',required=True);a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True);frames=sorted(Path(a.renders).glob('frame-*.png'));assert len(frames)==181
sha=lambda b:hashlib.sha256(b).hexdigest()
def asset(im,file,w,h):
 im.resize((w,h),Image.Resampling.LANCZOS).save(out/file,quality=90,method=6);b=(out/file).read_bytes();return {'file':file,'width':w,'height':h,'bytes':len(b),'sha256':sha(b)}
manifest={'version':1,'width':1600,'height':1400,'frameCount':181,'initialIndex':0,'frames':[],'compact':{'width':960,'height':840,'frames':[]}}
def pack_frame(pair):
 i,f=pair;assert f.name==f'frame-{i:03d}.png';im=Image.open(f).convert('RGB');assert im.size==(1600,1400)
 return [{'index':i,'progress':i/180,**asset(im,f'key-{i:03d}{suffix}.webp',w,h)} for w,h,suffix in [(1600,1400,''),(960,840,'-960')]]
with ThreadPoolExecutor(max_workers=4) as pool:
 for i,(full,compact) in enumerate(pool.map(pack_frame,enumerate(frames))):
  manifest['frames'].append(full);manifest['compact']['frames'].append(compact)
  if i%30==0:print('PACKED',i+1,flush=True)
total=sum(f['bytes'] for f in manifest['frames']+manifest['compact']['frames']);assert total<=32*1024*1024
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')
im=Image.open(a.hero).convert('RGB');assert im.size==(2560,2240);posters=[asset(im,'hero.webp',2560,2240),asset(im,'hero-1280.webp',1280,1120),asset(im,'hero-960.webp',960,840)]
events=json.loads(Path(a.events).read_text());keys=[{'key':e['key'],'seconds':e['at']/1000} for e in events['events'] if e['type']=='keydown' and 3000<=e['at']<4800];assert ''.join(e['key'] for e in keys)=='bowl'
renderer=Path(__file__).with_name('render-keystroke-story.py')
notice={'title':'From input to play','source':'scripts/render-keystroke-story.py','sourceSHA256':sha(renderer.read_text(encoding='utf-8').encode()),'render':{'engine':'Blender 4.5 Cycles OPTIX','samples':256,'heroSamples':512,'frames':181,'width':1600,'height':1400},'manifestSHA256':sha((out/'manifest.json').read_bytes()),'sequenceBytes':total,'hero':posters,'keyboard':{'source':'scripts/build-typing-keyboard.py','cadNotice':'../cherry-keycaps-source.json','license':'MIT','changes':'Ivory and slate PBT, a satin bronze focal key, new camera path and photographic lighting.'},'gameplay':{'source':'../typing-keyboard-provenance.json','clipStartSeconds':3,'clipEndSeconds':4.8,'originalDimensions':[2560,1326],'keys':keys,'timing':'Recorded keydown contacts and screen frames share the same source time. Scroll controls playback. Cable glow is illustrative.'},'lighting':{'source':'https://polyhaven.com/a/studio_small_09','license':'CC0'}}
notice['projection']={'file':'projection.json','sha256':sha((out/'projection.json').read_bytes())}
notice['handoff']={'seconds':4.8,'posters':[{'file':f,'sha256':sha((out/f).read_bytes()),'bytes':(out/f).stat().st_size} for f in ['gameplay-handoff.webp','gameplay-handoff-1280.webp']]}
(out/'provenance.json').write_text(json.dumps(notice,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'frames':181,'sequenceMiB':round(total/1048576,2),'heroBytes':posters[0]['bytes']}))

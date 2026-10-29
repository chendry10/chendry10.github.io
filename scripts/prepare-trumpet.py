"""Package the completed Blender trumpet sequence into bounded web assets."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--renders',required=True);p.add_argument('--output',required=True);a=p.parse_args()
r=Path(a.renders);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
frames=sorted(r.glob('frame-*.png'));assert len(frames)==121,'Render all 121 frames first'
sha=lambda b:hashlib.sha256(b).hexdigest()
def asset(image,path,width,height):
 image.resize((width,height),Image.Resampling.LANCZOS).save(path,quality=90,method=6)
 b=path.read_bytes();return {'file':path.name,'width':width,'height':height,'sha256':sha(b),'bytes':len(b)}
manifest={'version':1,'width':1920,'height':1080,'frameCount':121,'initialIndex':0,'frames':[],'compact':{'width':960,'height':540,'frames':[]}}
for i,f in enumerate(frames):
 assert f.name==f'frame-{i:03d}.png'
 im=Image.open(f).convert('RGB');assert im.size==(1920,1080)
 for width,height,suffix,target in [(1920,1080,'',manifest['frames']),(960,540,'-960',manifest['compact']['frames'])]:target.append({'index':i,'progress':i/120,**asset(im,out/f'key-{i:03d}{suffix}.webp',width,height)})
total=sum(f['bytes'] for f in manifest['frames']+manifest['compact']['frames']);assert total<32*1024*1024,'Player compressed cache budget exceeded'
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')
poster=Image.open(frames[-1]);posters=[asset(poster,out/'poster.webp',1920,1080),asset(poster,out/'poster-960.webp',960,540)]
source=Path(__file__).with_name('render-silver-trumpet.py')
notice={'title':'Silver B-flat trumpet','model':{'title':'B-flat Trumpet Model','author':'Pakaku','url':'https://sketchfab.com/3d-models/8fee576c4e854be7aa1b94032f2e0341','license':'CC BY 4.0','licenseURL':'https://creativecommons.org/licenses/by/4.0/','distributionURL':'https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/000-098/8fee576c4e854be7aa1b94032f2e0341.glb','sha256':'5f9611025dae1a3e8807dd2c03795a217de80bea2bba529ef2b83013ef913049'},'changes':'Silver materials, studio lighting, and camera animation. Original relative instrument geometry preserved.','lighting':{'title':'Studio Small 09','author':'Sergej Majboroda / Poly Haven','license':'CC0','url':'https://polyhaven.com/a/studio_small_09'},'source':'scripts/render-silver-trumpet.py','sourceSHA256':sha(source.read_text(encoding='utf-8').replace('\r\n','\n').encode()),'manifestSHA256':sha((out/'manifest.json').read_bytes()),'render':{'engine':'Blender 4.5 Cycles / OPTIX','samples':192,'width':1920,'height':1080,'frames':121},'posters':posters,'sequenceBytes':total}
(out/'provenance.json').write_text(json.dumps(notice,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'frames':121,'sequenceMiB':round(total/1024/1024,2),'posterBytes':posters[0]['bytes']}))

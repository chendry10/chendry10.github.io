"""Render physical key travel from a local gameplay key-event recording.

Load the authored typing-keyboard.blend. Captured input is never generated here.
Fixed-camera poses are cached; identical poses reuse the same Cycles render.
"""
import argparse,json,math,sys
from pathlib import Path
import bpy

p=argparse.ArgumentParser()
p.add_argument('--events',required=True)
p.add_argument('--output',required=True)
p.add_argument('--preview',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
data=json.loads(Path(a.events).read_text())
scene=bpy.context.scene;scene.render.fps=60
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
scene.cycles.device='GPU'
scene.cycles.samples=128;scene.cycles.denoiser='OPTIX'
scene.cycles.use_animated_seed=False;scene.cycles.seed=417
scene.render.use_persistent_data=True
scene.render.image_settings.file_format='PNG'
keys={o.name.split(' / ')[-1].lower():o for o in scene.objects if o.name.startswith('Key / ') and len(o.name.split(' / ')[-1])==1}
rests={k:o.location.z for k,o in keys.items()}
presses=[]
for e in data['events']:
    if e['type']!='keydown':continue
    key=e['key'].lower()
    if key not in keys:raise ValueError('Missing physical key '+key)
    release=next((x['at']/1000 for x in data['events'] if x['type']=='keyup' and x['key'].lower()==key and x['at']>=e['at']),e['at']/1000+.08)
    presses.append((key,e['at']/1000,release))
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def pose(t):
    active=[]
    for key,down,up in presses:
        amount=smooth((t-(down-.065))/.065) if t<down else 1 if t<=up else 1-smooth((t-up)/.135)
        level=round(amount*16)
        if level:active.append((key,level))
    return tuple(sorted(active))
frames=[pose(i/60) for i in range(round(data['durationSeconds']*60))]
poses=list(dict.fromkeys([()]+frames))
def name(signature):return 'rest' if not signature else '_'.join(k+'-'+str(v) for k,v in signature)
manifest={'fps':60,'duration':data['durationSeconds'],'dimensions':[scene.render.resolution_x,scene.render.resolution_y],'travelMillimetres':4,'depthSteps':16,'presses':presses,'frames':[name(s)+'.png' for s in frames],'uniqueRenders':len(poses)}
(out/'frames.json').write_text(json.dumps(manifest,indent=2))
if a.preview:poses=[(),(('h',16),)]
for signature in poses:
    for k,obj in keys.items():obj.location.z=rests[k]
    for key,level in signature:keys[key].location.z=rests[key]-4*level/16
    # Every cap rim remains above the plate even at the bottom of its stroke.
    assert min(o.location.z for o in keys.values())>=6.1-1e-5
    path=out/(name(signature)+'.png')
    if path.exists():continue
    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    print('TYPING_POSE',name(signature),flush=True)

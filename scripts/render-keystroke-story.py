"""A physical keystroke becomes play: Cycles camera and key-travel study.

Uses the existing authored keyboard, with MIT Cherry-profile CAD caps; see
cherry-keycaps-source.json. Raw scene and captures stay outside publication.
"""
import argparse,sys,math,json,hashlib
from pathlib import Path
import bpy
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--keyboard',required=True);p.add_argument('--screen',required=True);p.add_argument('--screen-dir',required=True);p.add_argument('--events',required=True);p.add_argument('--output',required=True);p.add_argument('--width',type=int,default=1600);p.add_argument('--samples',type=int,default=192);p.add_argument('--frames',type=int,default=181);p.add_argument('--still',type=float);p.add_argument('--save-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=a.keyboard)
s=bpy.context.scene;studio=bpy.data.objects['Millimetre authoring scale'];cam=s.camera
for o in s.objects:o.animation_data_clear()
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
s.cycles.device='GPU';s.cycles.samples=a.samples;s.cycles.denoiser='OPENIMAGEDENOISE';s.cycles.use_denoising=True;s.cycles.adaptive_threshold=.005;s.cycles.seed=417;s.cycles.use_animated_seed=False;s.render.use_persistent_data=True
s.render.resolution_x=a.width;s.render.resolution_y=round(a.width*7/8);s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.fps=30;s.frame_end=a.frames;s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=-.2

def rgb(h):
 v=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)];return tuple(x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4 for x in v)
def mat(name,color,rough=.3,metal=0,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb(color),1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
 if emission:b.inputs['Emission Color'].default_value=(*rgb(color),1);b.inputs['Emission Strength'].default_value=emission
 return m
def box(name,loc,size,m,r=.5):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.location=loc;o.parent=studio;o.data.materials.append(m)
 if r:
  b=o.modifiers.new('Manufactured edge','BEVEL');b.width=r;b.segments=6;b.harden_normals=True;o.modifiers.new('Surface normals','WEIGHTED_NORMAL')
 return o
def curve(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=4;sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for v,co in zip(sp.points,points):v.co=(*co,1)
 o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.parent=studio;o.data.materials.append(m);return o
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,power,w,h,color,target):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=w;d.size_y=h;d.color=rgb(color);o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.parent=studio;o.location=loc;aim(o,target)

# Fine PBT texture, real cap silhouettes and flush glyphs from the approved model.
for m in bpy.data.materials:
 if m.name.startswith('PBT'):
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb('#c9c8c0' if 'charcoal' in m.name else '#90948f'),1)
  for n in m.node_tree.nodes:
   if n.type=='VALTORGB':
    n.color_ramp.elements[0].color=(*rgb('#b6b5ad' if 'fine injection' in m.name else '#66757f'),1);n.color_ramp.elements[1].color=(*rgb('#bcbcb4' if 'fine injection' in m.name else '#6e7d87'),1)
   if n.type=='MAP_RANGE':n.inputs['To Min'].default_value=.37;n.inputs['To Max'].default_value=.44
   if n.type=='BUMP':n.inputs['Distance'].default_value=.000012
 if 'Ivory double' in m.name:m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*rgb('#20282c'),1)
metal=mat('Bead blasted graphite enclosure','#293641',.29,1);black=mat('Black polymer bezel','#080d12',.38);rubber=mat('Woven charcoal USB cable','#131b22',.65);amber=mat('Warm input signal','#ffbf67',.24,0,3)
# One tactile, warm focal key introduces the actual first recorded letter.
accent=mat('Satin bronze B key','#bfa16e',.31,1)
accent_ink=mat('Ivory focal legend','#ede2c8',.5)
for o in s.objects:
 if o.name.startswith('CAD ') and o.name.endswith(' / B'):o.data.materials.clear();o.data.materials.append(accent)
 if o.name=='Legend / B':o.data.materials.clear();o.data.materials.append(accent_ink)
for o in list(s.objects):
 if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
light('Large ivory silk',(-80,-100,330),2.1,240,120,'#f3f4f3',(0,0,0))
light('Cool edge reflection',(190,90,160),.6,50,280,'#94bce0',(30,0,20))
light('Amber grazing strip',(-180,80,100),.08,25,240,'#ffd1a1',(0,0,20))
light('Front soft card',(10,-250,60),.16,300,60,'#ffffff',(0,0,20))
s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.045
wn=s.world.node_tree.nodes;wl=s.world.node_tree.links;ray=wn.new('ShaderNodeLightPath');camera_bg=wn.new('ShaderNodeBackground');camera_bg.inputs['Color'].default_value=(*rgb('#080e21'),1);camera_bg.inputs['Strength'].default_value=.7;world_mix=wn.new('ShaderNodeMixShader');wl.new(ray.outputs['Is Camera Ray'],world_mix.inputs[0]);wl.new(wn.get('Background').outputs[0],world_mix.inputs[1]);wl.new(camera_bg.outputs[0],world_mix.inputs[2]);wl.new(world_mix.outputs[0],wn.get('World Output').inputs['Surface'])
floor=bpy.data.objects.get('Studio tabletop');floor.scale=(100,100,1)
ground=mat('Midnight seamless floor','#080e21',.65);ground.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.1
floor.data.materials.clear();floor.data.materials.append(ground)

# A restrained display is revealed by the camera, not assembled through itself.
box('Display aluminium back',(0,186,164),(326,9,177),metal,4)
box('Inset display bezel',(0,180.7,164),(322,2,173),black,3)
box('Stand riser',(0,194,48),(34,12,104),metal,3)
box('Weighted stand foot',(0,165,-3),(126,82,7),metal,4)
screen=bpy.data.materials.new('Actual Blizzard Defense capture');screen.use_nodes=True;n=screen.node_tree.nodes;n.clear();output=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');em.inputs['Strength'].default_value=.8;tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(a.screen);screen.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);screen.node_tree.links.new(em.outputs[0],output.inputs['Surface'])
screen_half=155*1326/2560
mesh=bpy.data.meshes.new('Display picture');mesh.from_pydata([(-155,179.5,164-screen_half),(155,179.5,164-screen_half),(155,179.5,164+screen_half),(-155,179.5,164+screen_half)],[],[(0,1,2,3)]);mesh.uv_layers.new()
for loop,uv in zip(mesh.uv_layers.active.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=uv
display=bpy.data.objects.new('Actual game screen',mesh);s.collection.objects.link(display);display.parent=studio;mesh.materials.append(screen)
for name in ['Display aluminium back','Inset display bezel','Stand riser','Weighted stand foot','Actual game screen']:
 bpy.data.objects[name].location.y-=60
box('USB-C shell',(115,57,0),(8,9,4),metal,1)
# Continuous cable path, sampled cubic Bezier segments; pulse is an illustrative
# glow on the same physical path, rather than a loose object crossing the scene.
segments=[((115,61,0),(115,90,-3),(180,72,-3),(181,103,-3)),((181,103,-3),(184,140,-3),(168,125,-3),(147,129,0)),((147,129,0),(122,152,10),(115,140,100),(115,131,121))]
path=[]
for q in segments:
 for i in range(81):
  t=i/80;path.append(tuple((1-t)**3*q[0][j]+3*(1-t)**2*t*q[1][j]+3*(1-t)*t*t*q[2][j]+t**3*q[3][j] for j in range(3)))
curve('Connected USB cable',path,1.8,rubber)
pulse=curve('Signal travelling along cable',path[:9],1.85,amber)
keys={o.name.split(' / ')[-1].lower():o for o in s.objects if o.name.startswith('Key / ') and len(o.name.split(' / ')[-1])==1};rests={k:o.location.z for k,o in keys.items()}
leds=[]
for key in 'bowl':
 k=keys[key];m=mat('Input feedback '+key,'#ffc278',.3,0,.05)
 # Thin light inside the gap; stays below the lowest travelling key rim.
 o=box('Under-key light '+key,(k.location.x,k.location.y,5.95),(14,14,.12),m,.2);leds.append((key,m.node_tree.nodes.get('Principled BSDF')))
events=json.loads(Path(a.events).read_text())['events'];presses=[]
for e in events:
 if e['type']=='keydown' and 3000<=e['at']<4800:
  end=next(x['at'] for x in events if x['type']=='keyup' and x['key']==e['key'] and x['at']>e['at']);presses.append((e['key'],e['at']/1000,end/1000))
assert ''.join(x[0] for x in presses)=='bowl'
focus=bpy.data.objects.get('Enter focus plane');cam.data.dof.use_dof=True;cam.data.dof.focus_object=focus;cam.data.dof.aperture_fstop=16;cam.data.clip_end=10
last_screen=None
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def part(t,l,r):return smooth((t-l)/(r-l))
def pose(p):
 global last_screen
 t=3+1.8*max(0,min(1,(p-.12)/.72))
 # The scene begins already assembled. Keys move only along their travel axis.
 for key,o in keys.items():o.location.z=rests[key]
 for key,bs in leds:
  _,start,end=next(x for x in presses if x[0]==key);down=part(t,start-.065,start)*(1-part(t,end,end+.135));keys[key].location.z=rests[key]-4*down;bs.inputs['Emission Strength'].default_value=.05+2.5*down
 signal=part(p,.74,.89);ix=round(signal*(len(path)-10))
 for pt,co in zip(pulse.data.splines[0].points,path[ix:ix+9]):pt.co=(*co,1)
 pulse.hide_render=p<.74 or p>.89
 reveal=part(p,.36,.78)
 cam.location=Vector((80,-150,165)).lerp(Vector((105,-615,315)),reveal)
 target=Vector((0,-12,14)).lerp(Vector((0,55,123)),reveal);aim(cam,target);focus.location=target;cam.data.lens=58-8*reveal
 em.inputs['Strength'].default_value=.35+2*part(p,.30,.72)
 index=min(108,round((t-3)*60));screen_file=str(Path(a.screen_dir)/f'game-{index+1:03d}.png')
 if last_screen!=screen_file:tex.image.filepath=screen_file;tex.image.reload();last_screen=screen_file
 s['scroll_progress']=p
 for key in 'bowl':assert keys[key].location.z>=6.1-1e-6
pose(0);bpy.ops.wm.save_as_mainfile(filepath=str(out/'keystroke-to-play.blend'),compress=True)
if not a.save_only:
 for i in ([round(a.still*(a.frames-1))] if a.still is not None else range(a.frames)):
  pose(i/(a.frames-1));s.render.filepath=str(out/(f'preview-{i:03d}.png' if a.still is not None else f'frame-{i:03d}.png'));bpy.ops.render.render(write_still=True);print('KEYSTROKE_FRAME',i,flush=True)

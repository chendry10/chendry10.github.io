"""Render Pakaku's B-flat trumpet as a silver studio study for LyreLink.
Model: https://sketchfab.com/3d-models/8fee576c4e854be7aa1b94032f2e0341
CC BY 4.0. Publicly distributed by AllenAI Objaverse; raw model stays local.
Changes: silver materials, studio lighting, camera choreography. Geometry retained.
HDRI: Studio Small 09, Sergej Majboroda / Poly Haven, CC0.
"""
import argparse,sys,math,hashlib
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--model',required=True);p.add_argument('--hdri',required=True);p.add_argument('--output',required=True);p.add_argument('--width',type=int,default=1920);p.add_argument('--samples',type=int,default=128);p.add_argument('--frames',type=int,default=121);p.add_argument('--still',type=float)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(Path(a.model).read_bytes()).hexdigest()=='5f9611025dae1a3e8807dd2c03795a217de80bea2bba529ef2b83013ef913049','Unexpected source model'
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
bpy.ops.import_scene.gltf(filepath=a.model)
obs=[o for o in s.objects if o.type=='MESH'];pts=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);ctr=(lo+hi)/2;factor=.52/max(hi-lo)
# Bake import transforms once; the author's relative geometry is preserved.
for o in obs:
 mat=o.matrix_world.copy();o.parent=None;o.data.transform(mat);o.matrix_world.identity()
 for v in o.data.vertices:v.co=(v.co-ctr)*factor+Vector((0,0,.125))
 for face in o.data.polygons:face.use_smooth=True

root=bpy.data.objects.new('Silver trumpet assembly',None);s.collection.objects.link(root)
for o in obs:o.parent=root
s.render.engine='CYCLES';s.cycles.samples=a.samples;s.cycles.use_denoising=True;s.cycles.denoiser='OPENIMAGEDENOISE';s.cycles.device='GPU';s.cycles.use_adaptive_sampling=True;s.cycles.adaptive_threshold=.006;s.cycles.max_bounces=10;s.cycles.seed=913;s.cycles.use_animated_seed=False;s.render.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
s.render.resolution_x=a.width;s.render.resolution_y=round(a.width*9/16);s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=15;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=-.55;s.render.fps=30;s.frame_end=a.frames

def material(name,color,rough,metal):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough;return m
silver=material('Polished silver plating',(.955,.94,.90),.14,1)
# Microscopic polish variation, not visible dents or large-scale grunge.
n=silver.node_tree.nodes;links=silver.node_tree.links;bs=n.get('Principled BSDF')
tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=1800;tex.inputs['Detail'].default_value=2
ramp=n.new('ShaderNodeMapRange');ramp.inputs['From Min'].default_value=0;ramp.inputs['From Max'].default_value=1;ramp.inputs['To Min'].default_value=.185;ramp.inputs['To Max'].default_value=.225
links.new(tex.outputs['Fac'],ramp.inputs['Value']);links.new(ramp.outputs['Result'],bs.inputs['Roughness'])
bs.inputs['Anisotropic'].default_value=.04

for o in obs:o.data.materials.clear();o.data.materials.append(silver)
floor=material('Midnight studio',(.0015,.003,.009),.8,0);floor.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.05
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.data.materials.append(floor)
w=bpy.data.worlds.new('Studio');w.use_nodes=True;s.world=w;env=w.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(a.hdri);w.node_tree.links.new(env.outputs['Color'],w.node_tree.nodes['Background'].inputs['Color']);w.node_tree.nodes['Background'].inputs['Strength'].default_value=.035

def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,pos,power,size,sy,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=size;d.size_y=sy;d.color=color;o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=pos;aim(o,(0,0,.12));return o
# Neutral photographic stripboxes preserve silver's white/black reflections.
area('Overhead silk',(-.15,-.25,.65),7,.8,.3,(1,.98,.95))
area('Rear strip',(-.2,.25,.4),7,.65,.08,(1,1,1))
area('Bell edge strip',(.55,.5,.45),15,.13,.85,(1,1,1))
area('Front fill',(.05,-.5,.25),2,.6,.4,(1,1,1))
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.lens=65
focus=bpy.data.objects.new('Focus',None);s.collection.objects.link(focus);cam.data.dof.use_dof=True;cam.data.dof.focus_object=focus;cam.data.dof.aperture_fstop=11;cam.data.dof.aperture_blades=9

def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def part(p,a,b):return smooth((p-a)/(b-a))
def pose(p):
 wide=part(p,.08,.73);orbit=part(p,.25,1)
 cam.location=Vector((-.12+.74*wide,-.31-.60*wide,.27+.18*wide))
 target=Vector((-.07+.08*wide,0,.15-.025*wide));aim(cam,target);focus.location=target
 root.rotation_euler.z=math.radians(-7+10*orbit);cam.data.lens=65-7*wide
for f in range(a.frames):
 pose(f/(a.frames-1))
 for o in [cam,focus,root]:o.keyframe_insert('location',frame=f+1);o.keyframe_insert('rotation_euler',frame=f+1)
 cam.data.keyframe_insert('lens',frame=f+1)
for o in [cam,focus,root]:
 if o.animation_data:
  for fc in o.animation_data.action.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'silver-trumpet.blend'),compress=True)
if a.still is not None:
 s.frame_set(round(a.still*(a.frames-1))+1);s.render.filepath=str(out/'preview.png');bpy.ops.render.render(write_still=True)
else:
 for f in range(a.frames):
  dest=out/f'frame-{f:03d}.png'
  if dest.exists():continue
  s.frame_set(f+1);s.render.filepath=str(dest);bpy.ops.render.render(write_still=True);print('TRUMPET_FRAME',f,flush=True)

"""Author a full keyboard with real Cherry-profile CAD and captured key timing."""
import sys, runpy, json, math, argparse
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
parser=argparse.ArgumentParser()
parser.add_argument('--cad',required=True)
parser.add_argument('--hdri',required=True)
parser.add_argument('--font',required=True)
parser.add_argument('--output',required=True)
settings=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(settings.output);OUT.mkdir(parents=True,exist_ok=True)
sys.argv=['render-key.py','--','--cad',settings.cad,'--hdri',settings.hdri,'--font',settings.font,'--output-dir',str(OUT),'--width','2400','--height','1000','--samples','128','--progress','.42','--save-only','--no-dof','--hero-finish','charcoal']
ns=runpy.run_path(str(ROOT/'scripts/render-key.py'))
scene=bpy.context.scene;camera=scene.camera;studio=ns['studio']
for pivot in scene.objects:
    if 'Key / ' not in pivot.name:continue
    cap=next((o for o in pivot.children if o.name.startswith('CAD ')),None)
    glyph=next((o for o in pivot.children if o.name.startswith('Legend / ')),None)
    if cap is None or glyph is None:continue
    verts=[v.co.copy() for v in cap.data.vertices]
    tree=BVHTree.FromPolygons(verts,[list(p.vertices) for p in cap.data.polygons])
    left=min(v.co.x for v in glyph.data.vertices);bottom=min(v.co.y for v in glyph.data.vertices)
    factor=1.25 if len(pivot.name.split(' / ')[-1])==1 else 1.1
    for vertex in glyph.data.vertices:
        x=left+.7+(vertex.co.x-left)*factor;y=bottom+(vertex.co.y-bottom)*factor
        hit,_,_,_=tree.ray_cast(Vector((x,y,40)),Vector((0,0,-1)))
        if hit is not None:vertex.co=(x,y,hit.z+.009)
for mat in (ns['caps'],ns['mod_caps'],ns['enter_mat']):
    for node in mat.node_tree.nodes:
        if node.type=='MAP_RANGE':
            node.inputs['To Min'].default_value=.48;node.inputs['To Max'].default_value=.58
        if node.type=='BUMP':node.inputs['Distance'].default_value=.000038
camera.location=(35,-345,450)
target=Vector((0,0,6));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=60
for obj in list(scene.objects):
    if obj.type=='LIGHT':bpy.data.objects.remove(obj,do_unlink=True)
for name,loc,power,w,h,col in [
 ('Large overhead silk',(-20,-40,240),1.15,230,130,'#edf2ff'),
 ('Cobalt edge',(90,90,80),.13,180,16,'#6a9eea'),
 ('Warm reflected strip',(-150,20,65),.045,16,160,'#ffdbab'),
 ('Front silver reflection',(0,-190,60),.16,270,30,'#e8efff')]:
    light=ns['area'](name,loc,power,w,h,col,target=(0,0,0));light.parent=studio
floor=bpy.data.objects.get('Studio tabletop');floor.location=(0,0,-8)
scene.render.fps=60;scene.render.image_settings.color_mode='RGB'
scene.cycles.samples=128
scene.cycles.denoiser='OPTIX'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'typing-keyboard.blend'),compress=True)
scene.render.filepath=str(OUT/'preview.png');bpy.ops.render.render(write_still=True)

"""Export each rendered camera pose without rendering or changing source media."""
import argparse,sys,json
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
p=argparse.ArgumentParser();p.add_argument('--blend',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=a.blend)
s=bpy.context.scene;cam=s.camera;display=bpy.data.objects['Actual game screen'];frames=[]
for i in range(181):
 t=max(0,min(1,(i/180-.36)/.42));t=t*t*(3-2*t)
 cam.location=Vector((80,-150,165)).lerp(Vector((105,-615,315)),t)
 target=Vector((0,-12,14)).lerp(Vector((0,55,123)),t)
 cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=58-8*t
 bpy.context.view_layer.update();quad=[]
 for v in [3,2,1,0]:
  q=world_to_camera_view(s,cam,display.matrix_world@display.data.vertices[v].co)
  assert q.z>0
  quad.append([q.x,1-q.y])
 frames.append(quad)
Path(a.output).write_text('export const MONITOR_QUADS='+json.dumps(frames,separators=(',',':'))+';\n',newline='\n')
print('Exported',len(frames),'monitor projections')

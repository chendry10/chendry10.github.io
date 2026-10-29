"""Check physical stroke endpoints and export the rendered display's corners."""
import runpy,sys,json
from pathlib import Path
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:]
sys.argv=['render-keystroke-story.py','--',*argv,'--save-only']
ns=runpy.run_path(str(Path(__file__).with_name('render-keystroke-story.py')))
s=ns['s'];cam=ns['cam'];pose=ns['pose'];keys=ns['keys'];rests=ns['rests']
contacts=[]
for key,start,end in ns['presses']:
 progress=.12+(start-3)/1.8*.72;pose(progress)
 assert abs(keys[key].location.z-(rests[key]-4))<1e-5
 contacts.append({'key':key,'scrollProgress':progress,'sourceSeconds':start,'travelMm':4})
pose(1);bpy.context.view_layer.update()
display=ns['display'];quad=[]
for i in [3,2,1,0]:
 point=world_to_camera_view(s,cam,display.matrix_world@display.data.vertices[i].co)
 assert 0<point.x<1 and 0<point.y<1 and point.z>0
 quad.append([point.x,1-point.y])
points=[]
for o in s.objects:
 if o.name.startswith('CAD ') or o.name=='Anodized case shell':
  points.extend(world_to_camera_view(s,cam,o.matrix_world@Vector(v)) for v in o.bound_box)
margin=min(min(p.x,1-p.x,p.y,1-p.y) for p in points)
assert margin>.02,'Full keyboard should clear the final image edges'
result={'sourceAspect':[2560,1326],'sequenceAspect':[1600,1400],'screenQuad':quad,'contacts':contacts,'keyboardFrameMargin':margin}
(ns['out']/'projection.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result),flush=True)

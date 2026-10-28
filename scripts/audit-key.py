"""Surface-intersection audit of the evaluated moving meshes, in millimetres."""
import runpy,json,sys,hashlib,math
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
if '--' not in sys.argv:sys.argv.append('--')
if '--save-only' not in sys.argv:sys.argv.append('--save-only')
source=Path(__file__).resolve().with_name('render-key.py')
ns=runpy.run_path(str(source),run_name='__main__')
def descendants(obj):return list(obj.children_recursive)
groups={
 'cap':[ns['hero_mesh']],
 'housing':descendants(ns['housing']),
 'stem':descendants(ns['stem']),
 'base':descendants(ns['switch_base']),
 'spring':descendants(ns['spring']),
 'stabilizer-sliders':[o for s in ns['stabilizer_sliders'] for o in descendants(s)],
 'stabilizer-housings':[o for o in bpy.context.scene.objects if o.name.startswith('Hollow stabilizer housing')],
 'plate':[ns['plate']],
 'wire':[o for o in bpy.context.scene.objects if o.name=='Stabilizer wire'],
 'pcb':[o for o in bpy.context.scene.objects if o.name=='Keyboard PCB'],
 'neighbours':[o for o in bpy.context.scene.objects if o.name.startswith('CAD ') and o!=ns['hero_mesh'] and o.parent.location.x>80 and abs(o.parent.location.y)<40]
}
pairs=[('cap',g) for g in groups if g!='cap']+[
 ('housing','stem'),('housing','base'),('housing','spring'),('housing','stabilizer-sliders'),
 ('stem','base'),('stem','spring'),('spring','base'),('stabilizer-sliders','stabilizer-housings'),('stabilizer-sliders','plate')]+[(part,obstacle) for part in ('base','housing','stem','spring','wire') for obstacle in ('plate','neighbours','stabilizer-housings','pcb')]+[('wire',part) for part in ('base','spring','stem','housing','stabilizer-sliders')]
def get_tree(objects):
 verts=[];polys=[];names=[]
 deps=bpy.context.evaluated_depsgraph_get()
 for o in objects:
  if o.type not in ('MESH','CURVE'):continue
  ev=o.evaluated_get(deps);m=ev.to_mesh();offset=len(verts)
  verts.extend(ev.matrix_world@v.co*1000 for v in m.vertices)
  polys.extend([offset+i for i in p.vertices] for p in m.polygons)
  names.extend(o.name for p in m.polygons);ev.to_mesh_clear()
 return BVHTree.FromPolygons(verts,polys,all_triangles=False,epsilon=0),names
failures=[];framing_failures=[];minimum_margin=1.0
for index in range(1001):
 ns['pose'](index/1000);bpy.context.view_layer.update()
 cap=ns['hero_mesh'];camera=ns['camera']
 projected=[world_to_camera_view(bpy.context.scene,camera,cap.matrix_world@Vector(corner)) for corner in cap.bound_box]
 margin=min(min(v.x,1-v.x,v.y,1-v.y) for v in projected)
 minimum_margin=min(minimum_margin,margin)
 if margin<.045:framing_failures.append({'position':index/1000,'margin':margin})
 trees={name:get_tree(objects) for name,objects in groups.items()}
 for a,b in pairs:
  intersections=trees[a][0].overlap(trees[b][0])
  if intersections:
   unique=sorted(set((trees[a][1][x],trees[b][1][y]) for x,y in intersections))
   failures.append({'frame':index,'pair':[a,b],'triangles':len(intersections),'objects':unique})
 if index%100==0:print('AUDIT_FRAME',index,flush=True)
# A separate analytic lower bound catches self-intersection between spring
# turns, which an inter-object BVH check cannot detect. The helix uses a
# monotone axial rise with at least this pitch even at maximum compression.
pitch=min(.12/(.09*6),(ns['spring_height']-4-.24)/(.82*6));radius=1.8;wire_diameter=.2
lo=1.9*math.pi;hi=2*math.pi
for _ in range(80):
 angle=(lo+hi)/2
 derivative=radius**2*math.sin(angle)+(pitch/(2*math.pi))**2*angle
 if derivative<0:lo=angle
 else:hi=angle
distance=math.sqrt(2*radius**2*(1-math.cos(angle))+(pitch*angle/(2*math.pi))**2)
clearance=distance-wire_diameter
if clearance<=0:raise RuntimeError('Spring turns intersect at full compression')
receipt={'sourceSHA256':hashlib.sha256(source.read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest(),'positions':1001,'pairs':pairs,'failures':failures,'framingFailures':framing_failures,'minimumCapFrameMargin':minimum_margin,'springMinimumTurnClearanceMm':clearance,'method':'Evaluated bevelled/curved focal mechanism mesh surface intersections in mm, plus analytic adjacent-coil clearance and projected cap framing; no bounding-box-only collision verdict. This is a geometry check, not a physical simulation or manufacturing certification.'}
Path(ns['out']/'mesh-audit.json').write_text(json.dumps(receipt,indent=2))
summary={}
for f in failures:
 key=str(f['objects'])
 if key not in summary:summary[key]=[]
 summary[key].append(f['frame'])
print('MESH_INTERSECTIONS',json.dumps(summary),flush=True)
if failures:raise RuntimeError('Moving parts intersect; inspect mesh-audit.json before rendering.')
if framing_failures:raise RuntimeError('The hero cap leaves its safe camera framing; inspect mesh-audit.json.')

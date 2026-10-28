"""Three original Blender Cycles product studies for Cameron's portfolio.
All geometry authored here. Studio Small 09 HDRI: Sergej Majboroda / Poly Haven, CC0.
Optional Arial glyphs are rendered as geometry; no font files are distributed.
"""
import bpy,math,argparse,sys,json
from pathlib import Path
from mathutils import Vector
ap=argparse.ArgumentParser();ap.add_argument('--concept',choices=['prism','type','silicon'],default='silicon');ap.add_argument('--out',required=True);ap.add_argument('--hdri',required=True);ap.add_argument('--font');ap.add_argument('--width',type=int,default=1280);ap.add_argument('--samples',type=int,default=128);ap.add_argument('--frames',type=int,default=121);ap.add_argument('--still',action='store_true');ap.add_argument('--progress',type=float,default=.5)
a=ap.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='GPU';s.cycles.samples=a.samples;s.cycles.use_denoising=True;s.cycles.use_adaptive_sampling=True;s.cycles.adaptive_threshold=.015;s.cycles.seed=731;s.cycles.use_animated_seed=False;s.cycles.max_bounces=10;s.cycles.transmission_bounces=8;s.render.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
s.render.resolution_x=a.width;s.render.resolution_y=round(a.width*7/8);s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=15;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.render.film_transparent=False
s.render.fps=30;s.frame_start=1;s.frame_end=a.frames
def rgb(h):
    c=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4 for x in c)
def mat(name,col,rough=.3,metal=0,glass=0,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(col),1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Transmission Weight'].default_value=glass;p.inputs['IOR'].default_value=1.46
    if emission:p.inputs['Emission Color'].default_value=(*rgb(col),1);p.inputs['Emission Strength'].default_value=emission
    if metal:
        tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=250;tex.inputs['Detail'].default_value=2;b=n.new('ShaderNodeBump');b.inputs['Distance'].default_value=.0009;b.inputs['Strength'].default_value=.12;m.node_tree.links.new(tex.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    return m
black=mat('Bead-blasted graphite aluminium','#202b36',.31,.85);silver=mat('Machined satin titanium','#b7c4cf',.25,1);gold=mat('Warm plated brass','#d59d51',.22,1);ceramic=mat('Matte technical ceramic','#151b22',.4);white=mat('Inlaid ivory type','#f2e7cf',.28);glass=mat('Optical borosilicate','#e7f5ff',.065,glass=1);blue=mat('Cyan optical core','#7edbff',.2,emission=3);amber=mat('Warm optical core','#ffc677',.22,emission=3);teal=mat('Teal optical core','#8cf1c7',.22,emission=3);pcb=mat('Graphite solder mask','#13252c',.36,.2)
animated=[]
def group(name,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.location=loc;return o
def assign(o,m):o.data.materials.append(m);return o
def bevel(o,r):
    if r:
        b=o.modifiers.new('Manufactured edge radius','BEVEL');b.width=r;b.segments=8;b.harden_normals=True;n=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');n.keep_sharp=True
def box(name,loc,size,m,r=.025,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);assign(o,m);bevel(o,r);o.parent=parent;return o
def cyl(name,loc,r,depth,m,rot=(0,0,0),parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name;assign(o,m);bevel(o,.012);o.parent=parent
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return o
def ball(name,loc,r,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=r,location=loc);o=bpy.context.object;o.name=name;assign(o,m)
    for p in o.data.polygons:p.use_smooth=True
    return o
def tube(name,points,r,m,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=4;p=c.splines.new('POLY');p.points.add(len(points)-1)
    for v,co in zip(p.points,points):v.co=(*co,1)
    o=bpy.data.objects.new(name,c);s.collection.objects.link(o);assign(o,m);o.parent=parent;return o
fontpath=Path(a.font) if a.font else None;font=bpy.data.fonts.load(str(fontpath)) if fontpath and fontpath.exists() else None
def text(name,body,loc,size,m,rot=(0,0,0),parent=None):
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.0005;c.bevel_depth=.0002
    if font:c.font=font
    o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;o.parent=parent;assign(o,m);return o
def screw(x,y,z,parent=None):
    cyl('Recessed steel fastener',(x,y,z),.065,.018,silver,parent=parent);box('Fastener slot',(x,y,z+.011),(.07,.012,.003),ceramic,.002,parent)
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def part(p,l,r):return smooth((p-l)/(r-l))
def look(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(6,-8,6));camera=bpy.context.object;camera.name='Product portrait camera';camera.data.lens=58;s.camera=camera;animated.append(camera)
focus=group('Focus',(0,0,.9));camera.data.dof.use_dof=True;camera.data.dof.focus_object=focus;camera.data.dof.aperture_fstop=11;camera.data.dof.aperture_blades=9
world=bpy.data.worlds.new('Studio environment');s.world=world;world.use_nodes=True;env=world.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(a.hdri);world.node_tree.links.new(env.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color']);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.14
def area(name,loc,energy,size,colour,target=(0,0,1),height=None):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='RECTANGLE';d.size=size;d.size_y=height or size;d.color=rgb(colour);o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;look(o,target)
area('Large neutral silk',(-3,-4,7),1300,5,'#e8eeff',height=3);area('Blue grazing strip',(4,2,4),1000,1,'#78bbff',height=5);area('Amber edge',(-4,2,2.8),850,2,'#ffb864',height=4);area('White contour',(0,4,6),1500,4,'#ffffff',height=.6)
floor=mat('Deep blue studio floor','#080e1b',.3,.25);box('Studio',(0,0,-.38),(200,200,.3),floor,0)

if a.concept=='silicon':
    box('CNC pedestal',(0,0,-.14),(5.5,4.5,.3),black,.13);box('Circuit board',(0,0,.045),(5.2,4.2,.07),pcb,.06)
    for x in [-2.4,2.4]:
        for y in [-1.9,1.9]:screw(x,y,.10)
    for side in [-1,1]:
        for i in range(15):
            y=-1.65+i*.235;x=side*1.5
            tube('Etched copper route',[(x,y,.087),(side*(1.65+abs(y)*.08),y,.087),(side*2.25,y*.8,.087)],.009,gold)
            cyl('Plated test pad',(x,y,.087),.03,.009,gold)
            box('Surface mount capacitor',(side*2.1,y*.8,.13),(.13,.09,.07),ceramic,.008)
    layers=[]
    for name,z,size,m in [('Package substrate',.22,(2.9,2.9,.14),black),('Logic die',.43,(2.25,2.25,.10),mat('Iridescent silicon die','#263c6b',.16,.85)),('Copper heat spreader',.64,(2.55,2.55,.11),gold),('Titanium lid',.84,(2.85,2.85,.16),silver)]:
        g=group(name,(0,0,z));box(name+' body',(0,0,0),size,m,.045,g);layers.append((g,z));animated.append(g)
    die=layers[1][0]
    for row in range(7):
        for col in range(7):
            x=-.92+col*.305;y=-.92+row*.305
            box('Silicon logic cell',(x,y,.054),(.26,.26,.006),silver if(row+col)%4==0 else gold,.003,die)
            for line in range(4):box('Die micro-routing',(x,y-.08+line*.05,.058),(.23,.008,.002),ceramic,.001,die)
    for i in range(17):
        v=-1.3+i*.1625
        for side in [-1,1]:
            box('Package bond contact',(side*1.43,v,-.02),(.13,.075,.06),gold,.007,layers[0][0]);box('Package bond contact',(v,side*1.43,-.02),(.075,.13,.06),gold,.007,layers[0][0])
    text('Maker mark','CH',(0,-.2,.085),.65,ceramic,parent=layers[3][0]);text('Lid engraving','SOFTWARE / SYSTEMS',(0,-.8,.085),.12,ceramic,parent=layers[3][0])
    for x in [-1.1,1.1]:
        for y in [-1.1,1.1]:screw(x,y,.085,layers[3][0])
    def pose(p):
        for i,(g,z) in enumerate(layers):g.location.z=z+(i+1)*.85*part(p,.10+i*.025,.70+i*.025)
        angle=.85+.28*part(p,0,1);camera.location=(9.8*math.sin(angle),-9.8*math.cos(angle),6.1);look(camera,(0,0,1.05+1.0*part(p,.1,.8)));focus.location.z=1.8
elif a.concept=='type':
    box('Machined display plinth',(0,0,.04),(6.0,2.0,.35),black,.16)
    for x in [-2.7,2.7]:
        for y in [-.72,.72]:screw(x,y,.23)
    for x in [-2.68,2.68]:box('Side bearing support',(x,.12,.92),(.19,.85,1.4),silver,.06)
    cyl('Continuous axle',(0,0,1.03),.075,5.55,gold,(0,math.pi/2,0))
    drums=[]
    for i in range(5):
        x=(i-2)*1.0;g=group('Letter drum '+str(i+1),(x,0,1.03));drums.append(g);animated.append(g)
        cyl('Drum core',(0,0,0),.55,.78,ceramic,(0,math.pi/2,0),g)
        for side in [-1,1]:
            cyl('Machined end ring',(side*.405,0,0),.58,.055,silver,(0,math.pi/2,0),g)
            for j in range(20):
                angle=j*math.tau/20;tooth=box('Index gear tooth',(side*.43,.59*math.cos(angle),.59*math.sin(angle)),(.06,.11,.07),gold,.008,g);tooth.rotation_euler.x=angle
        for face,word in enumerate(['LEARN','BUILD','SHARE','CRAFT']):
            angle=face*math.pi/2;panel=group('Face '+str(face));panel.parent=g;panel.rotation_euler.x=angle
            box('Ceramic letter plaque',(0,-.554,0),(.72,.025,.77),ceramic,.03,panel)
            text('Precision ivory legend',word[i],(0,-.571,0),.64,white,(math.pi/2,0,0),panel)
    text('Base engraving','FROM INPUT TO IMPACT',(0,-.80,.222),.13,silver)
    def pose(p):
        for i,g in enumerate(drums):g.rotation_euler.x=-math.pi/2*part(p,.06+i*.065,.55+i*.065)
        camera.location=(3.3-.9*part(p,0,1),-9.2,4.9);look(camera,(0,0,.8));focus.location.z=1.02
else:
    box('Optical bench',(0,0,-.03),(6.0,4.7,.32),black,.13)
    for x in [-2.7,2.7]:
        for y in [-2.02,2.02]:screw(x,y,.145)
    for x in [-.75,.65]:
        box('Prism support rail',(x,0,.22),(.18,2.25,.22),silver,.045)
        for y in ([-.70,.70] if x<0 else [-.05,.05]):cyl('Isolator',(x,y,.345),.05,.07,gold)
    vertices=[(x,y,z) for z in [.38,1.94] for x,y in [(-.9,-.95),(-.9,.95),(.9,0)]]
    mesh=bpy.data.meshes.new('Precision triangular optical glass');mesh.from_pydata(vertices,[],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]);mesh.update();prism=bpy.data.objects.new('Optical prism',mesh);s.collection.objects.link(prism);assign(prism,glass);bevel(prism,.035)
    # Light guides sit on the optical plane; moving markers are light, not solid parts.
    cyl('Input collimator',(-2.25,0,.72),.29,.95,silver,(0,math.pi/2,0))
    for x in [-2.68,-2.5,-2.15,-1.9]:cyl('Collimator grip ring',(x,0,.72),.305,.045,gold,(0,math.pi/2,0))
    cyl('Input lens',(-1.77,0,.72),.23,.06,glass,(0,math.pi/2,0));tube('Input light',[(-1.72,0,.72),(-.91,0,.72)],.018,amber)
    paths=[];pulses=[]
    for i,(y,m) in enumerate([(-1.65,blue),(0,amber),(1.65,teal)]):
        points=[]
        start_y=0 if y==0 else math.copysign(.17,y)
        start_x=.94 if y==0 else .64
        for j in range(65):
            t=j/64;points.append((start_x+(2.42-start_x)*t,start_y+(y-start_y)*smooth(t),.72+.18*math.sin(math.pi*t)))
        paths.append(points);tube('Glass light guide '+str(i+1),points,.062,glass);tube('Visible optical channel '+str(i+1),points,.013,m)
        cyl('Receiver housing',(2.52,y,.72),.23,.40,silver,(0,math.pi/2,0));cyl('Receiver brass trim',(2.30,y,.72),.245,.05,gold,(0,math.pi/2,0))
        box('Receiver pedestal',(2.50,y,.31),(.55,.55,.33),black,.05)
        text('Output label',str(i+1).zfill(2),(2.48,y-.35,.15),.12,silver)
        pulse=ball('Travelling photon '+str(i+1),points[0],.055,m);animated.append(pulse);pulses.append(pulse)
    scanner=group('Optical iris',(-2.75,0,.72));animated.append(scanner)
    for i in range(8):
        angle=i*math.tau/8;v=box('Iris tick',(0,.31*math.cos(angle),.31*math.sin(angle)),(.05,.08,.025),ceramic,.005,scanner);v.rotation_euler.x=angle
    def pose(p):
        for points,pulse in zip(paths,pulses):
            t=part(p,.08,.90);f=t*(len(points)-1);i=min(len(points)-2,int(f));pulse.location=Vector(points[i]).lerp(Vector(points[i+1]),f-i)
        scanner.rotation_euler.x=.3*part(p,0,1)
        camera.location=(6.4-1.0*part(p,0,1),-7.5,6.7);look(camera,(0,0,.6));focus.location=(0,0,.8)

for f in range(1,a.frames+1):
    pose((f-1)/(a.frames-1));
    for o in animated:o.keyframe_insert('location',frame=f);o.keyframe_insert('rotation_euler',frame=f)
for o in animated:
    if o.animation_data and o.animation_data.action:
        for fc in o.animation_data.action.fcurves:
            for key in fc.keyframe_points:key.interpolation='LINEAR'
pose(a.progress);bpy.ops.wm.save_as_mainfile(filepath=str(out/(a.concept+'.blend')),compress=True)
if a.still:
    s.frame_set(round(a.progress*(a.frames-1))+1);s.render.filepath=str(out/'hero.png');bpy.ops.render.render(write_still=True)
else:
    for f in range(1,a.frames+1):
        dest=out/f'frame-{f-1:03d}.png'
        if dest.exists():continue
        s.frame_set(f);s.render.filepath=str(dest);bpy.ops.render.render(write_still=True);print('STUDY_FRAME',a.concept,f,flush=True)
(out/'source-notice.json').write_text(json.dumps({'concept':a.concept,'geometry':'Original authored procedural Blender geometry','renderer':'Blender Cycles / OptiX','samples':a.samples,'dimensions':[a.width,round(a.width*7/8)],'HDRI':{'name':'Studio Small 09','author':'Sergej Majboroda','url':'https://polyhaven.com/a/studio_small_09','license':'CC0'},'note':'Illustrative hardware, not a capture of actual software or a manufactured device'},indent=2))

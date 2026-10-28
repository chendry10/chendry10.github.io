"""Photographic ANSI keyboard study built from actual Cherry-profile CAD caps.

CAD: Santiago Castelo 2020, MIT, endeavoursc/cherry-mx-keycaps,
commit 3b94e3c7f8ed465917c1975ae0802d8965d5066b. The upstream MIT notice
accompanies the derived renders in shared/assets/product. This script creates
a brandless assembly; it does not claim to reproduce a commercial keyboard.
"""
import argparse
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def options():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir',default='key-renders')
    parser.add_argument('--width',type=int,default=1280)
    parser.add_argument('--height',type=int,default=1120)
    parser.add_argument('--samples',type=int,default=64)
    parser.add_argument('--progress',type=float,default=.42)
    parser.add_argument('--frames',type=int,default=0)
    parser.add_argument('--start',type=int,default=0)
    parser.add_argument('--end',type=int,default=-1)
    parser.add_argument('--look',choices=['neutral','cinematic'],default='cinematic')
    parser.add_argument('--hero-finish',choices=['ivory','charcoal','clear','titanium'],default='titanium')
    parser.add_argument('--opaque-floor',action=argparse.BooleanOptionalAction,default=True)
    parser.add_argument('--transparent',dest='opaque_floor',action='store_false',help='Render transparent film instead of the studio tabletop.')
    parser.add_argument('--dof',action=argparse.BooleanOptionalAction,default=True)
    parser.add_argument('--fstop',type=float,default=40)
    parser.add_argument('--save-only',action='store_true')
    parser.add_argument('--font',help='Optional local font file; otherwise use Blender Bfont.')
    parser.add_argument('--cad',required=True,help='Local upstream Cherry Keycaps Full.fbx file.')
    parser.add_argument('--hdri',required=True,help='Local Studio Small 09 environment EXR file.')
    parsed=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for name in ('cad','hdri','font'):
        value=getattr(parsed,name)
        if value and not Path(value).is_file():parser.error('--'+name+' must name an existing file')
    return parsed


args=options();out=Path(args.output_dir);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='GPU';scene.cycles.samples=args.samples
scene.cycles.use_denoising=True;scene.cycles.denoiser='OPENIMAGEDENOISE'
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.004 if args.samples>=512 else .012
scene.cycles.seed=417;scene.cycles.use_animated_seed=False
scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8
scene.render.use_persistent_data=True
scene.render.resolution_x=args.width;scene.render.resolution_y=args.height;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.image_settings.color_depth='8';scene.render.image_settings.compression=25
scene.render.film_transparent=not args.opaque_floor
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.1
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.unit_settings.length_unit='MILLIMETERS'
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'


def rgb(value):
    value=value.lstrip('#');parts=[int(value[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in parts)


def material(name,colour,rough=.4,metal=0,grain=0,scale=160,brushed=False,transmission=0,ior=1.5):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*rgb(colour),1)
    shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=metal
    shader.inputs['Transmission Weight'].default_value=transmission;shader.inputs['IOR'].default_value=ior
    if grain:
        coords=nodes.new('ShaderNodeTexCoord');noise=nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=2
        if brushed:
            stretch=nodes.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY';stretch.inputs[1].default_value=(1,50,1)
            links.new(coords.outputs['Generated'],stretch.inputs[0]);links.new(stretch.outputs['Vector'],noise.inputs['Vector'])
        else:links.new(coords.outputs['Generated'],noise.inputs['Vector'])
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.15
        bump.inputs['Distance'].default_value=grain*.001
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])
        variation=nodes.new('ShaderNodeMapRange');variation.inputs['To Min'].default_value=rough-.035
        variation.inputs['To Max'].default_value=rough+.035
        links.new(noise.outputs['Fac'],variation.inputs['Value']);links.new(variation.outputs['Result'],shader.inputs['Roughness'])
    return mat


caps=material('PBT charcoal — fine injection-mould texture','#292d32',.43,grain=.009,scale=180)
mod_caps=material('PBT deeper charcoal modifiers','#20242a',.44,grain=.009,scale=180)
enter_mat=material('PBT focal Enter — same neutral material','#2c3035',.41,grain=.009,scale=180)
ink=material('Ivory double-shot legends','#d5d4cd',.53)
case_mat=material('Dark anodized CNC aluminium','#202932',.31,.83,grain=.0008,scale=90,brushed=True)
edge_mat=material('Anodized edge radius','#303b45',.25,.88)
plate_mat=material('Satin switch plate','#242a31',.36,.75,grain=.0005,scale=170)
nylon=material('Black nylon switch housings','#161b21',.34,grain=.004,scale=130)
pc=material('Moulded polycarbonate — white transmission, volume tint','#ffffff',.16,transmission=1,ior=1.585)
pc_absorption=pc.node_tree.nodes.new('ShaderNodeVolumeAbsorption')
pc_absorption.inputs['Color'].default_value=(*rgb('#c7cdd1'),1)
pc_absorption.inputs['Density'].default_value=30
pc.node_tree.links.new(pc_absorption.outputs['Volume'],pc.node_tree.nodes.get('Material Output').inputs['Volume'])
pom=material('Amber POM switch stem','#d27625',.28,grain=.0015,scale=190)
steel=material('Stainless spring wire','#a4afb6',.22,1)
contact_mat=material('Contact copper alloy','#9d7b42',.29,1)
pcb_mat=material('Solder-mask PCB','#152126',.48,grain=.001,scale=90)
led_mat=material('Single amber status LED','#dba15a',.25,transmission=.1)
led_shader=led_mat.node_tree.nodes.get('Principled BSDF')
led_shader.inputs['Emission Color'].default_value=(*rgb('#edb76d'),1)
led_shader.inputs['Emission Strength'].default_value=.4

# Macro PBT responds at physical surface scales. Object coordinates are in mm;
# roughness variation and visible mould grain have separate frequencies.
def photographic_pbt(mat,base_low,base_high):
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
    output=nodes.new('ShaderNodeOutputMaterial');shader=nodes.new('ShaderNodeBsdfPrincipled')
    links.new(shader.outputs['BSDF'],output.inputs['Surface'])
    shader.inputs['IOR'].default_value=1.48
    shader.inputs['Specular IOR Level'].default_value=.45
    coords=nodes.new('ShaderNodeTexCoord')
    coarse=nodes.new('ShaderNodeTexNoise');coarse.inputs['Scale'].default_value=.55
    coarse.inputs['Detail'].default_value=3
    links.new(coords.outputs['Object'],coarse.inputs['Vector'])
    color=nodes.new('ShaderNodeValToRGB')
    color.color_ramp.elements[0].color=(*rgb(base_low),1)
    color.color_ramp.elements[1].color=(*rgb(base_high),1)
    links.new(coarse.outputs['Fac'],color.inputs['Fac'])
    links.new(color.outputs['Color'],shader.inputs['Base Color'])
    rough=nodes.new('ShaderNodeMapRange')
    rough.inputs['To Min'].default_value=.48;rough.inputs['To Max'].default_value=.65
    links.new(coarse.outputs['Fac'],rough.inputs['Value'])
    links.new(rough.outputs['Result'],shader.inputs['Roughness'])
    fine=nodes.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=14
    fine.inputs['Detail'].default_value=2.5;fine.inputs['Roughness'].default_value=.72
    links.new(coords.outputs['Object'],fine.inputs['Vector'])
    cellular=nodes.new('ShaderNodeTexVoronoi');cellular.inputs['Scale'].default_value=13
    links.new(coords.outputs['Object'],cellular.inputs['Vector'])
    mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';mix.inputs[0].default_value=.35
    links.new(fine.outputs['Fac'],mix.inputs[1]);links.new(cellular.outputs['Distance'],mix.inputs[2])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.5
    bump.inputs['Distance'].default_value=.000045
    links.new(mix.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])

for mat in (caps,mod_caps,enter_mat):photographic_pbt(mat,'#1b1e23','#1c1f24')
for mat in (caps,mod_caps,enter_mat):
    for node in mat.node_tree.nodes:
        if node.type=='MAP_RANGE':
            node.inputs['To Min'].default_value=.47;node.inputs['To Max'].default_value=.50
        if node.type=='BUMP':node.inputs['Distance'].default_value=.000026
if args.hero_finish=='ivory':
    for node in enter_mat.node_tree.nodes:
        if node.type=='VALTORGB':
            node.color_ramp.elements[0].color=(*rgb('#c9c7bf'),1)
            node.color_ramp.elements[1].color=(*rgb('#d0cec6'),1)
if args.hero_finish=='clear':
    enter_mat=material('Clear injection-moulded polycarbonate Enter','#ffffff',.075,transmission=1,ior=1.585)
    absorption=enter_mat.node_tree.nodes.new('ShaderNodeVolumeAbsorption')
    absorption.inputs['Color'].default_value=(*rgb('#c4cbd0'),1)
    absorption.inputs['Density'].default_value=12
    enter_mat.node_tree.links.new(absorption.outputs['Volume'],enter_mat.node_tree.nodes.get('Material Output').inputs['Volume'])
if args.hero_finish=='titanium':
    enter_mat=material('Satin titanium Enter','#b3b8bf',.28,1,grain=.0007,scale=320,brushed=True)
    enter_mat.node_tree.nodes.get('Principled BSDF').inputs['Anisotropic'].default_value=.35
    tangent=enter_mat.node_tree.nodes.new('ShaderNodeVectorTransform')
    tangent.vector_type='VECTOR';tangent.convert_from='OBJECT';tangent.convert_to='WORLD'
    tangent.inputs['Vector'].default_value=(1,0,0)
    enter_mat.node_tree.links.new(tangent.outputs['Vector'],enter_mat.node_tree.nodes.get('Principled BSDF').inputs['Tangent'])
dark_ink=material('Dark flush Enter legend','#1f2429',.62)
ink_shader=ink.node_tree.nodes.get('Principled BSDF')
ink_shader.inputs['Roughness'].default_value=.64
ink_shader.inputs['Specular IOR Level'].default_value=.25


def assign(obj,mat):obj.data.materials.clear();obj.data.materials.append(mat);return obj
def group(name,location=(0,0,0),parent=None):
    obj=bpy.data.objects.new(name,None);scene.collection.objects.link(obj);obj.location=location;obj.parent=parent;return obj
def bevel(obj,width=.15):
    m=obj.modifiers.new('Machined radius','BEVEL');m.width=width;m.segments=4;m.harden_normals=True
    n=obj.modifiers.new('Face-weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
def cube(name,location,size,mat,parent=None,radius=.15):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location);obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    assign(obj,mat);obj.parent=parent
    if radius:bevel(obj,radius)
    return obj
def mesh(name,vertices,faces,mat,parent=None,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);assign(obj,mat);obj.parent=parent
    for face in data.polygons:face.use_smooth=smooth
    return obj
def curve(name,points,radius,mat,parent=None):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=4
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);assign(obj,mat);obj.parent=parent;return obj
def ring_points(w,d,r,count=16):
    pts=[]
    for cx,cy,start in ((w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)):
        for i in range(count):
            a=math.radians(start+i/(count-1)*90);pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    return pts
def ring(name,profiles,mat,parent=None):
    vertices=[]
    for w,d,r,z in profiles:vertices.extend((x,y,z) for x,y in ring_points(w,d,r))
    n=len(vertices)//len(profiles);faces=[]
    for j in range(len(profiles)):
        nxt=(j+1)%len(profiles)
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,nxt*n+(i+1)%n,nxt*n+i))
    return mesh(name,vertices,faces,mat,parent,True)


# Bake FBX transforms into the actual CAD geometry, preserving imported custom
# normals. FBX world-Y is negative height and world-Z is keyboard front/back.
bpy.ops.import_scene.fbx(filepath=args.cad)
templates={};rotation=Matrix.Rotation(-math.pi/2,4,'X')
for imported in list(scene.objects):
    if imported.type!='MESH':continue
    data=imported.data.copy();data.transform(rotation@imported.matrix_world)
    low=[min(v.co[i] for v in data.vertices) for i in range(3)]
    high=[max(v.co[i] for v in data.vertices) for i in range(3)]
    data.transform(Matrix.Translation((-(low[0]+high[0])/2,-(low[1]+high[1])/2,-low[2])))
    data.transform(Matrix.Scale(1000,4));data.update()
    templates[imported.name]=data
for imported in list(scene.objects):bpy.data.objects.remove(imported,do_unlink=True)

font=bpy.data.fonts.load(args.font) if args.font else None
unit=19.05;enter_x=121.44375;enter_y=0
keyboard=group('Brandless ANSI keyboard assembly')


def legend(label,target,parent,size=3.0):
    if not label:return
    secondary={'`':'~','1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')','-':'_','=':'+','[':'{',']':'}','\\':'|',';':':',"'":'"',',':'<','.':'>','/':'?'}
    glyph=secondary[label]+'\n'+label if label in secondary else label
    if label in secondary:size=2.1
    data=bpy.data.curves.new('Legend / '+label,'FONT');data.body=glyph;data.size=size;data.resolution_u=12
    if font:data.font=font
    data.align_x='LEFT';data.align_y='BOTTOM';data.extrude=0;data.bevel_depth=0
    obj=bpy.data.objects.new('Legend / '+label,data);scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH');obj=bpy.context.object
    verts=[v.co.copy() for v in target.data.vertices]
    tree=BVHTree.FromPolygons(verts,[list(p.vertices) for p in target.data.polygons],all_triangles=False)
    lo=min(v.x for v in verts);hi=max(v.x for v in verts)
    # Keep legends on the top dish rather than intersecting the sloped rear rim.
    start_x=lo+3.7;start_y=-2.8 if label in secondary else -.1
    for vertex in obj.data.vertices:
        x=vertex.co.x+start_x;y=vertex.co.y+start_y
        hit,normal,_,_=tree.ray_cast(Vector((x,y,40)),Vector((0,0,-1)))
        vertex.co=(x,y,(hit.z if hit is not None else 7.0)+.009)
    obj.parent=parent;assign(obj,dark_ink if label=='Enter' and args.hero_finish in ('ivory','titanium') else ink);obj.data.update()


def add_key(profile,label,position,width=1,hero=False):
    data=templates[profile].copy()
    pivot=group(('Focal ' if hero else '')+'Key / '+label,position,keyboard)
    obj=bpy.data.objects.new('CAD '+profile+' / '+label,data);scene.collection.objects.link(obj);obj.parent=pivot
    assign(obj,enter_mat if hero else (caps if width==1 else mod_caps))
    legend(label,obj,pivot,3.0 if len(label)==1 else 2.65)
    if not hero:cube('Black switch collar / '+label,(position[0],position[1],8.1),(13.7,13.7,5.3),nylon,keyboard,.3)
    return pivot,obj


# Full ANSI rows make the crop truthful. Camera sees the right-hand U/I/O/P,
# J/K/L, punctuation and wide Enter context, with real 19.05mm row staggering.
rows=[
    ('R1',38.1,[("`",1),("1",1),("2",1),("3",1),("4",1),("5",1),("6",1),("7",1),("8",1),("9",1),("0",1),("-",1),("=",1),("Backspace",2)]),
    ('R2',19.05,[("Tab",1.5),("Q",1),("W",1),("E",1),("R",1),("T",1),("Y",1),("U",1),("I",1),("O",1),("P",1),("[",1),("]",1),("\\",1.5)]),
    ('R3',0,[("Caps",1.75),("A",1),("S",1),("D",1),("F",1),("G",1),("H",1),("J",1),("K",1),("L",1),(";",1),("'",1),("Enter",2.25)]),
    ('R4',-19.05,[("Shift",2.25),("Z",1),("X",1),("C",1),("V",1),("B",1),("N",1),("M",1),(",",1),(".",1),("/",1),("Shift",2.75)]),
    ('R5',-38.1,[("Ctrl",1.25),("Win",1.25),("Alt",1.25),("",6.25),("Alt",1.25),("Fn",1.25),("Menu",1.25),("Ctrl",1.25)])
]
hero_cap=None;hero_mesh=None
for row,y,keys in rows:
    cursor=-7.5*unit
    for label,width in keys:
        x=cursor+width*unit/2;cursor+=width*unit
        profile=('Convex_6.25u' if width==6.25 else '%s_%su'%(row,str(width).removesuffix('.0')))
        if profile not in templates:
            raise ValueError('Missing exact CAD profile '+profile)
        cap,obj=add_key(profile,label,(x,y,10.1),width,label=='Enter')
        if label=='Enter':hero_cap,hero_mesh=cap,obj


# Low anodized bezel; all fasteners are below the case rather than four enormous
# decorative top screws. A thin seam and real edge radius catch the studio cards.
case=ring('Anodized case shell',[(298,111,6,-6),(298,111,6,4.3),(297.5,110.5,5.8,4.9),(287.8,99.0,2.0,4.9),(287.8,99,2,-5.8)],case_mat,keyboard)
ring('Case lip highlight',[(297.6,110.6,5.8,4.8),(297.3,110.3,5.7,5.05),(287.9,99.1,2.05,5.05),(287.9,99.1,2.05,4.8)],edge_mat,keyboard)
cube('Closed lower case',(0,0,-5.6),(295,108,1.5),case_mat,keyboard,4)
cube('Keyboard PCB',(0,0,0),(286,97,1.6),pcb_mat,keyboard,.5)
plate=cube('Switch mounting plate',(0,0,5.1),(287.5,98.5,1.5),plate_mat,keyboard,0)
for dx,dy,sx,sy in [(0,0,14.1,14.1),(-11.9,0,6.6,13.0),(11.9,0,6.6,13.0)]:
    cutter=cube('Temporary plate aperture',(enter_x+dx,enter_y+dy,5.1),(sx,sy,5),nylon,None,0)
    boolean=plate.modifiers.new('Actual focal switch aperture','BOOLEAN');boolean.object=cutter;boolean.operation='DIFFERENCE'
    bpy.ops.object.select_all(action='DESELECT');plate.select_set(True);bpy.context.view_layer.objects.active=plate
    bpy.ops.object.modifier_apply(modifier=boolean.name);bpy.data.objects.remove(cutter,do_unlink=True)
bevel(plate,.12)

switch_base=group('Focal MX base',(enter_x,0,0),keyboard)
# A genuinely hollow tray: the stem and spring have room through the entire
# stroke. The previous solid block swallowed the slider during compression.
cube('Nylon lower floor',(0,0,1.15),(13.6,13.6,.55),nylon,switch_base,.18)
ring('Lower housing cavity',[(13.6,13.6,.5,1.35),(13.6,13.6,.5,4.65),(11.2,11.2,.4,4.65),(11.2,11.2,.4,1.35)],nylon,switch_base)
ring('Plate retention flange',[(14.7,14.7,.5,5.88),(14.7,14.7,.5,6.25),(11.2,11.2,.4,6.25),(11.2,11.2,.4,5.88)],nylon,switch_base)
for x in (-2.65,2.65):
    cube('Stem guide rail',(x,0,4.3),(.35,4.4,5.6),nylon,switch_base,.06)

housing=group('Focal PC upper housing',(enter_x,0,0),keyboard)
shell=ring('Moulded upper housing',[(13.8,13.8,.65,6.32),(13.8,13.8,.65,6.8),(10.0,10.0,.65,10.0),(7.2,7.2,.4,10.0),(11.0,11.0,.4,6.8),(11.0,11.0,.4,6.32)],pc,housing)
for x in (-6.9,6.9):
    for y in (-3.7,3.7):cube('Housing retention clip',(x,y,6.75),(.48,1.3,.75),pc,housing,.08)

stem=group('Focal POM stem',(enter_x,0,0),keyboard)
cube('Stem slider',(0,0,8.7),(4.8,4.8,2.6),pom,stem,.18)
# Cross fitted to this licensed cap's socket (not a solid square stabilizer).
cube('MX cross stem X',(0,0,11.9),(3.65,.76,3.8),pom,stem,.055)
cube('MX cross stem Y',(0,0,11.9),(.76,3.65,3.8),pom,stem,.055)
spring=group('Focal return spring',(enter_x,0,0),keyboard);spring_height=5.65;spring_base=1.6
points=[]
for i in range(521):
    t=i/520;a=t*6*math.tau
    z=.12*t/.09 if t<.09 else spring_height-.12+.12*(t-.91)/.09 if t>.91 else .12+(spring_height-.24)*(t-.09)/.82
    points.append((1.8*math.cos(a),1.8*math.sin(a),spring_base+z))
spring_wire=curve('Compact stainless coil',points,.10,steel,spring)
for x in (4.0,4.55):
    cube('Stamped contact leaf',(x,-1.5,4.3),(.16,1.2,5.0),contact_mat,switch_base,.045)
stabilizer_sliders=[]
for dx in (-11.9,11.9):
    base=group('Stabilizer socket',(enter_x+dx,0,0),keyboard)
    ring('Hollow stabilizer housing',[(5.9,10.7,.45,1.6),(5.9,10.7,.45,6.8),(4.5,4.5,.3,6.8),(4.5,4.5,.3,1.6)],nylon,base)
    slider=group('Stabilizer carriage',(enter_x+dx,0,0),keyboard)
    cube('Stabilizer slider body',(0,0,7.0),(3.9,3.9,3.8),nylon,slider,.13)
    cube('Stabilizer cross X',(0,0,11.3),(3.65,.76,5.0),nylon,slider,.055)
    cube('Stabilizer cross Y',(0,0,11.3),(.76,3.65,5.0),nylon,slider,.055)
    stabilizer_sliders.append(slider)
curve('Stabilizer wire',[(enter_x-11.9,6,2.3),(enter_x-11.9,8,2.3),(enter_x+11.9,8,2.3),(enter_x+11.9,6,2.3)],.35,steel,keyboard)

cube('Recessed status LED surround',(146.2,30,5.0),(1.3,3.6,.2),nylon,keyboard,.18)
cube('Single amber status LED',(146.2,30,5.17),(.65,2.4,.2),led_mat,keyboard,.14)
cube('Under-key amber SMD LED',(enter_x,4.8,6.05),(1.6,.8,.45),led_mat,keyboard,.08)

# Studio sources and camera vectors are separate from the CAD geometry so the
# composition can be refined without changing the manufactured cap profiles.
world=bpy.data.worlds.new('Neutral dark studio');scene.world=world;world.use_nodes=True
nodes=world.node_tree.nodes;links=world.node_tree.links;background=nodes.get('Background')
background.inputs['Color'].default_value=(*rgb('#141b25'),1);background.inputs['Strength'].default_value=.28
if Path(args.hdri).exists():
    env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(args.hdri,check_existing=True)
    coords=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping');mapping.inputs['Rotation'].default_value.z=math.radians(110)
    links.new(coords.outputs['Generated'],mapping.inputs['Vector']);links.new(mapping.outputs['Vector'],env.inputs['Vector'])
    links.new(env.outputs['Color'],background.inputs['Color']);background.inputs['Strength'].default_value=.08


def area(name,location,energy,size,size_y,colour,target=(113,0,12)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='RECTANGLE';data.size=size;data.size_y=size_y;data.color=rgb(colour)
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler();return obj

area('Overhead silk',(114,-20,135),145000,65,28,'#edf0f2')
area('Cobalt rim reflection',(173,34,62),85000,9,85,'#bac7d0' if args.look=='neutral' else '#4e92ec')
area('Warm grazing edge',(170,40,32),23000,40,4,'#ffbe77')
area('Front fill card',(125,-112,80),16000,85,30,'#e0e4e7')
area('Fine white strip',(153,-15,100),24000,3,65,'#f8f9fc')
area('Key face reflected silk',(73,76,117),90000,38,65,'#e8eef6')
signal_light=area('Under-key amber backlight',(enter_x,-5.0,6.1),80,2.8,.8,'#ffb95d',target=(enter_x,-5,17))

bpy.ops.object.camera_add(location=(197,-137,118));camera=bpy.context.object;camera.name='Configurable macro camera'
camera.data.lens=85;camera.data.sensor_width=36;camera.data.clip_start=.00005;camera.data.clip_end=10
camera.data.dof.use_dof=args.dof;camera.data.dof.aperture_fstop=args.fstop;camera.data.dof.aperture_blades=9
focus=group('Enter focus plane',(enter_x,0,17));camera.data.dof.focus_object=focus;scene.camera=camera
if args.opaque_floor:
    floor_mat=material('Dark photographic studio surface','#111923',.43,grain=.0003,scale=250)
    cube('Studio tabletop',(90,0,-8),(900,900,1),floor_mat,None,.1)

studio=group('Millimetre authoring scale')
for obj in list(scene.objects):
    if obj is not studio and obj.parent is None:obj.parent=studio
studio.scale=(.001,.001,.001)
for light in bpy.data.lights:light.energy*=1e-6


def smooth(a,b,p):
    t=max(0,min(1,(p-a)/(b-a)));return t*t*(3-2*t)
def pose(progress):
    p=max(0,min(1,float(progress)));press=smooth(.44,.60,p)
    # Reverse assembly is strictly staged: the housing must be seated before
    # the keycap sockets approach it. Engaged parts never translate sideways.
    base_lift=8*(1-smooth(.06,.13,p))
    spring_lift=12*(1-smooth(.11,.18,p))
    stem_lift=13*(1-smooth(.17,.24,p))
    shell_lift=30*(1-smooth(.23,.31,p))
    cap_lift=44*(1-smooth(.29,.38,p))
    # Frame the actual highest part, not a separate timeline that can return
    # the camera before the still-raised cap has descended.
    opening=cap_lift/44
    hero_cap.location=(enter_x,0,10.1+cap_lift-press*4)
    hero_cap.rotation_euler=(0,0,0)
    housing.location=(enter_x,0,shell_lift)
    switch_base.location=(enter_x,0,base_lift)
    stem.location=(enter_x,0,stem_lift-press*4)
    spring.location=(enter_x,0,spring_lift)
    # Change coil pitch, never scale wire thickness while compressing.
    height=spring_height-press*4
    for index,(point,rest) in enumerate(zip(spring_wire.data.splines[0].points,points)):
        t=index/520
        # Closed end coils retain their pitch. Uniform Z scaling would make
        # these turns cut through each other at the bottom of the stroke.
        z=.12*t/.09 if t<.09 else height-.12+.12*(t-.91)/.09 if t>.91 else .12+(height-.24)*(t-.09)/.82
        point.co=(rest[0],rest[1],spring_base+z,1)
    for slider in stabilizer_sliders:slider.location.z=-press*4
    led_shader.inputs['Emission Strength'].default_value=.4+1.6*smooth(.60,.80,p)
    signal_light.data.energy=(80+3500*smooth(.60,.80,p))*1e-6
    target=Vector((119,0,14+opening*23))
    camera.location=(184+opening*54,-98-opening*9,121+opening*21)
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    focus.location=(enter_x,0,17+opening*16-press*4)
    scene['study_progress']=p
    return p


pose(args.progress)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cad-keyboard-study.blend'),compress=True)
manifest={'scene':'Brandless ANSI keyboard product study with true Cherry-profile CAD caps','cad':{'source':'https://github.com/endeavoursc/cherry-mx-keycaps','commit':'3b94e3c7f8ed465917c1975ae0802d8965d5066b','author':'Santiago Castelo','copyright':'2020','license':'MIT','fileSHA256':hashlib.sha256(Path(args.cad).read_bytes()).hexdigest(),'heroMesh':'R3_2.25u'},'geometry':'Licensed CAD keycaps retain internal ribs and switch/stabilizer sockets; case, switch, plate and lighting independently authored','legend':'Standard ANSI QWERTY layout, flush rendered glyphs; no font file distributed','pitchMillimetres':19.05,'keyTravelMillimetres':4,'hdri':{'source':'https://polyhaven.com/a/studio_small_09','author':'Sergej Majboroda','license':'CC0'},'dimensions':[args.width,args.height],'samples':args.samples,'look':args.look,'dof':args.dof,'fstop':args.fstop,'heroProgress':.42,'colour':'AgX SDR output'}
(out/'render-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('CAD_SCENE_READY',len(scene.objects),'objects; no fabricated keycap geometry',flush=True)
if not args.save_only:
    if args.frames:
        last=args.frames-1 if args.end<0 else min(args.end,args.frames-1)
        identical_poses={}
        for index in range(args.start,last+1):
            p=pose(index/max(1,args.frames-1));destination=out/('key-%03d.png'%index)
            # End holds share exactly the same camera, geometry, focus, lighting
            # and fixed seed. Reuse that finished render rather than ray-tracing
            # identical pixels; every moving pose still receives a real render.
            signature=tuple(smooth(a,b,p) for a,b in ((.06,.13),(.11,.18),(.17,.24),(.23,.31),(.29,.38),(.44,.60),(.60,.80)))
            if signature in identical_poses:
                shutil.copyfile(identical_poses[signature],destination)
            else:
                scene.render.filepath=str(destination);bpy.ops.render.render(write_still=True)
                identical_poses[signature]=destination
            print('PORTFOLIO_FRAME',index,flush=True)
    else:
        p=pose(args.progress);scene.render.filepath=str(out/('key-p%03d.png'%round(p*1000)))
        bpy.ops.render.render(write_still=True);print('PORTFOLIO_STILL',scene.render.filepath,flush=True)

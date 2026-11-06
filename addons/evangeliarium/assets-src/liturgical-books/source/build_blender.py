"""Build editable Blender scenes directly from canonical author cuboids.
Usage: blender -b --python source/build_blender.py [-- --book missal|pontifical|lectionary]
Coordinates and UVs reproduce the project Bedrock viewer; rendering is diagnostic.
"""
import bpy, json, math, sys, argparse
from mathutils import Vector, Matrix
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
AUTHOR=ROOT if (ROOT/'missal.author.json').exists() else ROOT/'source'
args=argparse.ArgumentParser();args.add_argument('--book');args.add_argument('--draft',action='store_true');args.add_argument('--views',default='closed,back,detail,open,top');a=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
S=1/16
B=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
def pt(v):return B@Vector(v)*S
def face_vertices(o,s):
 x,y,z=o;X,Y,Z=[o[i]+s[i] for i in range(3)]
 return{'north':[(X,Y,z),(x,Y,z),(X,y,z),(x,y,z)],'south':[(x,Y,Z),(X,Y,Z),(x,y,Z),(X,y,Z)],'east':[(X,Y,Z),(X,Y,z),(X,y,Z),(X,y,z)],'west':[(x,Y,z),(x,Y,Z),(x,y,z),(x,y,Z)],'up':[(x,Y,z),(X,Y,z),(x,Y,Z),(X,Y,Z)],'down':[(x,y,Z),(X,y,Z),(x,y,z),(X,y,z)]}
def material(key):
 m=bpy.data.materials.new(key+' · atlas color / MER / normal');m.use_nodes=True;n=m.node_tree.nodes;links=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['IOR'].default_value=1.46
 for suffix in ['', '_mer','_normal']:
  tex=n.new('ShaderNodeTexImage');texture_path=ROOT.parents[1]/f'packs/resource/textures/entity/book{suffix}.png' if key=='evangeliarium' else ROOT/f'bedrock/textures/entity/{key}{suffix}.png';tex.image=bpy.data.images.load(str(texture_path));tex.image.pack();tex.interpolation='Closest';tex.label='256 × 256 · nearest';tex.location=(-650,300 if not suffix else 0 if suffix=='_mer' else -300)
  if suffix:tex.image.colorspace_settings.name='Non-Color'
  if not suffix:links.new(tex.outputs['Color'],p.inputs['Base Color'])
  elif suffix=='_mer':
   split=n.new('ShaderNodeSeparateColor');split.mode='RGB';split.location=(-400,0);links.new(tex.outputs['Color'],split.inputs[0]);links.new(split.outputs['Red'],p.inputs['Metallic']);links.new(split.outputs['Blue'],p.inputs['Roughness'])
  else:
   nm=n.new('ShaderNodeNormalMap');nm.location=(-400,-300);links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],p.inputs['Normal'])
 return m
def mesh(name,c,bpivot,tiles,mat,collection):
 verts=[];faces=[];uvs=[]
 for f,coords in face_vertices(c['origin'],c['size']).items():
  if f in c.get('omit',[]):continue
  u,v,w,h=tiles[c['faces'].get(f,c['surface'])];base=len(verts)
  verts.extend([pt(Vector(co)-Vector(bpivot)) for co in coords]);faces.append([base,base+2,base+3,base+1])
  uvs.extend([(u/256,1-v/256),(u/256,1-(v+h)/256),((u+w)/256,1-(v+h)/256),((u+w)/256,1-v/256)])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(mat);me.update();uv=me.uv_layers.new(name='Bedrock explicit face UV')
 for i,p in enumerate(me.polygons):
  for j,li in enumerate(p.loop_indices):uv.data[li].uv=uvs[i*4+j]
 ob=bpy.data.objects.new(name,me);collection.objects.link(ob);ob['bedrock_origin']=c['origin'];ob['bedrock_size']=c['size'];ob['surface']=c['surface'];ob['source_cube_name']=c['name'];return ob

def look(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def camera(name,loc,target,scale):
 data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(ob);ob.location=loc;look(ob,target);data.type='ORTHO';data.ortho_scale=scale;data.lens=65;return ob
def light(name,loc,power,size,color,target):
 data=bpy.data.lights.new(name,'AREA');ob=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(ob);ob.location=loc;look(ob,target);data.energy=power;data.shape='DISK';data.size=size;data.color=color

def build(key):
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
 spec=json.loads((AUTHOR/f'{key}.author.json').read_text());mat=material(key)
 width=spec.get('configuration',{}).get('width',5);height=spec.get('configuration',{}).get('height',7);support=.68 if key=='evangeliarium' else spec['configuration']['thickness']/2+.08
 coll=bpy.data.collections.new('AUTHOR CUBOIDS · 1 unit = 1/16 block');scene.collection.children.link(coll)
 present=bpy.data.objects.new('book_presentation',None);coll.objects.link(present)
 action=bpy.data.objects.new('book_action',None);coll.objects.link(action);action.parent=present
 obs={'book_action':action};by={b['name']:b for b in spec['bones']}
 for b in spec['bones']:
  ob=bpy.data.objects.new(b['name'],None);coll.objects.link(ob);par=obs[b['parent']];ob.parent=par
  pp=by[b['parent']]['pivot'] if b['parent'] in by else [0,0,0]
  ob.location=pt(Vector(b['pivot'])-Vector(pp));ob.empty_display_size=.035;obs[b['name']]=ob
  ob['bedrock_pivot']=b['pivot'];ob['bedrock_parent']=b['parent']
  for c in b['cubes']:
   child=mesh(c['name'],c,b['pivot'],spec['tiles'],mat,coll);child.parent=ob
 front=obs['front_cover'];front.rotation_mode='XYZ'
 for frame,angle in [(1,0),(36,177),(60,177),(96,0)]:front.rotation_euler[2]=math.radians(angle);front.keyframe_insert('rotation_euler',frame=frame)
 for name,axis,angle in [('binding_shell',2,90)]+[(f'ribbon_tip_{color}',0,-18) for color in ['red','green','gold','blue','violet']]:
  ob=obs[name];ob.rotation_mode='XYZ'
  for frame,value in [(1,0),(36,angle),(60,angle),(96,0)]:ob.rotation_euler[axis]=math.radians(value);ob.keyframe_insert('rotation_euler',frame=frame)
 shell=obs['binding_shell']
 for frame,value in [(1,1),(36,.3),(60,.3),(96,1)]:shell.scale.x=value;shell.keyframe_insert('scale',frame=frame)
 for frame,angle,z in [(1,0,0),(36,90,support*S),(60,90,support*S),(96,0,0)]:
  present.rotation_euler[0]=math.radians(angle);present.location.z=z;present.keyframe_insert('rotation_euler',frame=frame);present.keyframe_insert('location',frame=frame)
 for ob in [front,present,obs['binding_shell']]+[obs[f'ribbon_tip_{color}'] for color in ['red','green','gold','blue','violet']]:
  if ob.animation_data and ob.animation_data.action:
   for curve in ob.animation_data.action.fcurves:
    for point in curve.keyframe_points:point.interpolation='LINEAR'
 scene.frame_start=1;scene.frame_end=96
 scene.timeline_markers.new('CLOSED / upright',frame=1);scene.timeline_markers.new('OPEN / tabletop',frame=36);scene.timeline_markers.new('Open hold',frame=60)
 present['integration']='Neutral item binding stays external. book_presentation is view-only; book_action is neutral.'
 present['provenance']='Original artwork and cuboid design, generated in Blender 4.3.2 from accompanying source.'
 present['editing']='Every cuboid has canonical Bedrock origin/size custom properties. Author source: source/build_assets.py for Missal/Pontifical; ../design.mjs for Gospel. Blender edits require explicit roundtrip export.'
 cams={
  'closed':camera('01 · Front and spine',(-.42,1.0,.63),(width/32,0,height/32),.59),
  'back':camera('02 · Rear tooling',(.65,-1,.56),(width/32,0,height/32),.59),
  'open':camera('03 · Open pages',(.70,.95,1.35),(0,-height/32,support/16),.85),
  'top':camera('04 · Plan / UV inspection',(.0,-height/32,1.4),(0,-height/32,0),.77),
  'low':camera('06 · Gutter and lower edge',(.72,.85,.35),(0,-height/32,support/16),.85),
  'detail':camera('05 · Binding detail',(-.56,.8,.64),(.055,0,.245),.39),
 }
 cams['top'].rotation_euler.z+=math.pi
 light('Key · softbox',(-.7,.75,1.35),30,.8,(1,.91,.77),(.1,0,.20));light('Fill · skylight',(1.0,.6,.70),19,.95,(.80,.88,1.0),(.1,0,.20));light('Rim · brass',(-.25,-.8,1.10),33,.7,(1,.89,.69),(.1,0,.20))
 world=bpy.data.worlds.new('Neutral charcoal studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.17,.21,1);world.node_tree.nodes['Background'].inputs[1].default_value=.30;scene.world=world
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16 if a.draft else 96;scene.cycles.use_denoising=False;scene.render.resolution_x=600 if a.draft else 1200;scene.render.resolution_y=600 if a.draft else 1200;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.threads_mode='FIXED';scene.render.threads=6
 scene['verification_limit']='Blender diagnostic render, not Minecraft visual parity or runtime acceptance.'
 txt=bpy.data.texts.new('README · editing and export');txt.write(f'''{key.upper()} — Original liturgical book\n\nFrame 1: closed upright. Frame 36–60: open tabletop.\nCameras 01–05 are inspection views. All textures are packed.\nCuboids are individually named and parented to the matching Bedrock bone empties.\nScale: 16 units per Minecraft block. Source .author.json preserves coordinates.\n\nAuthoritative build: source/build_assets.py. Bedrock exporter: design.mjs.\nNo armature bake, modifiers, external fonts, or external textures are required.\nThis scene exactly renders the exported visible faces and atlas, not a high-poly substitute.\nFor cuboid geometry edits, use source/export_blender_edits.py to export a new .author.json. The helper rejects changed rigs, arbitrary meshes and UV changes rather than silently approximating them. Then run the addon build with the new author file.\nLiturgical page marks are ornamental, not actual reading text.\n''')
 embedded=bpy.data.texts.new('export_blender_edits.py');embedded.write((ROOT/'source/export_blender_edits.py').read_text())
 scene.frame_set(1);scene.camera=cams['closed'];bpy.context.view_layer.update()
 # Frame source cleanly in any 3D viewport after opening.
 for screen in bpy.data.screens:
  for area in screen.areas:
   if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=.9;area.spaces.active.region_3d.view_location=(.15,0,.2);area.spaces.active.shading.type='MATERIAL'
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'blender/{key}.blend'))
 stats={'key':key,'blender':bpy.app.version_string,'objects':sum(o.type=='MESH' for o in coll.objects),'visible_quads':sum(len(o.data.polygons) for o in coll.objects if o.type=='MESH'),'source':'Exact original Bedrock cuboids and nearest-sampled atlas','renderer':'Blender Cycles CPU / 96 spp / AgX Medium High Contrast / 1200²','renders':[]}
 output=ROOT/'renders'/'drafts' if a.draft else ROOT/'renders';output.mkdir(parents=True,exist_ok=True)
 for name in filter(None,a.views.split(',')):
  frame=18 if name=='mid' else 36 if name in ['open','top','low'] else 1
  scene.frame_set(frame,subframe=.5 if name=='mid' else 0);scene.camera=cams['open' if name=='mid' else name];
  if name=='mid':
   saved_action=present.animation_data.action;present.animation_data.action=None
   present.rotation_euler[0]=math.pi/2;present.location.z=support*S;bpy.context.view_layer.update()
  scene.render.filepath=str(output/f'{key}_{name}.png');bpy.ops.render.render(write_still=True);stats['renders'].append({'view':name,'frame':18.5 if name=='mid' else frame,'path':f'renders/{key}_{name}.png'})
  if name=='mid':present.animation_data.action=saved_action
 (ROOT/f'reports/{key}_blender.json').write_text(json.dumps(stats,indent=2)+'\n')
for key in ([a.book] if a.book else ['evangeliarium','missal','pontifical','lectionary']):build(key)

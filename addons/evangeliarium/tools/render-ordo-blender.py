"""Exact exported Ordo geometry/UV inspection; Blender Cycles CPU, not Bedrock parity."""
import bpy,json,math,hashlib,argparse,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'assets-src/ordo')
parser.add_argument('--geometry',type=Path,default=ROOT/'packs/resource/models/blocks/ordo_calendar.geo.json')
parser.add_argument('--texture',type=Path,default=ROOT/'packs/resource/textures/blocks/ordo_calendar.png')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
g=json.loads(args.geometry.read_text())['minecraft:geometry'][0]
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
B=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
def point(v):return B@Vector(v)/16
by={b['name']:b for b in g['bones']}
def rot(p,pivot,rotation):
 p=Vector(p)-Vector(pivot)
 for axis,angle in enumerate(rotation):p=Matrix.Rotation(math.radians(angle)*(1 if axis==1 else -1),3,'XYZ'[axis])@p
 return p+Vector(pivot)
def transform(p,c,b):
 if 'rotation' in c:p=rot(p,c['pivot'],c['rotation'])
 while b:
  p=rot(p,b.get('pivot',[0,0,0]),b.get('rotation',[0,0,0]));b=by.get(b.get('parent'))
 return point(p)
def face_vertices(o,s):
 x,y,z=o;X,Y,Z=[o[i]+s[i] for i in range(3)]
 return{'north':[(X,Y,z),(x,Y,z),(X,y,z),(x,y,z)],'south':[(x,Y,Z),(X,Y,Z),(x,y,Z),(X,y,Z)],'east':[(X,Y,Z),(X,Y,z),(X,y,Z),(X,y,z)],'west':[(x,Y,z),(x,Y,Z),(x,y,z),(x,y,Z)],'up':[(x,Y,z),(X,Y,z),(x,Y,Z),(X,Y,Z)],'down':[(x,y,Z),(X,y,Z),(x,y,z),(X,y,z)]}
mat=bpy.data.materials.new('Ordo · real atlas');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.8
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(args.texture.resolve()));tex.image.pack();tex.interpolation='Closest';mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
for b in g['bones']:
 for ix,c in enumerate(b.get('cubes',[])):
  verts=[];faces=[];uvs=[]
  for f,coords in face_vertices(c['origin'],c['size']).items():
   u,v=c['uv'][f]['uv'];w,h=c['uv'][f]['uv_size'];base=len(verts);verts.extend([transform(co,c,b) for co in coords]);faces.append([base,base+2,base+3,base+1]);uvs.extend([(u/128,1-v/128),(u/128,1-(v+h)/128),((u+w)/128,1-(v+h)/128),((u+w)/128,1-v/128)])
  me=bpy.data.meshes.new(b['name']+str(ix));me.from_pydata(verts,[],faces);me.materials.append(mat);me.update();uv=me.uv_layers.new()
  for i,poly in enumerate(me.polygons):
   for j,li in enumerate(poly.loop_indices):uv.data[li].uv=uvs[i*4+j]
  ob=bpy.data.objects.new(me.name,me);scene.collection.objects.link(ob)
def look(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power in [('Key',(-1,1.5,2),65),('Fill',(1,1,1.3),40),('Rim',(0,-1,1.5),45)]:
 data=bpy.data.lights.new(name,'AREA');ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc;look(ob,(0,0,.35));data.energy=power;data.size=1.5
world=bpy.data.worlds.new('Neutral');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.16,.19,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='Standard'
data=bpy.data.cameras.new('Inspection');cam=bpy.data.objects.new('Inspection',data);scene.collection.objects.link(cam);data.type='ORTHO';data.ortho_scale=.92;scene.camera=cam
captures=[]
for name,direction,size,scale in [('item-64',(.5,1,.35),64,1),('front',(0,1,.12),768,1),('three-quarter',(.65,1,.4),768,1),('back',(.5,-1,.3),768,1),('side',(1,0,.1),768,1),('opposite-side',(-1,0,.1),768,1),('opposite-quarter',(-.65,1,.4),768,1),('item-32',(.5,1,.35),32,1),('item-16',(.5,1,.35),16,1),('top',(0,.001,1),768,1),('bottom',(0,.001,-1),768,1),('front-medium',(0,1,.12),768,2),('front-far',(0,1,.12),768,4)]:
 data.ortho_scale=.92*scale
 target=Vector((0,0,.34));cam.location=target+Vector(direction)*2;look(cam,target);scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);captures.append({'file':name+'.png','size':size,'direction':direction,'orthoScale':data.ortho_scale,'sha256':hashlib.sha256((OUT/(name+'.png')).read_bytes()).hexdigest()})
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ordo-calendar.blend'))
count=sum(len(b.get('cubes',[])) for b in g['bones'])
(OUT/'render-manifest.json').write_text(json.dumps({'renderer':'Blender '+bpy.app.version_string+' / Cycles CPU / 32 spp / Standard','source':f'Exported geometry and nearest sampled atlas; {count} cuboids, {count*6} quads','geometrySha256':hashlib.sha256(args.geometry.read_bytes()).hexdigest(),'textureSha256':hashlib.sha256(args.texture.read_bytes()).hexdigest(),'limitation':'Diagnostic only; orthographic distance samples represent screen size, not perspective or Bedrock mipmapping. Minecraft imported-pack validation remains required.','captures':captures},indent=2)+'\n')

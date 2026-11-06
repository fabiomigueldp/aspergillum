"""Common-scale Blender proof on a block-sized support; diagnostic, not game rendering."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=6
s.render.resolution_x=1800;s.render.resolution_y=1000;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('Scale proof environment');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.25,.25,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
def look(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
def matte(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;return m
stone=matte('neutral support',(.24,.26,.25));grid=matte('one-block marks',(.48,.49,.46))
def box(name,center,size,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
box('Support · 2.4 × 1 × 0.5 blocks',(0,0,.25),(2.4,1,.5),stone)
# Fine one-block grid serves scale only, behind the books rather than as decoration.
for x in [-1,0,1]:box('1 block ruler', (x,-.4,.501),(.006,.18,.002),grid)
books=[]
for key,x in [('evangeliarium',-.75),('missal',0),('pontifical',.75)]:
 spec=json.loads((ROOT/f'{key}.author.json').read_text());cfg=spec.get('configuration',{});w=cfg.get('width',5);h=cfg.get('height',7);support=.68 if key=='evangeliarium' else cfg['thickness']/2+.08
 with bpy.data.libraries.load(str(ROOT/f'blender/{key}.blend'),link=False) as (src,dst):dst.collections=[n for n in src.collections if n.startswith('AUTHOR CUBOIDS')]
 coll=dst.collections[0];s.collection.children.link(coll);p=next(o for o in coll.objects if o.name.split('.')[0]=='book_presentation');p.animation_data.action=None;books.append((key,x,w,h,support,p,coll))
for name,loc,power,size in [('key',(-1,2,3),280,3),('fill',(2,-1,2),130,2)]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;look(o,(0,0,.7));d.energy=power;d.shape='DISK';d.size=size
c=bpy.data.cameras.new('Common scale camera');cam=bpy.data.objects.new('Common scale camera',c);s.collection.objects.link(cam);c.type='ORTHO';c.ortho_scale=2.95;s.camera=cam
out=ROOT/'renders/proportions';out.mkdir(parents=True,exist_ok=True);report={}
for view,frame,loc,target in [('closed',1,(1.3,3.5,2),(0,0,.62)),('open',36,(1.2,2.9,3.2),(0,0,.50))]:
 s.frame_set(frame)
 for key,x,w,h,support,p,coll in books:
  p.rotation_euler=(math.pi/2,0,0);p.location=(x if view=='open' else x-w/32,h/32,.5+support/16)
 bpy.context.view_layer.update();cam.location=loc;look(cam,target);s.render.filepath=str(out/f'common-scale-{view}.png');bpy.ops.render.render(write_still=True)
 assert all(min((o.matrix_world@v.co).z for o in coll.objects if o.type=='MESH' for v in o.data.vertices)>=.5-1e-6 for key,x,w,h,support,p,coll in books),'Model penetrates support'
 report[view]={key:{'width':w,'height':h,'minZ':min((o.matrix_world@v.co).z for o in coll.objects if o.type=='MESH' for v in o.data.vertices)} for key,x,w,h,support,p,coll in books}
(ROOT/'reports/proportion-support.json').write_text(json.dumps({'units':'blocks; model dimensions use16units/block','limitation':'Diagnostic scale proof, not native Minecraft renderer or collision simulation','poses':report},indent=2)+'\n')
print('Common-scale closed/open support proof ready.')

"""Render exported existing-rig geometry without browser or WebGL. Not Minecraft acceptance."""
import bpy,json,sys,argparse
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--draft',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
spec=json.loads(Path(a.input).read_text());bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=False;s.render.threads_mode='FIXED';s.render.threads=4;s.render.resolution_x=900;s.render.resolution_y=1000;s.render.resolution_percentage=100
if a.draft:s.cycles.samples=24;s.render.resolution_x=600;s.render.resolution_y=660
s.world=bpy.data.worlds.new('rig diagnostic world');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.19,.20,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
for group in ['player','item']:
 m=bpy.data.materials.new(group);m.use_nodes=True;nodes=m.node_tree.nodes;shader=nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.75
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(spec['textures'][group]);tex.interpolation='Closest';m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
 for record in spec[group]:
  vertices=[(v[0]/16,-v[2]/16,v[1]/16) for v in record['vertices']];ids=record['indices'];faces=[ids[i:i+3] for i in range(0,len(ids),3)]
  me=bpy.data.meshes.new(record['name']);me.from_pydata(vertices,[],faces);me.update();uv=me.uv_layers.new(name='Exported existing-rig UV')
  for poly in me.polygons:
   for li in poly.loop_indices:uv.data[li].uv=record['uv'][me.loops[li].vertex_index]
  ob=bpy.data.objects.new(group+' '+record['name'],me);s.collection.objects.link(ob);me.materials.append(m)
def look(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size in [('key',(-2,3,4),400,3),('fill',(2,1,2),100,2)]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;look(o,(0,.4,1.4));d.energy=power;d.size=size
c=bpy.data.cameras.new('Existing-rig diagnostic');cam=bpy.data.objects.new('Existing-rig diagnostic',c);s.collection.objects.link(cam);cam.location=(.6,3,1.9);look(cam,(0,.2,1.55));c.type='ORTHO';c.ortho_scale=1.25;s.camera=cam
s.render.filepath=str(Path(a.output).resolve());Path(a.output).parent.mkdir(parents=True,exist_ok=True);bpy.ops.render.render(write_still=True)
print('Rendered',spec['book'],spec['skin'],'existing rig diagnostic; no engine parity claimed.')

"""Verify and embed export instructions in completed editable scenes, without changing models."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
report={}
for key in ['evangeliarium','missal','pontifical']:
 path=ROOT/f'blender/{key}.blend';bpy.ops.wm.open_mainfile(filepath=str(path));s=bpy.context.scene;s.frame_set(1)
 txt=bpy.data.texts.get('export_blender_edits.py') or bpy.data.texts.new('export_blender_edits.py');txt.clear();txt.write((ROOT/'source/export_blender_edits.py').read_text())
 txt=bpy.data.texts.get('README · editing and export');body=txt.as_string().replace('Editing a Blender cuboid does not automatically regenerate Bedrock JSON. Update the canonical source and rebuild.','For axis-aligned cuboid edits, run source/export_blender_edits.py with an output author JSON. The adjacent source files are required. Unsupported rig, topology, UV or material changes are rejected. Then rebuild the addon with the exported author JSON.');txt.clear();txt.write(body)
 meshes=[ob for ob in bpy.data.objects if ob.type=='MESH'];faces=0
 for ob in meshes:
  mid=sum((Vector(p) for p in ob.bound_box),Vector())/8
  for p in ob.data.polygons:
   assert p.area>0 and (p.center-mid).dot(p.normal)>0,f'Inverted face: {ob.name}'
   assert len(p.vertices)==4
  assert ob.data.uv_layers.active
  assert all(0<=v<=1 for loop in ob.data.uv_layers.active.data for v in loop.uv)
  faces+=len(ob.data.polygons)
 images=[im for im in bpy.data.images if im.type=='IMAGE' and im.size[0]>0]
 assert all(im.packed_file for im in images), 'Unpacked texture'
 assert len(images)==3 and all(tuple(im.size)==(256,256) for im in images)
 spec=json.loads((ROOT/f'{key}.author.json').read_text())
 expected_cubes=[c for b in spec['bones'] for c in b['cubes']]
 assert len(meshes)==len(expected_cubes) and faces==sum(6-len(c.get('omit',[])) for c in expected_cubes)
 s.frame_set(36);bpy.context.view_layer.update()
 assert abs(bpy.data.objects['binding_shell'].rotation_euler.z-math.pi/2)<1e-6
 assert abs(bpy.data.objects['binding_shell'].scale.x-.3)<1e-6
 for color in ['red','green','gold','blue','violet']:assert abs(bpy.data.objects[f'ribbon_tip_{color}'].rotation_euler.x+math.radians(18))<1e-6
 s.frame_set(1);bpy.context.view_layer.update()
 bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(path))
 report[key]={'status':'pass','meshObjects':len(meshes),'visibleQuads':faces,'packedImages':len(images),'checks':['file reopened','positive quad area','outward normals','UVs within atlas','packed image dependencies','matching canonical geometry counts','export instructions embedded']}
(ROOT/'reports/blender-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('Editable Blender files reopened, checked and finalized.')

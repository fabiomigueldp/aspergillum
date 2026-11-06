"""Export edited axis-aligned author cuboids from the CURRENT .blend.
blender -b blender/missal.blend --python source/export_blender_edits.py -- --output /tmp/missal.author.json
Preserves semantic surfaces, face omissions, pivots and hierarchy. Rejects arbitrary meshes,
rotated cuboids and changed rigs rather than silently approximating them.
"""
import bpy, json, argparse, sys
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[1]
AUTHOR=ROOT if (ROOT/'missal.author.json').exists() else ROOT/'source'
args=argparse.ArgumentParser();args.add_argument('--output',required=True);args.add_argument('--book',choices=['evangeliarium','missal','pontifical']);a=args.parse_args(sys.argv[sys.argv.index('--')+1:])
key=a.book or Path(bpy.data.filepath).stem
spec=json.loads((AUTHOR/f'{key}.author.json').read_text())
B=Matrix(((1,0,0),(0,0,-1),(0,1,0)));BI=B.inverted();S=1/16
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
count=0
by={b['name']:b for b in spec['bones']}
for name in ['book_presentation','book_action']:
 ob=bpy.data.objects.get(name)
 if not ob or max(abs(x) for x in ob.location)>1e-6 or max(abs(x) for x in ob.rotation_euler)>1e-6 or max(abs(x-1) for x in ob.scale)>1e-6:raise ValueError(f'Changed neutral root: {name}')
for b in spec['bones']:
 bone=bpy.data.objects.get(b['name'])
 if not bone or bone.type!='EMPTY' or not bone.parent or bone.parent.name!=b['parent']:raise ValueError(f'Changed hierarchy for {b["name"]}')
 if max(abs(x) for x in bone.rotation_euler)>1e-6 or max(abs(x-1) for x in bone.scale)>1e-6:raise ValueError(f'Changed rig transform: {b["name"]}')
 expected=B@(Vector(b['pivot'])-Vector(by[b['parent']]['pivot'] if b['parent'] in by else [0,0,0]))*S
 if (bone.location-expected).length>1e-6:raise ValueError(f'Changed rig location: {b["name"]}')
 if list(bone.get('bedrock_pivot',[]))!=b['pivot']:raise ValueError(f'Changed pivot: {b["name"]}')
 for c in b['cubes']:
  matches=[ob for ob in bone.children if ob.type=='MESH' and ob.get('source_cube_name')==c['name']]
  if len(matches)!=1:raise ValueError(f'Missing or duplicate cuboid {c["name"]}')
  ob=matches[0]
  vertices=[BI@(ob.matrix_local@v.co)/S+Vector(b['pivot']) for v in ob.data.vertices]
  lo=[min(v[i] for v in vertices) for i in range(3)];hi=[max(v[i] for v in vertices) for i in range(3)]
  if any(hi[i]-lo[i]<=1e-6 for i in range(3)):raise ValueError(f'Degenerate cuboid {c["name"]}')
  if any(min(abs(v[i]-lo[i]),abs(v[i]-hi[i]))>2e-5 for v in vertices for i in range(3)):raise ValueError(f'Not an axis-aligned cuboid: {c["name"]}')
  if len(ob.data.polygons)!=6-len(c.get('omit',[])) or any(len(p.vertices)!=4 for p in ob.data.polygons):raise ValueError(f'Changed face topology: {c["name"]}')
  if ob.get('surface')!=c['surface']:raise ValueError(f'Edit material assignments in author JSON, not custom properties: {c["name"]}')
  expected_uv=[]
  for face in ['north','south','east','west','up','down']:
   if face in c.get('omit',[]):continue
   u,v,w,h=spec['tiles'][c['faces'].get(face,c['surface'])]
   expected_uv.extend([(u/256,1-v/256),(u/256,1-(v+h)/256),((u+w)/256,1-(v+h)/256),((u+w)/256,1-v/256)])
  uv=ob.data.uv_layers.active
  if not uv or any(abs(uv.data[i].uv[j]-p[j])>1e-6 for i,p in enumerate(expected_uv) for j in range(2)):raise ValueError(f'UV edits require corresponding atlas source edits: {c["name"]}')
  c['origin']=[round(v,6) for v in lo];c['size']=[round(hi[i]-lo[i],6) for i in range(3)];count+=1
path=Path(a.output).resolve();path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n');print(f'Exported {count} editable cuboids to {path}')

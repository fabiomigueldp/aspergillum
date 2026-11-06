"""Sample articulated opening with fixed tabletop presentation; do not modify scenes."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
report={}
import sys
books=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['evangeliarium','missal','pontifical','lectionary']
for key in books:
 bpy.ops.wm.open_mainfile(filepath=str(root/f'blender/{key}.blend'))
 spec=json.loads((root/f'{key}.author.json').read_text());height=spec.get('configuration',{}).get('height',7);support=.68 if key=='evangeliarium' else spec['configuration']['thickness']/2+.08
 s=bpy.context.scene;p=bpy.data.objects['book_presentation'];p.animation_data.action=None
 samples=[]
 for i in range(51):
  frame=1+35*i/50;s.frame_set(int(frame),subframe=frame%1)
  p.rotation_euler=(math.pi/2,0,0);p.location=(0,0,support/16);bpy.context.view_layer.update()
  meshes=[ob for ob in bpy.data.objects if ob.type=='MESH']
  verts=[ob.matrix_world@Vector(v) for ob in meshes for v in ob.bound_box]
  lo=[min(v[j] for v in verts)*16 for j in range(3)];hi=[max(v[j] for v in verts)*16 for j in range(3)]
  assert lo[2]>=-1e-6,(key,i,'below support',lo)
  assert all(ob.matrix_world.determinant()>0 for ob in meshes)
  assert all(math.isfinite(v) for v in lo+hi)
  samples.append({'opening':i/50,'minModelUnits':lo,'maxModelUnits':hi})
 shell=bpy.data.objects['binding_shell'];sv=[ob.matrix_world@Vector(v) for ob in shell.children if ob.type=='MESH' for v in ob.bound_box]
 paper=bpy.data.objects['right_pages'];pv=[ob.matrix_world@Vector(v) for ob in paper.children if ob.type=='MESH' and ('signature' in ob.name or key=='evangeliarium') for v in ob.bound_box]
 shell_top=max(v.z for v in sv)*16;paper_top=max(v.z for v in pv)*16
 assert shell_top<paper_top-.1,(key,shell_top,paper_top)
 # Trace the actual print surface above each stored marker, not just source JSON.
 spec=json.loads((root/f'{key}.author.json').read_text());ribbons=next(b for b in spec['bones'] if b['name']=='ribbons')['cubes']
 rays=0
 for ribbon in ribbons:
  for y in [height*f/7 for f in [.5,3.5,6.5]]:
   x=ribbon['origin'][0]+ribbon['size'][0]/2
   result=s.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((x/16,-y/16,2)),Vector((0,0,-1)))
   assert result[0] and result[4].parent and result[4].parent.name=='right_pages',(key,ribbon['name'],y,'marker visible on reading surface')
   rays+=1
 report[key]={'status':'pass','samples':samples,'openOuterSpineTop':shell_top,'openPaperTop':paper_top,'readingSurfaceRays':rays,'checks':['51 opening samples above support','positive transforms (no inverted winding)','finite geometry','outer spine recessed under paper at fully open pose','ray casts above every marker hit paper, not a ribbon']}
(root/('reports/open-animation-'+('-'.join(books) if len(books)==1 else 'blender')+'.json')).write_text(json.dumps(report,indent=2)+'\n')
print(f'{len(books)} books / {len(books)*51} sampled poses passed; all open spines recessed below paper.')

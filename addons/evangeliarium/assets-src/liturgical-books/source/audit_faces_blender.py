"""Validate each mesh face and sample omitted face coverage at five opening poses. No scene changes are saved."""
import bpy,json,itertools
from pathlib import Path
from mathutils import Vector,Matrix
r=Path(__file__).resolve().parents[1];B=Matrix(((1,0,0),(0,0,-1),(0,1,0)));faces={'west':(0,0),'east':(0,1),'down':(1,0),'up':(1,1),'north':(2,0),'south':(2,1)};report={}
import sys
books=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['evangeliarium','missal','pontifical','lectionary']
for key in books:
 bpy.ops.wm.open_mainfile(filepath=str(r/f'blender/{key}.blend'));spec=json.loads((r/f'{key}.author.json').read_text());issues=[];tested=0
 for ob in [o for o in bpy.data.objects if o.type=='MESH']:
  mid=sum((Vector(p) for p in ob.bound_box),Vector())/8
  assert all(p.area>0 and (p.center-mid).dot(p.normal)>0 for p in ob.data.polygons),ob.name
  assert all(0<=n<=1 for loop in ob.data.uv_layers.active.data for n in loop.uv),ob.name
 entries=[]
 for b in spec['bones']:
  for c in b['cubes']:
   ob=next(o for o in bpy.data.objects if o.type=='MESH' and o.parent.name==b['name'] and o.get('source_cube_name')==c['name']);entries.append((b,c,ob))
 for frame in [1,10,18,27,36]:
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();inverses={o.name:o.matrix_world.inverted() for b,c,o in entries}
  for b,c,ob in entries:
   for face in c.get('omit',[]):
    axis,side=faces[face];uncovered=0
    for uv in itertools.product([.001,.5,.999],repeat=2):
     p=Vector(c['origin']);p[axis]+=side*c['size'][axis];j=0
     for ax in range(3):
      if ax!=axis:p[ax]+=uv[j]*c['size'][ax];j+=1
     p[axis]+=(1 if side else -1)*.00001;p=ob.matrix_world@(B@(p-Vector(b['pivot']))/16);covered=False
     for bb,cc,oo in entries:
      if oo==ob:continue
      q=B.inverted()@(inverses[oo.name]@p)*16+Vector(bb['pivot'])
      if all(cc['origin'][i]-1e-6<=q[i]<=cc['origin'][i]+cc['size'][i]+1e-6 for i in range(3)):covered=True;break
     tested+=1
     if not covered:uncovered+=1
    if uncovered:issues.append({'frame':frame,'cube':c['name'],'face':face,'uncoveredSamples':uncovered})
 report[key]={'meshObjects':len(entries),'visibleFaces':sum(len(o.data.polygons) for b,c,o in entries),'checks':['all face areas positive','all normals outward','all UV coordinates in atlas','omitted faces covered at nine positions in five poses'],'omittedFaceSamples':tested,'potentialExposedOmissions':issues}
(r/('reports/face-coverage-'+('-'.join(books) if len(books)==1 else 'blender')+'.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

assert not any(v['potentialExposedOmissions'] for v in report.values()),'Exposed omitted face detected'

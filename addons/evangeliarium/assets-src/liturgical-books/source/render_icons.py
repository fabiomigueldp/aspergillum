"""Generate consistent 256px source icons from editable scenes, with no model changes."""
import bpy, argparse, sys
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--book',choices=['evangeliarium','missal','pontifical','lectionary']);args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
for key in ([args.book] if args.book else ['missal','pontifical','lectionary']):
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'blender/{key}.blend'))
 s=bpy.context.scene;s.frame_set(1);s.camera=bpy.data.objects['01 · Front and spine'];s.cycles.samples=96;s.cycles.use_denoising=False;s.render.resolution_x=256;s.render.resolution_y=256;s.render.filepath=str(ROOT/f'renders/{key}-item-256.png')
 if key=='evangeliarium':
  # Preserve the official icon's near-frontal direction in Blender's x,-z,y basis.
  target=Vector((.145,0,.22));s.camera.location=target+Vector((.55,1,.22));s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=.55;s.view_settings.exposure=1.5
 bpy.ops.render.render(write_still=True)

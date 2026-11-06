"""Compare matched, full-quality before/after binding captures without altering assets.
Usage: python source/prepare_surface_review.py --baseline /path/to/before
Both inputs must be produced by build_blender.py -- --views closed,detail.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse, hashlib, json
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--baseline',required=True,type=Path);a=p.parse_args()
out=ROOT/'renders'/'surface-review';out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('DejaVuSans.ttf',22);small=ImageFont.truetype('DejaVuSans.ttf',16)
sheet=Image.new('RGB',(1920,1710),'#eee9df');d=ImageDraw.Draw(sheet)
d.text((20,18),'Terminais da lombada | antes / depois, câmera e material preservados',font=font,fill='#412b2b')
d.text((20,54),'Blender Cycles CPU · 96 spp · 1200² por captura · comparação diagnóstica, não teste Minecraft',font=small,fill='#675e55')
report={'renderer':'Blender Cycles CPU / 96 spp / 1200² / AgX Medium High Contrast','scope':'Spine core/crown up/down face UV only; no geometry, animation or texture pixels changed','limitation':'Diagnostic, not Minecraft rendering parity','comparisons':[]}
for row,key in enumerate(['evangeliarium','missal','pontifical']):
 y=100+row*530
 for column,(view,phase) in enumerate([('closed','before'),('closed','after'),('detail','before'),('detail','after')]):
  path=(a.baseline if phase=='before' else ROOT/'renders')/f'{key}_{view}.png'
  im=Image.open(path).convert('RGBA');assert im.size==(1200,1200)
  # Keep lossless full-resolution captures next to the overview for pixel inspection.
  dest=out/f'{key}-{view}-{phase}.png';dest.write_bytes(path.read_bytes())
  im=im.resize((460,460),Image.Resampling.LANCZOS);sheet.paste(im,(column*480+10,y),im)
  d.text((column*480+15,y+465),f'{key} · {view} · {phase}',font=small,fill='#412b2b')
  report['comparisons'].append({'book':key,'view':view,'phase':phase,'image':str(dest.relative_to(ROOT)),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
sheet.save(out/'comparison.png')
(ROOT/'reports/surface-review.json').write_text(json.dumps(report,indent=2)+'\n')
print(out/'comparison.png')

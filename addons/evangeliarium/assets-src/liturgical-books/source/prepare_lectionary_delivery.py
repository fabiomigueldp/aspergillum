"""Publish the generated Lectionary icon and assemble reproducible visual evidence."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
icon=root/'renders/lectionary-item-256.png'
out=root.parent/'branding/lectionary-item-64.png'
Image.open(icon).resize((64,64),Image.Resampling.LANCZOS).save(out,optimize=True)
views=['closed','open','top','low','mid']
sheet=Image.new('RGB',(1500,1050),'#25272c');d=ImageDraw.Draw(sheet)
for i,name in enumerate(views):
 img=Image.open(root/f'renders/lectionary_{name}.png').convert('RGBA');img.thumbnail((480,470),Image.Resampling.LANCZOS)
 x=(i%3)*500+(500-img.width)//2;y=(i//3)*525+28
 sheet.paste(img,(x,y),img);d.text(((i%3)*500+20,(i//3)*525+10),f'LECTIONARIUM / {name.upper()}',fill='#e2c68a')
sheet.save(root/'renders/lectionary-review.png')
files=[root/f'renders/lectionary_{v}.png' for v in views]+[icon,out,root/'lectionary.author.json',root/'lectionary.palette.json',root/'blender/lectionary.blend']
for skin in ['wide','slim']:
 rig=root/f'renders/proportions/lectionary-hand-{skin}.png'
 if rig.exists():files.append(rig)
summary=root.parents[1]/'out/hand-diagnostic/summary.json'
if summary.exists():
 (root/'reports/lectionary-hand-rig.json').write_text(json.dumps({'limitation':'Static canonical rig; bounds checks and renders do not prove native hand contact, FP, Persona or animation parity.','poses':[v for v in json.loads(summary.read_text()) if v['book']=='lectionary']},indent=2)+'\n')
(root/'reports/lectionary-delivery.json').write_text(json.dumps({'renderer':'Blender 4.3.2 / Cycles CPU / 96 samples / 1200x1200','limitation':'Diagnostic author-model renders. Native Minecraft import, first/third-person and Content Log acceptance remain pending.','files':{str(p.relative_to(root.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}},indent=2)+'\n')

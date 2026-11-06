"""Assemble the three-book diagnostic review from actual Cycles captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json
root=Path(__file__).resolve().parents[1]
font=lambda n:ImageFont.truetype('DejaVuSans.ttf',n)
sheet=Image.new('RGB',(2250,2450),'#eee9df');d=ImageDraw.Draw(sheet)
d.text((45,25),'EVANGELIARIUM / ENCADERNAÇÃO ABERTA',font=font(38),fill='#412b2b')
d.text((45,80),'Blender 4.3.2 · Cycles CPU · 96 amostras · capturas 1200²',font=font(23),fill='#675e55')
manifest={'renderer':'Blender 4.3.2 / Cycles CPU / 96 spp / 1200² / AgX Medium High Contrast','limitations':['Diagnostic renders, not Minecraft visual acceptance.','Articulated cuboids, not physically simulated leather or cloth.'],'images':{}}
for row,(key,title) in enumerate([('evangeliarium','Evangeliário'),('missal','Missal'),('pontifical','Pontifical')]):
 y=145+row*745
 for col,(view,label) in enumerate([('open','Aberto'),('low','Canal e corte'),('mid','Abertura em 50%')]):
  p=root/f'renders/{key}_{view}.png';im=Image.open(p).convert('RGBA')
  assert im.size==(1200,1200),(p,im.size)
  im.thumbnail((720,665),Image.Resampling.LANCZOS);sheet.paste(im,(col*750+(750-im.width)//2,y),im)
  d.text((45+col*750,y+670),f'{title} · {label}',font=font(25),fill='#412b2b')
  manifest['images'][str(p.relative_to(root))]=hashlib.sha256(p.read_bytes()).hexdigest()
d.text((45,2395),'153 poses verificadas; marcadores internos, texto livre. Aceitação no Minecraft ainda pendente.',font=font(23),fill='#675e55')
out=root/'renders/open-books-review.png';sheet.save(out,optimize=True)
manifest['images'][str(out.relative_to(root))]=hashlib.sha256(out.read_bytes()).hexdigest()
# Native-size thumbnails expose clutter that can disappear in large beauty renders.
scale_sheet=Image.new('RGB',(1200,1120),'#eee9df');sd=ImageDraw.Draw(scale_sheet)
sd.text((30,24),'LEITURA LIVRE / MARCADORES ENTRE FOLHAS',font=font(28),fill='#412b2b')
sd.text((30,68),'Capturas Blender; miniaturas exibidas em 128 px e 64 px, sem ampliação.',font=font(18),fill='#675e55')
for row,(key,title) in enumerate([('evangeliarium','Evangeliário'),('missal','Missal'),('pontifical','Pontifical')]):
 y=120+row*320
 sd.text((30,y),title,font=font(24),fill='#412b2b')
 for col,view in enumerate(['open','low']):
  im=Image.open(root/f'renders/{key}_{view}.png').convert('RGBA');im.thumbnail((390,265),Image.Resampling.LANCZOS)
  scale_sheet.paste(im,(25+col*405+(390-im.width)//2,y+34),im)
 for size,x in [(128,855),(64,1055)]:
  im=Image.open(root/f'renders/{key}_open.png').convert('RGBA').resize((size,size),Image.Resampling.LANCZOS)
  scale_sheet.paste(im,(x,y+95),im);sd.text((x,y+240),f'{size} px',font=font(18),fill='#675e55')
sd.text((30,1080),'Páginas sem fitas expostas. Teste visual no Minecraft ainda necessário.',font=font(19),fill='#675e55')
scale_path=root/'renders/reading-scale-review.png';scale_sheet.save(scale_path,optimize=True)
manifest['images'][str(scale_path.relative_to(root))]=hashlib.sha256(scale_path.read_bytes()).hexdigest()
(root/'reports/render-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(out)

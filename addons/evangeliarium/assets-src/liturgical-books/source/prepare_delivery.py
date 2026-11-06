"""Create diagnostic contact sheet and inventory thumbnails from rendered geometry."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
def font_at(size):
 try:return ImageFont.truetype('DejaVuSans.ttf',size)
 except OSError:return ImageFont.load_default(size=size)
font=font_at(28);small=font_at(18);head=font_at(36)
sheet=Image.new('RGB',(1800,1510),'#eee9df');d=ImageDraw.Draw(sheet)
d.text((55,30),'EVANGELIARIUM  /  LIVROS LITÚRGICOS',font=head,fill='#412b2b')
d.text((55,85),'Modelos originais · Blender 4.3.2 · Mesma geometria e atlas exportados para Bedrock',font=small,fill='#675e55')
manifest={'renderer':'Blender 4.3.2 / Cycles CPU / 96 spp / 1200² / AgX Medium High Contrast','limitation':'Diagnostic rendering, not Minecraft engine acceptance','images':{}}
for row,key in enumerate(['missal','pontifical']):
 y=150+row*650
 for col,view in enumerate(['closed','open','detail']):
  im=Image.open(ROOT/f'renders/{key}_{view}.png').convert('RGBA');im.thumbnail((540,540),Image.Resampling.LANCZOS);sheet.paste(im,(40+col*590,y),im)
  label={'closed':'Capa e lombada','open':'Páginas e marcadores','detail':'Encadernação e relevos'}[view]
  d.text((55+col*590,y+550),f'{key.title()}  ·  {label}',font=font,fill='#412b2b')
  p=ROOT/f'renders/{key}_{view}.png';manifest['images'][str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
 icon_source=ROOT/f'renders/{key}-item-256.png'
 im=Image.open(icon_source if icon_source.exists() else ROOT/f'renders/{key}_closed.png').convert('RGBA');im=im.resize((64,64),Image.Resampling.LANCZOS);im.save(ROOT/f'renders/{key}-item-64.png')
d.text((55,1465),'Inspeção visual fora do jogo. Teste no Minecraft, porte em mãos e Content Log ainda necessários.',font=small,fill='#675e55')
sheet.save(ROOT/'renders/liturgical-books-contact-sheet.png',optimize=True)
(ROOT/'reports/render-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Contact sheet, 64px icons and render provenance prepared.')

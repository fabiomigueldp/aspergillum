from pathlib import Path
from PIL import Image
import json,zlib,base64
ROOT=Path(__file__).resolve().parents[1]
AUTHOR=ROOT if (ROOT/'missal.author.json').exists() else ROOT/'source'
report={'checks':[]}
for key in ['missal','pontifical']:
 spec=json.loads((AUTHOR/f'{key}.author.json').read_text());pal=json.loads((AUTHOR/f'{key}.palette.json').read_text());raw=zlib.decompress(base64.b64decode(pal['data']))
 color=Image.open(ROOT/f'bedrock/textures/entity/{key}.png');mer=Image.open(ROOT/f'bedrock/textures/entity/{key}_mer.png');normal=Image.open(ROOT/f'bedrock/textures/entity/{key}_normal.png')
 for im in [color,mer,normal]:assert im.mode=='RGBA' and im.size==(256,256)
 for surface,(u,v,w,h) in spec['tiles'].items():
  for y in range(-2,h+2):
   for x in range(-2,w+2):
    px=u+max(0,min(w-1,x));py=v+max(0,min(h-1,y));i=(py*256+px)*5;p=(u+x,v+y)
    assert color.getpixel(p)==tuple(raw[i:i+3])+(255,),f'{key}/{surface}: color mismatch {p}'
    assert mer.getpixel(p)==(raw[i+3],0,raw[i+4],255),f'{key}/{surface}: MER mismatch {p}'
    assert normal.getpixel(p)==(128,128,255,255),f'{key}/{surface}: normal mismatch {p}'
 report['checks'].append({'model':key,'status':'pass','checks':'RGBA size, atlas/palette exact color+MER match, neutral normal, all two-pixel extrusion samples'})
(ROOT/'reports/texture-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('Texture, PBR and padding pixel parity: 2/2 passed.')

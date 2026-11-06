"""Original Evangeliarium liturgical books, procedural pixel art and Bedrock cuboids.
Run with CPython + Pillow. No downloaded art, font, geometry or content.
"""
from pathlib import Path
import json, math, hashlib, zlib, base64
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
AUTHOR=ROOT if (ROOT/'missal.author.json').exists() else ROOT/'source'
for p in [AUTHOR,ROOT/'bedrock/models/entity',ROOT/'bedrock/textures/entity',ROOT/'renders',ROOT/'blender',ROOT/'reports']:p.mkdir(parents=True,exist_ok=True)
SIZE=256
TILES={'front':[2,2,64,96],'back':[70,2,64,96],'leftPage':[138,2,52,88],'rightPage':[194,2,52,88], 'spine':[2,104,16,96],'edge':[22,104,64,12],'leather':[22,122,16,16],'gold':[42,122,16,16], 'paper':[62,122,16,16],'ribbon_red':[82,122,8,48],'lining':[94,104,52,88], 'ribbon_green':[150,104,8,48],'ribbon_gold':[162,104,8,48],'ribbon_blue':[174,104,8,48], 'ribbon_violet':[186,104,8,48], 'tab':[198,104,12,12], 'headband':[214,104,16,8], 'edgeTall':[234,104,12,96],'hinge':[214,118,16,16]}
# Author-drawn 3x5 pixel capitals. These are labels, not rasterized liturgical text.
FONT={'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],'C':['011','100','100','100','011'],'D':['110','101','101','101','110'],'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],'I':['111','010','010','010','111'],'L':['100','100','100','100','111'],'M':['101','111','111','101','101'],'N':['101','111','111','111','101'],'O':['010','101','101','101','010'],'P':['110','101','110','100','100'],'R':['110','101','110','101','101'],'S':['011','100','010','001','110'],'T':['111','010','010','010','010'],'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],'X':['101','101','010','101','101'],' ':['000']*5}
CONFIG={'missal':{'title':'MISSALE','subtitle':'ROMANUM','color':[103,27,30],'lining':[124,49,40],'width':3.90,'height':5.65,'thickness':1.44,'ribbons':['red','green','gold','blue','violet']},'pontifical':{'title':'PONTIFICALE','subtitle':'ROMANUM','color':[61,23,42],'lining':[83,40,55],'width':3.70,'height':5.55,'thickness':.96,'ribbons':['red','gold','violet']}}
CONFIG['lectionary']={'title':'LECTIONARIUM','subtitle':'MISSAE','color':[24,70,57],'lining':[38,82,66],'width':3.90,'height':5.65,'thickness':1.18,'ribbons':['red','gold','green']}
def dump(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def pxtext(d,text,y,color,w=64):
 start=(w-(len(text)*4-1))//2
 for j,c in enumerate(text):
  for yy,row in enumerate(FONT[c]):
   for xx,v in enumerate(row):
    if v=='1':d.point((start+j*4+xx,y+yy),fill=color)
def build_texture(key,cfg):
 color=Image.new('RGBA',(SIZE,SIZE),(0,0,0,255));mer=Image.new('RGBA',(SIZE,SIZE),(0,0,220,255));normal=Image.new('RGBA',(SIZE,SIZE),(128,128,255,255))
 masks={}
 for surface,(u,v,w,h) in TILES.items():
  tile=Image.new('RGB',(w,h));metal=Image.new('L',(w,h),0);rough=Image.new('L',(w,h),205)
  gold=(190,146,65);lightgold=(220,182,99);darkgold=(137,94,36)
  for y in range(h):
   for x in range(w):
    n=((x*73+y*179+x*y*19)%17-8)/3
    base=cfg['color']
    if surface in ['paper','edge','edgeTall','leftPage','rightPage']:base=[232,222,197]
    elif surface=='lining':base=cfg['lining']
    elif surface=='hinge':base=[36,27,25]
    elif surface=='gold':base=gold
    elif surface=='headband':base=gold if x%4<2 else cfg['color']
    elif surface.startswith('ribbon_'):
     base={'red':[149,36,42],'green':[44,95,66],'gold':[186,138,48],'blue':[43,70,104],'violet':[99,55,107]}[surface[7:]]
     if x in [1,w-2]:base=gold
    elif surface=='tab':base=[174,132,75] # Matte index cloth, not a brass button.
    if surface in ['edge','edgeTall']:
     # Texture Y follows depth on fore-edge; fine, deterministic gatherings.
     q=x if surface=='edgeTall' else y
     base=[v-(12 if q%3==0 else 0)-(4 if q%7==0 else 0) for v in base]
    tile.putpixel((x,y),tuple(max(0,min(255,round(v+n))) for v in base))
    if surface=='gold':metal.putpixel((x,y),226);rough.putpixel((x,y),106)
  d=ImageDraw.Draw(tile);m=ImageDraw.Draw(metal);r=ImageDraw.Draw(rough)
  def stroke(points,fill=gold,width=1):
   d.line(points,fill=fill,width=width);m.line(points,fill=222,width=width);r.line(points,fill=114,width=width)
  def rect(box,fill=gold):
   d.rectangle(box,outline=fill);m.rectangle(box,outline=222);r.rectangle(box,outline=114)
  if surface in ['front','back']:
   rect([4,5,w-5,h-6]);rect([7,8,w-8,h-9],darkgold)
   # Blind tooling in the leather field and protected brass corner medallions.
   for x in [11,w-12]:
    for y in [13,h-14]:
     stroke([(x-2,y),(x,y-2),(x+2,y),(x,y+2),(x-2,y)],darkgold)
   if surface=='front':
    pxtext(d,cfg['title'],18,lightgold);pxtext(m,cfg['title'],18,222);pxtext(r,cfg['title'],18,114)
    pxtext(d,cfg['subtitle'],26,gold);pxtext(m,cfg['subtitle'],26,222);pxtext(r,cfg['subtitle'],26,114)
    if key=='missal':
     # Rectangular Roman cross and a restrained mandorla, not Gospel symbols.
     stroke([(32,36),(46,51),(46,60),(32,75),(17,60),(17,51),(32,36)],darkgold)
     stroke([(32,34),(49,51),(49,61),(32,78),(14,61),(14,51),(32,34)],gold)
     for x,y in [(13,37),(50,37),(13,76),(50,76)]:
      stroke([(x-1,y),(x+1,y)]);stroke([(x,y-1),(x,y+1)])
    elif key=='lectionary':
     # Open book and radiant cross: original mark of proclaimed Scripture.
     stroke([(32,39),(32,52)],gold,2);stroke([(27,44),(37,44)],gold,2)
     for x,y in [(22,43),(42,43),(25,36),(39,36)]:stroke([(x,y),(x+(1 if x>32 else -1),y-2)],darkgold)
     stroke([(13,57),(22,54),(32,58),(42,54),(51,57),(51,73),(42,70),(32,75),(22,70),(13,73),(13,57)],gold)
     stroke([(32,58),(32,74)],lightgold)
     for yy in [60,64,68]:
      stroke([(17,yy),(23,yy-1),(28,yy+1)],darkgold);stroke([(36,yy+1),(42,yy-1),(47,yy)],darkgold)
    else:
     # Episcopal mitre, two infulae and crozier. Original stylized insignia.
     poly=[(21,55),(22,44),(27,36),(32,40),(37,36),(42,44),(43,55)]
     d.polygon(poly,fill=gold);m.polygon(poly,fill=226);r.polygon(poly,fill=106)
     d.line([(24,52),(25,45),(28,40),(32,44),(36,40),(39,45),(40,52)],fill=darkgold)
     d.rectangle([23,51,41,53],fill=lightgold)
     stroke([(28,57),(25,68),(29,66)],gold,2);stroke([(36,57),(39,68),(35,66)],gold,2)
     stroke([(16,71),(16,49),(12,45),(12,40),(16,37),(20,40),(20,43),(17,44)],gold)
     stroke([(45,71),(45,38)],gold);stroke([(41,42),(49,42)],gold)
     stroke([(22,77),(42,77)],darkgold)
   else:
    # Rear blind stamped cross and corner flourishes distinguish orientation.
    stroke([(32,36),(32,61)],darkgold,2);stroke([(24,43),(40,43)],darkgold,2)
    stroke([(19,69),(32,73),(45,69)],darkgold)
  elif surface=='spine':
   for yy in [8,10,28,30,65,67,84,86]:stroke([(2,yy),(w-3,yy)])
   for xx in [2,w-3]:stroke([(xx,4),(xx,h-5)],darkgold)
   stroke([(8,39),(8,54)],gold,2);stroke([(4,44),(12,44)],gold,2)
  elif surface=='lining':
   for yy in range(4,h,8):
    for xx in range(4,w,8):
     d.line([(xx-2,yy),(xx,yy-2),(xx+2,yy),(xx,yy+2),(xx-2,yy)],fill=tuple(v+7 for v in cfg['lining']))
   d.rectangle([3,3,w-4,h-4],outline=tuple(v+12 for v in cfg['lining']))
  elif surface in ['leftPage','rightPage']:
   # Decorative glyph-length strokes only: no claim to reproduce a liturgical page.
   gutter_right=surface=='leftPage'
   for x in range(5):
    xx=w-1-x if gutter_right else x
    d.line([(xx,0),(xx,h)],fill=(214+x*3,204+x*3,179+x*3))
   ink=(91,76,60);rubric=(145,45,43)
   d.line([(15,7),(w-15,7)],fill=rubric)
   columns=[(7,24),(28,45)] if key=='missal' else [(8,44)]
   for ci,(a,b) in enumerate(columns):
    for row,yy in enumerate(range(17,h-13,4)):
     cutoff=(row*7+ci*3+(surface=='leftPage')*5)%6
     linecol=rubric if row in [0,6] else ink
     d.line([(a,yy),(b-cutoff,yy)],fill=linecol)
     for gap in range(a+4,b-cutoff,6):d.point((gap,yy),fill=(232,222,197))
   d.rectangle([7,12,10,17],outline=rubric)
   d.line([(w//2-1,h-6),(w//2+1,h-6)],fill=ink)
  for yy in range(-2,h+2):
   for xx in range(-2,w+2):
    q=(min(w-1,max(0,xx)),min(h-1,max(0,yy)));color.putpixel((u+xx,v+yy),tile.getpixel(q)+(255,));mer.putpixel((u+xx,v+yy),(metal.getpixel(q),0,rough.getpixel(q),255))
    # Subtle leather grain only, embossed ink retained in the color/MER masks.
    n=((q[0]*73+q[1]*179+q[0]*q[1]*19)%17-8)
    strength=0
    normal.putpixel((u+xx,v+yy),(128+strength*(n%3-1),128+strength*((n//3)%3-1),255,255))
  masks[surface]=[u,v,w,h]
 raw = bytearray()
 for y in range(SIZE):
  for x in range(SIZE):
   raw.extend(color.getpixel((x,y))[:3]); raw.extend([mer.getpixel((x,y))[0],mer.getpixel((x,y))[2]])
 dump(AUTHOR/f'{key}.palette.json',{'codec':'zlib-base64-rgb-metal-rough','width':SIZE,'data':base64.b64encode(zlib.compress(bytes(raw),9)).decode('ascii')})
 for suffix,img in [('',color),('_mer',mer),('_normal',normal)]:img.save(ROOT/f'bedrock/textures/entity/{key}{suffix}.png',optimize=True)
 dump(ROOT/f'bedrock/textures/entity/{key}.texture_set.json',{'format_version':'1.16.100','minecraft:texture_set':{'color':key,'normal':key+'_normal','metalness_emissive_roughness':key+'_mer'}})
 # Clean UV inspection sheet without altering atlas pixels.
 sheet=color.convert('RGB').resize((1024,1024),Image.Resampling.NEAREST);sd=ImageDraw.Draw(sheet)
 for name,(u,v,w,h) in TILES.items():sd.rectangle([u*4,v*4,(u+w)*4,(v+h)*4],outline='#4ca2bb')
 sheet.save(ROOT/f'renders/{key}_atlas.png')
def author(key,cfg):
 t=cfg['thickness'];half=t/2;inner=half-.16
 bones=[{'name':'spine','parent':'book_action','pivot':[0,0,0],'cubes':[]},{'name':'binding_shell','parent':'spine','pivot':[.05,0,round(half-.18,6)],'cubes':[]},{'name':'back_cover','parent':'spine','pivot':[0,0,0],'cubes':[]},{'name':'front_cover','parent':'spine','pivot':[0,0,0],'cubes':[]},{'name':'right_pages','parent':'back_cover','pivot':[0,0,0],'cubes':[]},{'name':'left_pages','parent':'front_cover','pivot':[0,0,0],'cubes':[]},{'name':'ribbons','parent':'right_pages','pivot':[0,6.8,0],'cubes':[]},{'name':'ribbon_tips','parent':'ribbons','pivot':[0,.18,-.012],'cubes':[]}]
 depths={'red':.10,'green':.17,'gold':.24,'blue':.31,'violet':.40} if key=='missal' else {'red':.10,'gold':.21,'violet':.31}
 if key=='lectionary':depths={'red':.10,'gold':.21,'green':.31}
 depths={color:round(depth*inner/(.50 if key=='missal' else .40),6) for color,depth in depths.items()}
 for color in ['red','green','gold','blue','violet']:
  bones.append({'name':f'ribbon_tip_{color}','parent':'ribbon_tips','pivot':[0,.18,depths.get(color,.20)],'cubes':[]})
 by={b['name']:b for b in bones}
 def add(b,n,o,s,mat='leather',faces=None,omit=()):
  cube={'name':n,'origin':o,'size':s,'surface':mat,'faces':faces or {}}
  if omit:cube['omit']=list(omit)
  by[b]['cubes'].append(cube)
 # Leather end caps avoid compressing a full-height stamped spine onto the head/tail.
 add('binding_shell','Stepped binding core',[-.18,-.015,-half+.02],[.26,7.03,t-.04],'spine',{'up':'leather','down':'leather'})
 add('binding_shell','Spine crown',[-.23,.05,-half+.10],[.08,6.90,t-.20],'spine',{'up':'leather','down':'leather'},omit=['east'])
 add('back_cover','Back board',[0,0,inner],[5,7,.16],'leather',{'south':'back','north':'lining'})
 add('front_cover','Front board',[0,0,-half],[5,7,.16],'leather',{'north':'front','south':'lining'})
 # Brass corners: two narrow arms, no overlapping face or coplanar flashing.
 for b in ['front_cover','back_cover']:
  z=-half-.055 if b=='front_cover' else half
  inner_face='south' if b=='front_cover' else 'north'
  for side in [0,1]:
   for top in [0,1]:
    x=.10 if side==0 else 4.37;y=.10 if top==0 else 6.78
    add(b,f'Corner {side}{top} horizontal',[x,y,z],[.53,.12,.055],'gold',omit=[inner_face])
    vx=.10 if side==0 else 4.78;vy=.22 if top==0 else 6.37
    add(b,f'Corner {side}{top} vertical',[vx,vy,z],[.12,.41,.055],'gold',omit=[inner_face])
 for y in [.64,2.04,4.80,6.20]:
  add('binding_shell',f'Raised spine band {y}',[-.275,y,-half+.06],[.06,.13,t-.12],'gold')
 # Each half has three physically tiered signatures. Internal coincident faces removed.
 depth=(inner-.025)/3
 for left,b in [(False,'right_pages'),(True,'left_pages')]:
  for i in range(3):
   z=(.025+i*depth) if not left else (-.025-(i+1)*depth)
   inset=(2-i)*.015;x=.16;y=.18+inset
   faces={'east':'edgeTall','west':'edgeTall'};omit=[]
   if i==0:faces['south' if left else 'north']='leftPage' if left else 'rightPage'
   else:faces['south' if left else 'north']='paper'
   omit.append('north' if left else 'south')
   add(b,f'{"Left" if left else "Right"} signature {i+1}',[x,y,z],[4.68-inset,6.64-2*inset,depth],'edge',faces,omit)
  # Gutter joint adjoining the main block, not coincident with its edge.
  for j in range(3):
   top=.045-j*.010
   add(b,f'Sewn gutter fold {j+1}',[.07+j*.03,.21,-inner if left else top],[.03,6.58,inner-top],'paper',omit=['east', 'north' if left else 'south'])
 for y in [.19,6.70]:add('binding_shell',f'Woven headband {y}',[-.02,y,-inner],[.12,.10,inner*2],'headband')
 # A narrow, recessed inner hinge replaces the upright outer spine in an open book.
 add('spine','Recessed cloth hinge',[-.05,.21,.045],[.10,6.58,.085],'hinge')
 # Raised central ornament reinforces recognition at inventory distance.
 if key=='missal':
  z=-half-.075
  add('front_cover','Cross stem',[2.36,1.72,z],[.28,2.7,.075],'gold',omit=['south'])
  # Three parts meet edge to edge, avoiding intersecting duplicate faces.
  add('front_cover','Cross arm left',[1.55,3.55,z],[.81,.26,.075],'gold',omit=['south','east'])
  add('front_cover','Cross arm right',[2.64,3.55,z],[.81,.26,.075],'gold',omit=['south','west'])
  # Insert tabs into the signatures; keep their outer tip at x=5.13.
  for i,(x,y) in enumerate([(4.72,2.7),(4.72,3.55),(4.72,4.4),(4.72,5.25)]):
   add('right_pages',f'Fore-edge index {i+1}',[x,y,.18+i*.05],[.41,.32,.025],'tab')
 elif key=='lectionary':
  # Restrained raised cross; the open-book emblem remains gold-blocked leather.
  z=-half-.055
  add('front_cover','Scripture cross stem',[2.42,3.20,z],[.16,.94,.055],'gold',omit=['south'])
  add('front_cover','Scripture cross left',[2.08,3.68,z],[.34,.14,.055],'gold',omit=['south','east'])
  add('front_cover','Scripture cross right',[2.58,3.68,z],[.34,.14,.055],'gold',omit=['south','west'])
 else:
  # Three stepped volumes at the mitre base; cap and infulae are stamped pixels.
  z=-half-.055
  add('front_cover','Mitre lower band',[1.73,2.96,z],[1.54,.16,.055],'gold',omit=['south'])
  add('front_cover','Mitre central orphrey',[2.42,3.12,z],[.16,.88,.055],'gold',omit=['south'])
 # Bookmarks are stored between leaves. Only short tails emerge below the page edge.
 # Every color has its own hinge depth, so all five Missal tips remain connected.
 for i,c in enumerate(cfg['ribbons']):
  x=.84+i*(.67 if key=='missal' else 1.12);bottom=-.12-(i%3)*.06;depth=depths[c]
  add('ribbons',f'Silk marker {c}',[x,.18,depth],[.10,6.52,.020],f'ribbon_{c}',omit=['down'])
  add(f'ribbon_tip_{c}',f'Stored marker tip {c}',[x,bottom,depth],[.10,.18-bottom,.020],f'ribbon_{c}',omit=['up'])
 # Scale the established cover artwork and signature layout to each measured plan.
 scale=[cfg['width']/5,cfg['height']/7,1]
 for bone in bones:
  bone['pivot']=[round(v*scale[i],6) for i,v in enumerate(bone['pivot'])]
  for c in bone['cubes']:
   for field in ['origin','size']:c[field]=[round(v*scale[i],6) for i,v in enumerate(c[field])]
 return bones
def geometry(key,bones,kind):
 import copy
 bs=copy.deepcopy(bones)
 if kind=='open':
  shell=next(b for b in bs if b['name']=='binding_shell')
  for c in shell['cubes']:c['origin'][0]=shell['pivot'][0]+(c['origin'][0]-shell['pivot'][0])*.3;c['size'][0]*=.3
 held=kind=='held';offset=[-6,24,1] if held else [0,CONFIG[key]['thickness']/2+.08,-CONFIG[key]['height']/2]
 for b in bs:
  b['pivot']=[round(v+offset[i],6) for i,v in enumerate(b['pivot'])]
  cubes=[]
  for c in b['cubes']:
   uv={f:{'uv':TILES[c['faces'].get(f,c['surface'])][:2],'uv_size':TILES[c['faces'].get(f,c['surface'])][2:]} for f in ['north','south','east','west','up','down'] if f not in c.get('omit',[])}
   cubes.append({'origin':[round(v+offset[i],6) for i,v in enumerate(c['origin'])],'size':[round(v,6) for v in c['size']],'uv':uv})
  b['cubes']=cubes
 if held:
  bs=[{'name':'evangeliarium_bound','pivot':[0,0,0],'binding':'q.item_slot_to_bone_name(context.item_slot)'},{'name':'book_presentation','parent':'evangeliarium_bound','pivot':offset},{'name':'book_action','parent':'book_presentation','pivot':offset}]+bs
 else:
  bs=[{'name':'book_presentation','pivot':offset,'rotation':[-90,0,0]},{'name':'book_action','parent':'book_presentation','pivot':offset}]+bs
  if kind=='open':
   for name,rotation in [('front_cover',[0,177,0]),('binding_shell',[0,90,0]),('ribbon_tips',[0,0,0])]:next(b for b in bs if b['name']==name)['rotation']=rotation
   for b in bs:
    if b['name'].startswith('ribbon_tip_'):b['rotation']=[18,0,0]
 return {'format_version':'1.16.0','minecraft:geometry':[{'description':{'identifier':f'geometry.evangeliarium.{key}.{kind}','texture_width':SIZE,'texture_height':SIZE,'visible_bounds_width':2,'visible_bounds_height':2.5,'visible_bounds_offset':[0,1.7 if held else .5,0]},'bones':bs}]}
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--book',choices=list(CONFIG));args=parser.parse_args()
for key,cfg in CONFIG.items():
 if args.book and key!=args.book:continue
 build_texture(key,cfg);bones=author(key,cfg)
 dump(AUTHOR/f'{key}.author.json',{'schema':1,'name':key,'atlasSize':SIZE,'tiles':TILES,'configuration':cfg,'bones':bones})
 for kind in ['held','closed','open','animated']:dump(ROOT/f'bedrock/models/entity/{key}_{kind}.geo.json',geometry(key,bones,kind))
print('Generated original cuboids and 256-square color, MER and normal maps.')

"""Technical color-only preview; no browser, GPU, network or external process."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
def camera_basis(vector):
 # direction is centre -> camera. The basis must have determinant +1;
 # crossing in the opposite order would mirror lettering and every world X.
 direction=np.array(vector,float);direction/=np.linalg.norm(direction)
 right=np.cross([0,1,0],direction);right/=np.linalg.norm(right);up=np.cross(direction,right)
 assert np.linalg.det(np.stack([right,up,direction]))>.999999
 return right,up,direction

if sys.argv[1:]==['--test-camera']:
 for vector in [[0,.02,-1],[0,.02,1],[-.45,.28,-1],[1,.18,.3],[-.65,-.5,-1]]:
  r,u,d=camera_basis(vector)
  assert abs(r@u)<1e-9 and abs(r@d)<1e-9 and abs(u@d)<1e-9
  assert u[1]>0 # screen Y uses minus this projection: world +Y is up
  if vector[0]==0:assert (r[0]<0)==(vector[2]<0)
 print('CPU camera: 5 right-handed bases; north +X left, south +X right, +Y up.')
 sys.exit(0)

s=json.loads(Path(sys.argv[1]).read_text()); W,H=2000,1100
image=np.zeros((H,W,3),dtype=np.float64);image[:]=[232,227,215];zbuffer=np.full((H,W),-np.inf)
right,up,direction=camera_basis(s['direction'])
center=np.array(s.get('center',[(s['w']-1)/2,.50,(s['d']-1)/2]))
allpts=np.array([p for t in s['triangles'] for p in t['points']]);proj=np.stack([(allpts-center)@right,(allpts-center)@up],1)
frame=s.get('frame',[np.ptp(proj[:,0]),np.ptp(proj[:,1])]);scale=min((W-220)/frame[0],(H-270)/frame[1]);offset=np.array([W/2,H/2+55])
light=np.array([-.4,.85,-.55]);light/=np.linalg.norm(light)
textures={}
for t in s['triangles']:
 p=np.array(t['points']);uv=np.array(t['uv']);pp=p-center
 screen=np.stack([pp@right,-pp@up],1)*scale+offset;depth=pp@direction
 a,b,c=screen;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
 if abs(den)<1e-8:continue
 x0=max(0,int(np.floor(screen[:,0].min())));x1=min(W-1,int(np.ceil(screen[:,0].max())))
 y0=max(0,int(np.floor(screen[:,1].min())));y1=min(H-1,int(np.ceil(screen[:,1].max())))
 if x0>x1 or y0>y1:continue
 xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
 w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
 w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1
 inside=(w0>=-1e-7)&(w1>=-1e-7)&(w2>=-1e-7)
 zz=w0*depth[0]+w1*depth[1]+w2*depth[2];zview=zbuffer[y0:y1+1,x0:x1+1];mask=inside&(zz>zview+1e-9)
 if not np.any(mask):continue
 f=t['texture']
 if f not in textures:textures[f]=np.array(Image.open(f).convert('RGBA'))
 tex=textures[f];th,tw=tex.shape[:2]
 u=w0*uv[0,0]+w1*uv[1,0]+w2*uv[2,0];v=w0*uv[0,1]+w1*uv[1,1]+w2*uv[2,1]
 tx=np.minimum(tw-1,np.maximum(0,(u*tw).astype(int)));ty=np.minimum(th-1,np.maximum(0,((1-v)*th).astype(int)))
 samples=tex[ty,tx];mask&=samples[:,:,3]>=128
 n=np.cross(p[1]-p[0],p[2]-p[0]);n/=np.linalg.norm(n)
 if n@direction<0:n=-n
 shade=.65+.45*max(0,float(n@light));rgb=np.minimum(255,samples[:,:,:3]*shade)
 image[y0:y1+1,x0:x1+1][mask]=rgb[mask];zview[mask]=zz[mask]
im=Image.fromarray(image.astype('uint8'));draw=ImageDraw.Draw(im)
try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',32);small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
except OSError:font=small=ImageFont.load_default()
draw.text((64,42),s.get('title','ALTARE  /  CRUZETA EM NOGUEIRA'),fill=(55,44,33),font=font)
label={'none':'Sem toalha','linen_short':'Linho curto','linen_long':'Linho longo','gold_short':'Linho dourado curto','gold_long':'Linho dourado longo','floral':'Floral IHS','lace':'Renda floral','agnus':'Agnus Dei','verdant':'Verdante','requiem':'Réquiem'}.get(s['textile'],s['textile'])
if s['textile']=='floral':label+=' '+{'white':'branco','red':'vermelho','green':'verde','purple':'roxo','rose':'rosa','black':'preto','gold':'dourado','silver':'prateado'}.get(s.get('color','red'),s.get('color','red'))
draw.text((64,90),s.get('subtitle',f"Altare {s.get('version','0.12.0')}  ·  {s['w']} × {s['d']} módulos  ·  {label}  ·  geometria e mapas reais do pacote"),fill=(100,88,71),font=small)
draw.text((64,H-48),s.get('footer','PRÉVIA TÉCNICA CPU · iluminação simplificada · não é captura do Minecraft'),fill=(105,90,73),font=small)
im.save(sys.argv[2]);print(sys.argv[2])

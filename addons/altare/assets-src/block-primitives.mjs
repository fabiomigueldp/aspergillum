// Production source. One unit = 1/16 block; top is always exactly 16.
export const TEXTURE_SIZE=128;
export const faces=['north','east','south','west','up','down'];
// Author in world axes (east=+X, south=+Z), then serialize the Bedrock model basis.
// See docs/VISUAL_POLISH_0.1.3.md and Blockbench's compileCube, pinned there.
export const serializeCube=cube=>{
 const c=structuredClone(cube);
 c.origin[0]=-(c.origin[0]+c.size[0]);
 if(c.pivot)c.pivot[0]*=-1;
 if(c.rotation)c.rotation=[-c.rotation[0],-c.rotation[1],c.rotation[2]];
 return c;
};
export const rect=(surface,u=0,v=0,w=128,h=128)=>({uv:[u,v],uv_size:[w,h],material_instance:surface});
export function box(origin,size,surface,overrides={}){
 const [x,y,z]=size;
 const face=(a,b)=>rect(surface,0,0,Math.max(1,Math.round(a*8)),Math.max(1,Math.round(b*8)));
 return {origin,size,uv:{north:face(x,y),south:face(x,y),east:face(z,y),west:face(z,y),up:face(x,z),down:face(x,z),...overrides}};
}
// Quarter turns only: author transforms positions/UVs, never hand-edit generated geometry.
export function rotateCube(cube,direction){
 const turn=direction%4;
 if(!turn)return structuredClone(cube);
 const c=structuredClone(cube),[x,y,z]=c.origin,[w,h,d]=c.size;
 if(turn===1){c.origin=[-z-d,y,x];c.size=[d,h,w];}
 if(turn===2){c.origin=[-x-w,y,-z-d];}
 if(turn===3){c.origin=[z,y,-x-w];c.size=[d,h,w];}
 if(c.pivot){const [px,py,pz]=c.pivot;c.pivot=turn===1?[-pz,py,px]:turn===2?[-px,py,-pz]:[pz,py,-px];}
 const names=['north','east','south','west'];const uv={};if(c.uv.up)uv.up=c.uv.up;if(c.uv.down)uv.down=c.uv.down;
 for(let i=0;i<4;i++)if(c.uv[names[i]])uv[names[(i+turn)%4]]=c.uv[names[i]];
 c.uv=uv;return c;
}

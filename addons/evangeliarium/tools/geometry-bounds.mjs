/** Canonical Bedrock XYZ authored rotations; X/Z signs match the shared viewer. */
export function geometryVertices(geometry){
 const by=new Map(geometry.bones.map(b=>[b.name,b]));
 const apply=(p,pivot=[0,0,0],rotation=[0,0,0])=>{
  let v=p.map((n,i)=>n-pivot[i]);
  for(let axis=0;axis<3;axis++){
   const a=rotation[axis]*Math.PI/180*(axis===1?1:-1),c=Math.cos(a),s=Math.sin(a),[x,y,z]=v;
   v=axis===0?[x,c*y-s*z,s*y+c*z]:axis===1?[c*x+s*z,y,-s*x+c*z]:[c*x-s*y,s*x+c*y,z];
  }return v.map((n,i)=>n+pivot[i]);
 };
 const points=[];
 for(const bone of geometry.bones)for(const cube of bone.cubes??[])for(let corner=0;corner<8;corner++){
  const inflate=cube.inflate??0;
  let p=cube.origin.map((n,i)=>n-inflate+((corner>>i)&1)*(cube.size[i]+inflate*2));
  if(cube.rotation)p=apply(p,cube.pivot??cube.origin.map((n,i)=>n+cube.size[i]/2),cube.rotation);
  const visited=new Set();
  for(let b=bone;b;b=by.get(b.parent)){
   if(visited.has(b.name))throw Error('Geometry hierarchy cycle');visited.add(b.name);
   p=apply(p,b.pivot,b.rotation);
  }points.push(p);
 }
 if(!points.length)throw Error('Cannot select empty geometry');return points;
}
export function selectionBox(geometry,margin=.15){
 const points=geometryVertices(geometry);
 const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))-margin);
 const max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))+margin);
 min[1]=Math.max(0,min[1]);
 // Round outward so JSON precision never trims the rendered bounds.
 const origin=min.map(n=>Math.floor(n*10000)/10000);
 const end=max.map(n=>Math.ceil(n*10000)/10000);
 if(origin.some((n,i)=>n<(i===1?0:-8))||end.some((n,i)=>n>(i===1?16:8)))throw Error('Book selection exceeds one-block component bounds');
 return{origin,size:end.map((n,i)=>Math.round((n-origin[i])*10000)/10000)};
}

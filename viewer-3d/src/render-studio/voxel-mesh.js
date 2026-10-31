import * as THREE from 'three';
import {BLOCKS,SHAPES,blockKey,isOpaqueBlock,subtractRectangle} from './voxel-blocks.js';
import {REMOVABLE_LAYERS} from './scene-layout.js';

const FACES=[
  {name:'east',n:[1,0,0],u:[0,0,-1],v:[0,1,0],shade:.6},
  {name:'west',n:[-1,0,0],u:[0,0,1],v:[0,1,0],shade:.6},
  {name:'up',n:[0,1,0],u:[1,0,0],v:[0,0,-1],shade:1},
  {name:'down',n:[0,-1,0],u:[1,0,0],v:[0,0,1],shade:.5},
  {name:'south',n:[0,0,1],u:[1,0,0],v:[0,1,0],shade:.8},
  {name:'north',n:[0,0,-1],u:[-1,0,0],v:[0,1,0],shade:.8},
].map(f=>({...f,axis:f.n.findIndex(Boolean),uAxis:f.u.findIndex(Boolean),vAxis:f.v.findIndex(Boolean)}));

export function meshVoxelPlan(plan,materials,lighting='classic') {
  const root=new THREE.Group(),batches=new Map(),occupied=new Map(plan.cells.map(c=>[blockKey(c.x,c.y,c.z),c]));
  const solid=(x,y,z)=>{const cell=occupied.get(blockKey(x,y,z));return cell?.shape==='cube'&&isOpaqueBlock(cell.block);};
  let faces=0;
  for(const c of plan.cells){
    const boxes=SHAPES[c.shape],spec=BLOCKS[c.block];
    for(const box of boxes)for(const f of FACES){
      const sign=f.n[f.axis],plane=box[f.axis+(sign>0?3:0)];
      const neighbor=occupied.get(blockKey(c.x+f.n[0],c.y+f.n[1],c.z+f.n[2]));
      const masks=boxes.filter(b=>b!==box);
      // Keep interfaces exposed when an occluding shell is hidden by a cutaway view.
      const canOcclude=neighbor&&(!REMOVABLE_LAYERS.has(neighbor.layer)||neighbor.layer===c.layer);
      if(canOcclude&&(isOpaqueBlock(neighbor.block)||neighbor.block===c.block)){
        masks.push(...SHAPES[neighbor.shape].map(b=>b.map((v,i)=>v+f.n[i%3])));
      }
      let rectangles=[[box[f.uAxis],box[f.vAxis],box[f.uAxis+3],box[f.vAxis+3]]];
      for(const mask of masks){
        const touches=sign>0?mask[f.axis]<=plane&&mask[f.axis+3]>plane:mask[f.axis]<plane&&mask[f.axis+3]>=plane;
        if(touches)rectangles=rectangles.flatMap(r=>subtractRectangle(r,[mask[f.uAxis],mask[f.vAxis],mask[f.uAxis+3],mask[f.vAxis+3]]));
      }
      const texture=spec[f.name]??spec.all??spec.side;
      if(!materials.has(texture))throw Error(`Textura vanilla não carregada: ${texture}`);
      if(!rectangles.length)continue;
      const key=texture+':'+(c.layer??'architecture');
      if(!batches.has(key))batches.set(key,{texture,layer:c.layer??'architecture',attributes:{position:[],normal:[],uv:[],color:[]}});
      const batch=batches.get(key).attributes;
      for(const rect of rectangles){
        const vertices=[];
        for(const [a,d]of [[-1,-1],[1,-1],[1,1],[-1,1]]){
          const local=[0,0,0];local[f.axis]=plane;
          local[f.uAxis]=rect[a*f.u[f.uAxis]>0?2:0];local[f.vAxis]=rect[d*f.v[f.vAxis]>0?3:1];
          let ao=1;
          if(c.shape==='cube'){
            const base=[c.x+f.n[0],c.y+f.n[1],c.z+f.n[2]],side=(axis,s)=>solid(...base.map((v,i)=>v+axis[i]*s));
            const s1=side(f.u,a),s2=side(f.v,d),corner=solid(...base.map((v,i)=>v+f.u[i]*a+f.v[i]*d));
            ao=1-(s1&&s2?3:Number(s1)+Number(s2)+Number(corner))*.085;
          }
          const shade=Math.pow(ao*(lighting==='classic'?f.shade:1),2.2);
          const uv=[f.u[f.uAxis]>0?local[f.uAxis]:1-local[f.uAxis],f.v[f.vAxis]>0?local[f.vAxis]:1-local[f.vAxis]];
          vertices.push({p:local.map((v,i)=>v+[c.x,c.y,c.z][i]+plan.offset[i]),uv,shade});
        }
        const indices=vertices[0].shade+vertices[2].shade>vertices[1].shade+vertices[3].shade?[0,1,3,1,2,3]:[0,1,2,0,2,3];
        for(const i of indices){const v=vertices[i];batch.position.push(...v.p);batch.normal.push(...f.n);batch.uv.push(...v.uv);batch.color.push(v.shade,v.shade,v.shade);}faces++;
      }
    }
  }
  for(const {texture,layer,attributes:data}of batches.values()){
    const geometry=new THREE.BufferGeometry();
    for(const [name,values]of Object.entries(data))geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='uv'?2:3));
    const mesh=new THREE.Mesh(geometry,materials.get(texture));mesh.castShadow=!mesh.material.transparent;mesh.receiveShadow=true;mesh.userData.layer=layer;root.add(mesh);
  }
  root.userData={blockCount:plan.cells.length,visibleFaces:faces,grid:1};
  return root;
}

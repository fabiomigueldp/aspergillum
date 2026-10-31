/** Construction and furnishing coordinates share one block grid; altar support is y=0. */
export function sanctuaryLayout(width,depth){
 const extra=Math.max(5,Math.ceil((15-width)/2)),left=-extra,right=width+extra-1;
 const back=depth+Math.max(8,Math.ceil((width+depth)*.8)),height=Math.max(8,Math.ceil(Math.max(width,depth)*1.1));
 const c1=Math.floor((width-1)/2),c2=Math.ceil((width-1)/2),windowLeft=Math.floor((left+c1-3)/2),windowRight=width-1-windowLeft;
 return {left,right,back,height,c1,c2,windowLeft,windowRight,
  floor:{nave:-1,sanctuary:0},platform:{left:left+1,right:right-1,front:-2,back:back-1},
  crossCell:back-2,statueCell:windowLeft,
  chairCells:[windowRight-3,windowRight-1,windowRight+1].map(x=>[x,back-3]),
  amboCell:[left+1,-1],credence:[width/2+2.5,0,depth/2+1.2],
 };
}

export const REMOVABLE_LAYERS=new Set(['roof','apse','wall-left','wall-right']);

/** A cutaway is a diagnostic view of the construction, not a change to its plan. */
export function sceneCutaway(view,position,layout,width,depth,environment){
 if(environment==='transparent')return [];
 const result=[];
 if(environment!=='studio'&&(view==='top'||position[1]>=layout.height))result.push('roof');
 if(environment!=='studio'){
  if(view==='back'||position[2]>layout.back-depth/2)result.push('apse');
  // Include the near side wall in a rear section, even when the eye is just inside it.
  if(position[0]<layout.left+1.5-width/2||view==='back'&&position[0]<0)result.push('wall-left');
  if(position[0]>layout.right-.5-width/2||view==='back'&&position[0]>0)result.push('wall-right');
 }
 return result;
}

// Share identical component values across visual poses. State count and rendered
// output are unchanged; large material maps and collision boxes appear once.
export function posePermutations(layout,componentsForPose,suffix='') {
 const groups=new Map();let stride=1;
 const indexExpression='('+Object.entries(layout.states).map(([field,values])=>{
  const term=`q.block_state('${field}')${stride===1?'':` * ${stride}`}`;stride*=values.length;return term;
 }).join(' + ')+')';
 for(let index=0;index<layout.size;index++){
  const pose=layout.decode(layout.stateAt(index));
  for(const [component,value] of Object.entries(componentsForPose(pose))){
   const key=JSON.stringify([component,value]);
   if(!groups.has(key))groups.set(key,{component,value,indices:[]});
   groups.get(key).indices.push(index);
  }
 }
 return [...groups.values()].map(({component,value,indices})=>{
  const runs=[];
  for(const index of indices){const last=runs.at(-1);if(last&&last[1]===index-1)last[1]=index;else runs.push([index,index]);}
  const condition=indices.length===layout.size?'1':runs.map(([first,last])=>first===last?`${indexExpression} == ${first}`:`(${indexExpression} >= ${first} && ${indexExpression} <= ${last})`).join(' || ');
  return {condition:suffix?`(${condition}) && (${suffix})`:condition,components:{[component]:value}};
 });
}

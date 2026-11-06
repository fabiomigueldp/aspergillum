import {PNG} from 'pngjs';

/** Authoring source for the 32 px inventory sprite, not a rendered/retouched PNG.
 * A fan of textile samples and a brass embroidery needle: the existing tool's
 * purpose, with linen, burgundy and green from the altar's liturgical palette.
 * Integer pixels and binary alpha keep edges crisp in Bedrock's item atlas.
 */
export const FINISH_TOOL_SIZE=32;
export const FINISH_TOOL_PALETTE=Object.freeze({
 outline:'#302c28', greenShadow:'#243e35', green:'#39634b', greenLight:'#608269',
 redShadow:'#542c31', red:'#873e45', redLight:'#ae6262',
 linenShadow:'#aaa18a', linenFold:'#d4c9af', linen:'#e9e1cb', linenLight:'#fff5df',
 goldShadow:'#78512e', gold:'#b98b43', goldLight:'#ead18b', eye:'#4b4032',
});
export function createFinishToolIcon(){
 const icon=new PNG({width:FINISH_TOOL_SIZE,height:FINISH_TOOL_SIZE});
 const colors=Object.fromEntries(Object.entries(FINISH_TOOL_PALETTE).map(([k,hex])=>[k,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).concat(255)]));
 const dot=(x,y,c)=>icon.data.set(colors[c],(y*FINISH_TOOL_SIZE+x)*4);
 const rect=(x0,y0,x1,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)dot(x,y,c);};
 const polygon=(points,c)=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [a,b]=points[i],[u,v]=points[j];if((b>y+.5)!==(v>y+.5)&&x+.5<(u-a)*(y+.5-b)/(v-b)+a)inside=!inside;
  }if(inside)dot(x,y,c);
 }};
 // Three staggered swatches. Dark perimeter is shared, not a cast shadow halo.
 polygon([[3,11],[14,6],[22,23],[10,28]],'outline');
 polygon([[4,12],[13,8],[20,23],[10,26]],'green');
 polygon([[4,12],[13,8],[14,10],[5,14]],'greenLight');
 polygon([[8,21],[17,18],[20,23],[10,26]],'greenShadow');
 polygon([[7,6],[20,4],[24,24],[10,26]],'outline');
 polygon([[8,7],[19,6],[22,23],[11,24]],'red');
 polygon([[8,7],[19,6],[19,8],[9,9]],'redLight');
 polygon([[10,21],[21,20],[22,23],[11,24]],'redShadow');
 // Ivory cloth with folded top-right corner, warm hem and sparse woven marks.
 polygon([[11,10],[24,10],[28,14],[28,28],[11,28]],'outline');
 rect(12,11,23,26,'linen');rect(24,14,26,26,'linen');
 rect(12,11,22,11,'linenLight');rect(12,12,12,24,'linenLight');
 rect(13,25,26,26,'linenShadow');rect(13,25,25,25,'linenFold');
 rect(13,23,25,23,'goldShadow');rect(13,24,25,24,'gold');
 polygon([[23,11],[27,15],[23,15]],'linenShadow');
 polygon([[24,11],[27,14],[24,14]],'linenLight');
 dot(14,18,'linenFold');dot(14,20,'linenLight');dot(25,17,'linenFold');dot(24,21,'linenLight');
 // Small embroidered cross, subordinate to the tool silhouette.
 rect(20,16,21,21,'goldShadow');rect(18,18,23,19,'goldShadow');
 rect(20,16,20,20,'gold');rect(18,18,22,18,'gold');dot(20,16,'goldLight');
 // Diagonal brass needle with visible eye, bevel and a tapering point.
 polygon([[24,2],[27,2],[29,4],[29,6],[9,27],[6,29],[7,26],[23,4]],'outline');
 polygon([[24,3],[26,3],[28,5],[27,7],[9,26],[8,27],[9,24]],'goldShadow');
 polygon([[24,3],[26,3],[27,5],[26,7],[9,25],[10,23]],'gold');
 for(let i=0;i<17;i++)dot(25-i,6+i,'goldLight');
 dot(25,4,'eye');dot(26,5,'eye');dot(24,3,'goldLight');dot(8,26,'goldLight');
 return icon;
}

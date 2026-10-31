/**
 * The shared viewer is authored for held items and deliberately preserves X.
 * Blocks need the canonical Bedrock import basis (Blockbench parseCube):
 * origin.x = -(origin.x + size.x), pivot.x *= -1, rotation.x/y *= -1.
 * Keep this bridge local: changing the attachable renderer would regress it.
 */
export function blockPreviewGeometry(geometry){
 const result=structuredClone(geometry);
 for(const bone of result.bones){
  if(bone.rotation?.some(Boolean))throw Error('Block preview does not support rotated parent bones');
  if(bone.pivot)bone.pivot[0]*=-1;
  for(const cube of bone.cubes??[]){
   cube.origin[0]=-(cube.origin[0]+cube.size[0]);
   if(cube.pivot)cube.pivot[0]*=-1;
   // Shared adapter flips X/Z rotation; feed it the equivalent block rotation.
   if(cube.rotation)cube.rotation=[cube.rotation[0],-cube.rotation[1],-cube.rotation[2]];
  }
 }
 return result;
}

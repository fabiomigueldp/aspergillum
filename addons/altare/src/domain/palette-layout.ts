export interface PaletteLayout {edges:number;frontal:number;facing:number}
// Public, append-only codebook. Local edge bits are N/E/S/W before facing rotation.
// Centres cannot touch just one lateral edge on odd widths; halves have one allowed end.
const masks=[15,...Array.from({length:15},(_,i)=>i)];
export const PALETTE_SHAPES:readonly Readonly<{edges:number;frontal:number}>[]=Object.freeze([
 ...masks.map(edges=>Object.freeze({edges,frontal:0})),
 ...[1,5,11,15].map(edges=>Object.freeze({edges,frontal:1})),
 ...[1,5,9,13].map(edges=>Object.freeze({edges,frontal:2})),
 ...[1,5,3,7].map(edges=>Object.freeze({edges,frontal:3})),
]);
export const PALETTE_STATES=112;
export function rotateEdges(edges:number,turns:number):number {
 const n=(turns%4+4)%4;return ((edges<<n)|(edges>>(4-n)))&15;
}
function indexFor(t:PaletteLayout):number {
 return PALETTE_SHAPES.findIndex(s=>s.edges===rotateEdges(t.edges,-t.facing)&&s.frontal===t.frontal);
}
export function encodePalette(t:PaletteLayout):Record<string,number> {
 if(!Number.isInteger(t.facing)||t.facing<0||t.facing>3||!Number.isInteger(t.edges)||t.edges<0||t.edges>15)throw Error('configuration');
 const index=indexFor(t);if(index<0)throw Error('configuration');
 return {'altare:shape':Math.floor(index/4),'altare:detail':index%4,'altare:facing':t.facing};
}
export function decodePalette(states:Record<string,unknown>):PaletteLayout {
 const shape=Number(states['altare:shape']),detail=Number(states['altare:detail']),facing=Number(states['altare:facing']);
 if(![shape,detail,facing].every(Number.isInteger)||shape<0||shape>6||detail<0||detail>3||facing<0||facing>3)throw Error('configuration');
 const value=PALETTE_SHAPES[shape*4+detail]!;
 return {edges:rotateEdges(value.edges,facing),frontal:value.frontal,facing};
}
export function paletteRoleAfterContour(t:PaletteLayout):number {return indexFor(t)>=0?t.frontal:0;}

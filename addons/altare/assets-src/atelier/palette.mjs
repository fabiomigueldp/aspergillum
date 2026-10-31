const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const textilePalette={
 white:[227,222,209],red:[101,11,43],green:[24,78,53],purple:[76,34,104],
 rose:[179,101,122],black:[28,29,34],gold:[139,98,35],silver:[170,177,184],
};
// The crimson ground has very little green; gold and ivory retain substantially
// more green. Soft coverage retains antialiased thread edges, not a hue rotation.
export function fabricMask([r,g,b]){
 if(r<1)return 0;
 return (1-smooth(.12,.48,g/r))*smooth(.35,.65,(r-Math.min(g,b))/Math.max(r,g,b));
}
export function dyeFabric(rgb,color){
 if(color==='red')return [...rgb];
 const target=textilePalette[color];if(!target)throw Error('Unknown textile palette');
 const mask=fabricMask(rgb),light=clamp((rgb[0]-45)/95);
 const shade=.79+light*.24;
 return rgb.map((v,i)=>Math.round(v*(1-mask)+target[i]*shade*mask));
}

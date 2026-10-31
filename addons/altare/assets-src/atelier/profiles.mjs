export const textileProfiles={
 none:{drop:0,scallop:0},
 linen_short:{drop:3.25,scallop:0,uvHeight:28},
 linen_long:{drop:10.5,scallop:0,uvHeight:86},
 gold_short:{drop:3.25,scallop:0,uvHeight:28},
 gold_long:{drop:10.5,scallop:0,uvHeight:86},
 lace:{drop:4.5,scallop:0},
 agnus:{drop:6.75,scallop:.18,row:0},
 ruby:{drop:5.5,scallop:.15,row:1},
 verdant:{drop:7.25,scallop:.14,row:2},
 requiem:{drop:4,scallop:0,row:3},
};
// Two lobes per module: a half-module centre shift keeps the same silhouette.
export function hemLimit(x,theme){const p=textileProfiles[theme];return .98-p.scallop*(.5-.5*Math.cos(x/128*Math.PI*4));}
export const roleCenter=role=>role===2?0:role===3?128:64;

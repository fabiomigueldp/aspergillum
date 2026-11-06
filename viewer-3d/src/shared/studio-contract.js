import {SHARED_TEXTILES,sharedDesignFor} from '../../../addons/altare/src/domain/catalog.ts';
export const STUDIO_VERSION='2.3.0';
export const STUDIO_ENVIRONMENTS=[{id:'gallery',label:'Presbitério de quartzo'},{id:'chapel',label:'Capela de madeira'},{id:'studio',label:'Claustro com jardim'},{id:'transparent',label:'Transparente'}];
export const STUDIO_VIEWS=[{id:'hero',label:'Três quartos',direction:[-.4,.22,-1]},{id:'front',label:'Frente',direction:[0,.10,-1]},{id:'back',label:'Verso',direction:[.65,.36,1]},{id:'top',label:'Superior',direction:[-.1,1,-.2]},{id:'detail',label:'Bordado',direction:[-.2,.12,-1]},{id:'player',label:'Jogador',direction:[0,.1,-1]},{id:'wide',label:'Ambiente',direction:[-.18,.17,-1]}];
export const STUDIO_PRESETS=[
 {id:'crossbrace',name:'Cruzeta em nogueira',description:'Marcenaria aberta · travessas cruzadas',family:'crossbrace',surface:'walnut',textile:'none',frontal:'none',environment:'chapel',dressing:'none',width:5,depth:2},
 {id:'crossbrace-linen',name:'Cruzeta com linho',description:'Nogueira · linho curto',family:'crossbrace',surface:'walnut',textile:'linen_short',frontal:'none',environment:'chapel',dressing:'none',width:7,depth:2},
 {id:'twin-pedestal',name:'Dois pedestais',description:'Nogueira · dois apoios · sem toalha',family:'twin_pedestal',surface:'walnut',textile:'none',frontal:'none',environment:'chapel',dressing:'none',width:7,depth:2},
 {id:'twin-pedestal-lace',name:'Dois pedestais e renda',description:'Nogueira · renda floral',family:'twin_pedestal',surface:'walnut',textile:'lace',frontal:'none',environment:'chapel',dressing:'none',width:7,depth:2},
 {id:'colonnade',name:'Colunata e renda',description:'Mármore claro · douramento · renda vazada',family:'colonnade',surface:'marble',textile:'lace',frontal:'none',environment:'gallery',candles:6,width:7},
 {id:'coffer',name:'Arca em nogueira',description:'Painéis rebaixados · molduras de madeira',family:'coffer',surface:'walnut',textile:'none',frontal:'none',environment:'chapel',dressing:'none',width:5},
 {id:'baluster',name:'Balaústres e linho',description:'Mesa aberta · apoios facetados',family:'baluster',surface:'walnut',textile:'agnus',frontal:'none',environment:'chapel',furnishing:'wood',candles:2,width:5},
 {id:'guadalupe',name:'Guadalupe',description:'Frontal dourado · linho bordado',family:'classic',stone:0,cloth:3,textile:'gold_short',ornamental:true,environment:'gallery'},
 {id:'trestle',name:'Nogueira e linho',description:'Cavaletes · branco e ouro',family:'trestle',surface:'walnut',textile:'agnus',frontal:'none',environment:'gallery'},
 {id:'green',name:'Verde e ouro',description:'Pilastras · floral IHS',family:'pilaster',surface:'marble',textile:'palette',color:'green',environment:'chapel',furnishing:'wood',candles:4},
 {id:'gothic',name:'Arcadas em rubi',description:'Ogivas · veludo bordado',family:'ogive',surface:'limestone',textile:'ruby',frontal:'none',environment:'gallery'},
 {id:'requiem',name:'Preto e prata',description:'Ogivas · cruzes bordadas',family:'ogive',surface:'marble',textile:'requiem',frontal:'cross',environment:'studio',candles:2},
 {id:'wood',name:'Estrutura em nogueira',description:'Cavaletes · sem toalha',family:'trestle',surface:'walnut',textile:'none',frontal:'none',environment:'studio',dressing:'none'},
 {id:'rose',name:'Róseo floral',description:'Pilastras · floral IHS',family:'pilaster',surface:'marble',textile:'palette',color:'rose',environment:'gallery'},
 {id:'purple',name:'Roxo floral',description:'Ogivas · floral IHS',family:'ogive',surface:'limestone',textile:'palette',color:'purple',environment:'chapel',furnishing:'wood',season:'lent',candles:4},
];
export const DEFAULT_STUDIO_CONFIG=Object.freeze({family:'classic',surface:'marble',textile:'gold_short',frontal:'none',color:'green',stone:0,cloth:3,ornamental:true,width:7,depth:2,environment:'gallery',view:'hero',ratio:'16:9',lighting:'classic',exposure:1,light:0,quality:'high',projection:'perspective',dressing:'ready',candles:6,season:'ordinary',furnishing:'gold',candlePlacement:'floor'});
const choices={family:['classic','pilaster','ogive','trestle','coffer','baluster','colonnade','crossbrace','twin_pedestal'],surface:['marble','limestone','walnut'],textile:[...SHARED_TEXTILES,'ruby','palette'],frontal:['none','cross','agnus'],color:['white','red','green','purple','rose','black','gold','silver'],environment:STUDIO_ENVIRONMENTS.map(x=>x.id),view:STUDIO_VIEWS.map(x=>x.id),ratio:['16:9','4:3','1:1','4:5'],lighting:['classic','shadows'],quality:['draft','high'],projection:['perspective','orthographic']};
Object.assign(choices,{candlePlacement:['floor','mensa'],furnishing:['gold','wood'],dressing:['none','ready','gifts'],season:['ordinary','advent','lent','festive']});
export function normalizeStudioConfig(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuração inválida.');
 const result={...DEFAULT_STUDIO_CONFIG};
 for(const [key,options]of Object.entries(choices)){if(input[key]!==undefined){if(!options.includes(input[key]))throw Error(`Opção inválida: ${key}.`);result[key]=input[key];}}
 for(const [key,min,max,integer]of [['width',1,16,true],['depth',1,8,true],['stone',0,2,true],['cloth',0,4,true],['exposure',.4,1.8,false],['light',-90,90,false]])if(input[key]!==undefined){const v=Number(input[key]);if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error(`Valor inválido: ${key}.`);result[key]=v;}
 if(input.ornamental!==undefined){if(typeof input.ornamental!=='boolean')throw Error('Frontal inválido.');result.ornamental=input.ornamental;}
 if(input.candles!==undefined){const count=Number(input.candles);if(![2,4,6,7].includes(count))throw Error('Número de velas inválido.');result.candles=count;}
 if(input.cloth!==undefined&&input.textile===undefined&&result.family==='classic')result.textile=['none','linen_short','linen_long','gold_short','gold_long'][result.cloth];
 if(result.textile==='ruby'){result.textile='floral';result.color='red';}else if(result.textile==='palette')result.textile='floral';
 if(result.family==='colonnade'){result.surface='marble';result.frontal='none';}
 if(result.textile==='floral'&&result.color!=='red')result.frontal='none';
 if(result.family==='classic'&&['none','linen_short','linen_long','gold_short','gold_long'].includes(result.textile))result.cloth=['none','linen_short','linen_long','gold_short','gold_long'].indexOf(result.textile);
 if(['coffer','baluster','crossbrace','twin_pedestal'].includes(result.family)){result.surface='walnut';result.frontal='none';}
 return result;
}
export function studioDimensions(ratio,longEdge){
 if(!Number.isInteger(longEdge)||longEdge<256||longEdge>4096)throw Error('Resolução deve estar entre 256 e 4096.');
 if(!choices.ratio.includes(ratio))throw Error('Proporção inválida.');
 const [w,h]=ratio.split(':').map(Number),factor=longEdge/Math.max(w,h);
 return {width:Math.round(w*factor),height:Math.round(h*factor)};
}
export function validateStudioCamera(state){
 if(!state||!['perspective','orthographic'].includes(state.projection))throw Error('Câmera inválida.');
 for(const key of ['position','target'])if(!Array.isArray(state[key])||state[key].length!==3||state[key].some(v=>!Number.isFinite(v)||Math.abs(v)>200))throw Error('Câmera inválida.');
 if(state.position.every((v,i)=>v===state.target[i])||!Number.isFinite(state.orthoSpan)||state.orthoSpan<=0||state.orthoSpan>200)throw Error('Enquadramento inválido.');
 return state;
}
export function migrateStudioConfig(input,schema=1){
 if(schema===2)return normalizeStudioConfig(input);
 if(schema!==1)throw Error('Arquivo de cena incompatível.');
 const old={...input};
 if(old.family==='classic')old.textile=['none','linen_short','linen_long','gold_short','gold_long'][old.cloth??3];
 if(old.family==='colonnade')old.textile=old.textile==='none'?'none':'lace';
 return normalizeStudioConfig(old);
}
export function designId(config){
 const c=normalizeStudioConfig(config);
 if(c.family==='classic'&&['none','linen_short','linen_long','gold_short','gold_long'].includes(c.textile))return undefined;
 return sharedDesignFor(c.family,c.surface,c.textile,c.frontal,c.color).id;
}
export function studioFilename(config){const c=normalizeStudioConfig(config);return `altare-${c.family}-${c.family==='classic'?(c.ornamental?'guadalupe':'linho')+'-':c.surface+'-'}${c.textile==='floral'?'floral-'+c.color:c.textile}-${c.width}x${c.depth}-${c.environment}-${c.dressing}-${c.furnishing}-${c.candlePlacement}-${c.candles}-${c.season}-${c.view}`;}

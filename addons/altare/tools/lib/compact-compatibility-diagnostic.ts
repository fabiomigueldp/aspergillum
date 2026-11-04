/** Offline diagnostics only. Never imported by the Bedrock runtime or generators. */
import {ATELIER_DESIGNS, LEGACY_ID} from '../../src/domain/catalog.ts';
import {encodeTile} from '../../src/domain/block-codec.ts';
import {PALETTE_SHAPES, rotateEdges} from '../../src/domain/palette-layout.ts';
import {DIRECTIONS, edgeMask, isolatedTile, neighbor, planFinish, positionKey, withEdges, type Position, type Tile} from '../../src/domain/surface.ts';

export const BASELINE_COMMIT = 'c0d4310bb787fbee5b38efe160f22f2642f71e9a';
export const CANDIDATE_ID = 'diagnostic-atelier28-classic50-v1';
// Reference only: the isolated 50-pose proposal, not a published world schema.
// Keep explicit rather than deriving from the planner under test.
export const CLASSIC_REFERENCE_POSES: readonly (readonly number[])[] = Object.freeze([
 [15,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],
 [1,1],[1,2],[1,3],[1,4],[1,8],[1,9],[11,2],[13,11],[13,3],[13,7],[15,2],[3,10],[3,4],[3,6],
 [5,1],[5,2],[5,3],[5,4],[5,8],[5,9],[7,10],[7,4],[7,6],[9,11],[9,3],[9,7],
 [1,5],[3,5],[5,5],[7,5],[9,5],[11,5],[13,5],[15,5],
].map(p => Object.freeze(p)));
const atelier = new Map(ATELIER_DESIGNS.map(d => [d.id, d]));
const classicKeys = ['altare:edges','altare:frontal','altare:facing','altare:stone','altare:cloth'];
const atelierKeys = ['altare:edges','altare:role','altare:facing'];
export type Verdict = 'representable' | 'normalization-required' | 'incompatible' | 'invalid' | 'unassessed';
export interface Diagnosis {status: Verdict; reason: string; localEdges?: number; role?: number}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

/** Reports compatibility only: never produces a converted snapshot or a repair. */
export function diagnoseSnapshot(input: unknown): Diagnosis {
 if (!object(input) || typeof input.id !== 'string' || !object(input.states)) return {status:'invalid',reason:'Expected id and states object'};
 const d = atelier.get(input.id), classic = input.id === LEGACY_ID;
 if (!d && !classic) return {status:'unassessed',reason:'Only 135 legacy Atelier IDs and altare:mensa are assessed'};
 const s = input.states, keys = classic ? classicKeys : atelierKeys;
 if (Object.keys(s).length !== keys.length || !keys.every(k => Object.hasOwn(s,k))) return {status:'invalid',reason:'Missing, extra or mixed schema keys'};
 const edges=s['altare:edges'], facing=s['altare:facing'], role=s[classic?'altare:frontal':'altare:role'];
 if (!integer(edges,15) || !integer(facing,3) || !integer(role,classic?11:3) ||
     (classic && (!integer(s['altare:stone'],2) || !integer(s['altare:cloth'],4)))) return {status:'invalid',reason:'Invalid legacy state domain; no coercion is allowed'};
 const localEdges = rotateEdges(edges,-facing);
 if (d?.textile === 'none' && d.frontal === 'none') return {
  status:role===0?'representable':'normalization-required',
  reason:role===0?'Bare recipe has no central role':'Bare recipe role would be discarded; explicit normalization is required',localEdges,role,
 };
 const fits = classic ? CLASSIC_REFERENCE_POSES.some(([e,r]) => e===localEdges && r===role) : PALETTE_SHAPES.some(p => p.edges===localEdges && p.frontal===role);
 return {status:fits?'representable':'incompatible',reason:fits?'Pose occurs in the reference codebook':'Legacy pose is absent from the reference codebook',localEdges,role};
}

export const emptyCounts = (): Record<Verdict,number> => ({representable:0,'normalization-required':0,incompatible:0,invalid:0,unassessed:0});
const caveats = [
 'Offline domain simulation, not Minecraft execution or native event timing.',
 'Representability is not world coverage, render equivalence or migration approval.',
 'No writes, repair, migration, world scan, pack installation or converted states are produced.',
];

/** JSON envelope from an external exporter. Its world coverage is never trusted as complete. */
export function auditSnapshotDocument(document: unknown) {
 if (!object(document) || document.schemaVersion!==1 || document.baselineCommit!==BASELINE_COMMIT ||
     !Array.isArray(document.entries) || document.entries.length>100_000) throw Error('Expected schemaVersion 1, exact baselineCommit and <=100000 entries');
 const counts=emptyCounts(), seen=new Set<string>();
 const findings=document.entries.map((entry:unknown,index:number) => {
  if (!object(entry) || typeof entry.dimension!=='string' || !entry.dimension.length || !object(entry.position)) throw Error(`Invalid location at entry ${index}`);
  const position=entry.position;
  if(!['x','y','z'].every(k=>Number.isSafeInteger(position[k])))throw Error(`Invalid location at entry ${index}`);
  const key=JSON.stringify([entry.dimension,position.x,position.y,position.z]);
  if(seen.has(key)) throw Error(`Duplicate location at entry ${index}`); seen.add(key);
  const diagnosis=diagnoseSnapshot(entry);counts[diagnosis.status]++;
  return {index,dimension:entry.dimension,position:{...position},id:entry.id,...diagnosis};
 });
 return {baselineCommit:BASELINE_COMMIT,candidate:CANDIDATE_ID,migrationApproved:false,worldCoverageVerified:false,counts,findings,caveats};
}

/** Pure replica of reconcileAround's order, using the actual production domain functions. */
function reconcileAround(tiles: readonly Tile[], changed: Position, unknown: ReadonlySet<string> = new Set()): Tile[] {
 const world=new Map(tiles.map(t=>[positionKey(t.position),structuredClone(t)]));
 for (const p of [changed,...DIRECTIONS.map((_,i)=>neighbor(changed,i))]) {
  const tile=world.get(positionKey(p));if(!tile || unknown.has(positionKey(p)))continue;
  const connected=DIRECTIONS.map((_,i)=>{const key=positionKey(neighbor(p,i));return unknown.has(key)?undefined:world.has(key);});
  const edges=edgeMask(connected,tile.edges);
  if(edges!==tile.edges)world.set(positionKey(p),withEdges(tile,edges));
 }
 return [...world.values()];
}
export function simulateBreak(tiles: readonly Tile[], position:Position, unknown: ReadonlySet<string> = new Set()): Tile[] {
 if(!tiles.some(t=>positionKey(t.position)===positionKey(position)))throw Error('Cannot break an absent tile');
 return reconcileAround(tiles.filter(t=>positionKey(t.position)!==positionKey(position)),position,unknown);
}
export function simulatePlacement(tiles: readonly Tile[], source:Tile, position:Position): Tile[] {
 if(tiles.some(t=>positionKey(t.position)===positionKey(position)))throw Error('Cannot place over an existing tile');
 return reconcileAround([...tiles,isolatedTile(source,position)],position);
}
export function plannedRectangle(width:number,depth:number,facing:number,id:string): Tile[] {
 const tiles:Tile[]=Array.from({length:width*depth},(_,i)=>({position:{x:i%width,y:64,z:Math.floor(i/width)},stone:0,cloth:1,frontal:0,facing:0,edges:15}));
 return planFinish(tiles,{stone:0,cloth:1,ornamental:true,facing,...(id===LEGACY_ID?{}:{design:id})});
}

/** Exhaustive old domains, including command-created and otherwise irregular states. */
export function auditCartesianDomains() {
 const groups={atelier:emptyCounts(),classic:emptyCounts()};
 for(const d of ATELIER_DESIGNS)for(let edges=0;edges<16;edges++)for(let facing=0;facing<4;facing++)for(let role=0;role<4;role++){
  const verdict=diagnoseSnapshot({id:d.id,states:{'altare:edges':edges,'altare:facing':facing,'altare:role':role}});groups.atelier[verdict.status]++;
 }
 for(let edges=0;edges<16;edges++)for(let facing=0;facing<4;facing++)for(let frontal=0;frontal<12;frontal++)for(let stone=0;stone<3;stone++)for(let cloth=0;cloth<5;cloth++){
  const verdict=diagnoseSnapshot({id:LEGACY_ID,states:{'altare:edges':edges,'altare:facing':facing,'altare:frontal':frontal,'altare:stone':stone,'altare:cloth':cloth}});groups.classic[verdict.status]++;
 }
 return groups;
}

/** Representatives of pose rules, not an exhaustive material/renderer comparison. */
export const SEQUENCE_IDS = [LEGACY_ID,'altare:a_pilaster_marble_agnus_none','altare:a_ogive_limestone_none_cross','altare:a_trestle_walnut_ruby_agnus','altare:a_pilaster_marble_none_none'] as const;
export function auditSingleBreaks(ids:readonly string[]=SEQUENCE_IDS,maxWidth=16,maxDepth=8) {
 if(!integer(maxWidth,16)||maxWidth<1||!integer(maxDepth,8)||maxDepth<1||!ids.length||ids.some(id=>id!==LEGACY_ID&&!atelier.has(id)))throw Error('Invalid synthetic scope');
 const families=[];
 for(const id of ids){
  let rectangles=0,breaks=0,affectedTiles=0;const before=emptyCounts(),after=emptyCounts(),poses=new Set<string>(),examples:unknown[]=[];
  for(let width=1;width<=maxWidth;width++)for(let depth=1;depth<=maxDepth;depth++)for(let facing=0;facing<4;facing++){
   const tiles=plannedRectangle(width,depth,facing,id);rectangles++;
   const byPosition=new Map(tiles.map(t=>[positionKey(t.position),t]));
   for(const tile of tiles)before[diagnoseSnapshot(encodeTile(tile)).status]++;
   // Equivalent to a single removal/reconcile for the surviving adjacent tiles only.
   for(const removed of tiles){breaks++;
    for(let i=0;i<4;i++){
     const tile=byPosition.get(positionKey(neighbor(removed.position,i)));if(!tile)continue;
     const connected=DIRECTIONS.map((_,j)=>{const key=positionKey(neighbor(tile.position,j));return key!==positionKey(removed.position)&&byPosition.has(key);});
     const changed=withEdges(tile,edgeMask(connected,tile.edges));affectedTiles++;
     const diagnosis=diagnoseSnapshot(encodeTile(changed));after[diagnosis.status]++;
     if(diagnosis.status==='incompatible'){
      poses.add(`${diagnosis.localEdges}:${diagnosis.role}`);
      if(examples.length<8)examples.push({width,depth,facing,removed:removed.position,survivor:tile.position,before:encodeTile(tile),after:encodeTile(changed),diagnosis});
     }
    }
   }
  }
  families.push({id,rectangles,breaks,affectedTiles,before,after,incompatibleLocalPoses:[...poses].sort(),examples});
 }
 return {baselineCommit:BASELINE_COMMIT,candidate:CANDIDATE_ID,migrationApproved:false,coverage:`Every single cell removal from 1..${maxWidth} by 1..${maxDepth} rectangles in four directions, for ${ids.length} pose-rule representatives; no claim about arbitrary multi-step coverage.`,families,caveats};
}

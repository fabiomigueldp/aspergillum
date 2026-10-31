import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {EditSessions} from '../src/application/sessions.ts';

// Exercise the real presentation with a minimal native UI adapter. This proves
// draft/commit and lifecycle behavior, not Bedrock layout or controller parity.
class Observable<T> {
  callbacks=new Set<(v:T)=>void>();
  value:T;
  readonly clientWritable:boolean;
  constructor(value:T,options?:{clientWritable:boolean}){this.value=value;this.clientWritable=options?.clientWritable===true;}
  getData(){return this.value;}
  setData(value:T){if(value===this.value)return;this.value=value;for(const callback of this.callbacks)callback(value);}
  subscribe(callback:(v:T)=>void){this.callbacks.add(callback);return callback;}
  unsubscribe(callback:(v:T)=>void){return this.callbacks.delete(callback);}
}
let current:any;
function requireClientWritable(value:Observable<unknown>,binding:string){
  if(!value.clientWritable){
    const error=new Error(`Expect '${binding}' observable to be client writable.`);
    error.name='InvalidObservableError';throw error;
  }
}
class Form {
  controls:any[]=[]; showing=false; resolve:(value:unknown)=>void=()=>{};
  constructor(){current=this;}
  header(){return this;} spacer(){return this;} divider(){return this;}
  dropdown(label:any,value:any,items:any,options:any={}){requireClientWritable(value,'dropdown value');this.controls.push({kind:'dropdown',label:label.translate,value,items,options});return this;}
  toggle(label:any,value:any,options:any={}){requireClientWritable(value,'toggle value');this.controls.push({kind:'toggle',label:label.translate,value,options});return this;}
  button(label:any,callback:()=>void){this.controls.push({kind:'button',label:label.translate,callback});return this;}
  isShowing(){return this.showing;}
  show(){this.showing=true;return new Promise(resolve=>{this.resolve=resolve;});}
  close(){this.showing=false;this.resolve(undefined);}
}
(globalThis as any).__altareTestUI={CustomForm:Form,ObservableBoolean:Observable,ObservableNumber:Observable};
const bundled=await build({entryPoints:[new URL('../src/presentation/menu.ts',import.meta.url).pathname.replace(/^\/(.:)/,'$1')],bundle:true,format:'esm',platform:'node',write:false,plugins:[{
 name:'native-ui-double',setup(b){b.onResolve({filter:/^@minecraft\/server-ui$/},()=>({path:'ui',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const {CustomForm,ObservableBoolean,ObservableNumber}=globalThis.__altareTestUI;'}));},
}]});
const {chooseFinish}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0]!.text+'\n//# sourceURL=altare-menu-test.mjs').toString('base64'));
const tiles=[{position:{x:0,y:0,z:0},stone:0,cloth:1,frontal:0,facing:0,edges:15,design:'altare:a_ogive_marble_ruby_cross'}];
const field=(name:string)=>current.controls.find((c:any)=>c.label===`altare.${name}`&&c.options?.visible?.getData()!==false);
const click=(name:string)=>field(name).callback();

test('native editor binds every input as client writable, including disabled and hidden dropdowns',async()=>{
 const result=chooseFinish({},tiles,0);
 const form=current;
 if(form.isShowing())click('menu.cancel');
 assert.equal(await result,undefined);
 const inputs=form.controls.filter((c:any)=>c.value);
 assert.ok(inputs.every((c:any)=>c.value.clientWritable));
 const fixed=inputs.filter((c:any)=>c.options.disabled===true);
 assert.equal(fixed.length,3);
 assert.ok(fixed.every((c:any)=>c.items.length===1&&c.value.getData()===0));
 assert.ok(fixed.some((c:any)=>c.options.visible.getData()===false));
 assert.ok(inputs.filter((c:any)=>c.options.visible).every((c:any)=>!c.options.visible.clientWritable));
 assert.ok(inputs.every((c:any)=>c.value.callbacks.size===0));
});

test('fixed dropdown values never authorize a finish change',async()=>{
 const result=chooseFinish({},tiles,0);
 for(const control of current.controls.filter((c:any)=>c.options?.disabled===true))control.value.setData(999);
 click('menu.apply');assert.equal((await result).design,tiles[0]!.design);
});

test('native editor commits only on Apply, restores the opened altar and cleans subscriptions',async()=>{
 let result=chooseFinish({},tiles,0);field('menu.color').value.setData(3);click('menu.cancel');assert.equal(await result,undefined);
 assert.ok(current.controls.filter((c:any)=>c.value).every((c:any)=>c.value.callbacks.size===0));
 result=chooseFinish({},tiles,0);field('menu.color').value.setData(3);click('menu.restore');click('menu.apply');assert.equal((await result).design,tiles[0]!.design);
 result=chooseFinish({},tiles,0);field('menu.color').value.setData(3);assert.equal(field('menu.applique').options.disabled,true);
 field('menu.model').value.setData(3);click('menu.apply');assert.equal((await result).design,'altare:l_trestle_marble_purple');
});
test('invalid client selections are rejected and a released lease closes the view without a finish',async()=>{
 const sessions=new EditSessions(),session=sessions.acquire('p','d',['0,0,0'],0)!;
 const result=chooseFinish({},tiles,0,()=>sessions.isCurrent(session,1),(callback:()=>void)=>sessions.onRelease(session,callback));
 field('menu.model').value.setData(999);assert.equal(field('menu.model').value.getData(),2);
 sessions.invalidate('d','0,0,0');assert.equal(current.showing,false);assert.equal(await result,undefined);
 const replacement=sessions.acquire('p','d',['0,0,0'],2)!;sessions.release(session);assert.equal(sessions.isCurrent(replacement,3),true);
});

test('native joinery controls show the actual material and never apply a suspended relief',async()=>{
 const result=chooseFinish({},tiles,0);
 field('menu.model').value.setData(4);
 assert.equal(field('menu.surface').options.disabled,true);
 assert.equal(field('menu.surface').items[0].label.translate,'altare.surface.walnut');
 assert.equal(field('menu.applique'),undefined);
 field('menu.color').value.setData(3);
 field('menu.model').value.setData(5);click('menu.apply');
 assert.equal((await result).design,'altare:j_baluster_ruby_purple');
});

test('one native cloth selector offers lace on every model and shows direction only for emblems',async()=>{
 const result=chooseFinish({},tiles,3);field('menu.model').value.setData(6);
 assert.equal(field('menu.surface').items[0].label.translate,'altare.surface.marble');
 assert.equal(field('menu.pattern').items.length,10);assert.ok(field('menu.front'));
 const lace=field('menu.pattern').items.findIndex((i:any)=>i.label.translate==='altare.textile.lace');field('menu.pattern').value.setData(lace);
 assert.equal(field('menu.front'),undefined);assert.equal(field('menu.lace'),undefined);
 click('menu.apply');assert.deepEqual(await result,{stone:0,cloth:0,ornamental:false,facing:0,design:'altare:s_colonnade_lace'});
});

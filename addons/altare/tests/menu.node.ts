import test from 'node:test';
import assert from 'node:assert/strict';
import {EditSessions} from '../src/application/sessions.ts';
import {DESIGNS} from '../src/domain/catalog.ts';
import {planFinish} from '../src/domain/surface.ts';
import {encodeTile,decodeTile} from '../src/domain/block-codec.ts';

import {current,chooseFinish} from './helpers/native-ui.ts';
import {locales} from '../assets-src/locales.mjs';
const tiles=[{position:{x:0,y:0,z:0},stone:0,cloth:1,frontal:0,facing:0,edges:15,design:'altare:a_ogive_marble_ruby_cross'}];
const field=(name:string)=>current.controls.find((c:any)=>c.label===`altare.${name}`&&c.options?.visible?.getData()!==false);
const click=(name:string)=>field(name).callback();

test('native editor uses client-writable choices and read-only information without fake dropdowns',async()=>{
 const result=chooseFinish({},tiles,0),form=current;
 assert.equal(form.controls[0].label,'altare.menu.scope');
 assert.equal(form.controls[0].kind,'label');
 const inputs=form.controls.filter((c:any)=>c.value);
 assert.ok(inputs.every((c:any)=>c.value.clientWritable));
 assert.equal(inputs.filter((c:any)=>c.options.disabled===true).length,0);
 assert.ok(inputs.filter((c:any)=>c.options.visible).every((c:any)=>!c.options.visible.clientWritable));
 click('menu.cancel');assert.equal(await result,undefined);
 assert.ok(inputs.every((c:any)=>c.value.callbacks.size===0));
});

test('native editor commits only on Apply, restores the opened altar and cleans subscriptions',async()=>{
 let result=chooseFinish({},tiles,0);field('menu.color').value.setData(3);click('menu.cancel');assert.equal(await result,undefined);
 assert.ok(current.controls.filter((c:any)=>c.value).every((c:any)=>c.value.callbacks.size===0));
 result=chooseFinish({},tiles,0);field('menu.color').value.setData(3);click('menu.restore');click('menu.apply');assert.equal((await result).design,tiles[0]!.design);
 result=chooseFinish({},tiles,0);field('menu.color').value.setData(3);assert.equal(field('menu.applique'),undefined);assert.equal(field('menu.relief_limit').kind,'label');
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
 assert.equal(field('menu.surface'),undefined);
 assert.equal(field('menu.material_walnut').kind,'label');
 assert.equal(field('menu.applique'),undefined);
 field('menu.color').value.setData(3);
 field('menu.model').value.setData(5);click('menu.apply');
 assert.equal((await result).design,'altare:j_baluster_ruby_purple');
});

test('one native cloth selector offers lace on every model and shows direction only for emblems',async()=>{
 const result=chooseFinish({},tiles,3);field('menu.model').value.setData(6);
 assert.equal(field('menu.surface'),undefined);assert.equal(field('menu.material_marble').kind,'label');
 assert.equal(field('menu.pattern').items.length,10);assert.ok(field('menu.front'));
 const lace=field('menu.pattern').items.findIndex((i:any)=>i.label.translate==='altare.textile.lace');field('menu.pattern').value.setData(lace);
 assert.equal(field('menu.front'),undefined);assert.equal(field('menu.lace'),undefined);
 click('menu.apply');assert.deepEqual(await result,{stone:0,cloth:0,ornamental:false,facing:0,design:'altare:s_colonnade_lace'});
});


test('native editor dimensions follow the draft front and restore without changing world tiles',async()=>{
 const rectangle=Array.from({length:14},(_,i)=>({...tiles[0],position:{x:i%7,y:0,z:Math.floor(i/7)}}));
 const snapshot=structuredClone(rectangle);
 const dimensions=()=>{const title=current.title?.getData?.()??current.title;return title.rawtext[1].text;};
 const result=chooseFinish({},rectangle,0);
 assert.equal(dimensions(),' · 7 × 2');
 assert.equal(current.title.clientWritable,false);
 for(const [facing,expected] of [[1,' · 2 × 7'],[2,' · 7 × 2'],[3,' · 2 × 7'],[0,' · 7 × 2']] as const){
  field('menu.front').value.setData(facing);assert.equal(dimensions(),expected);
 }
 field('menu.front').value.setData(3);
 field('menu.front').value.setData(999);assert.equal(dimensions(),' · 2 × 7');
 click('menu.restore');assert.equal(dimensions(),' · 7 × 2');
 assert.deepEqual(rectangle,snapshot);
 field('menu.front').value.setData(1);click('menu.apply');
 assert.equal((await result).facing,1);assert.deepEqual(rectangle,snapshot);
});


test('native title preserves the editing orientation through a symmetric model and closes without stale updates',async()=>{
 const rectangle=Array.from({length:14},(_,i)=>({...tiles[0],position:{x:i%7,y:0,z:Math.floor(i/7)}}));
 const result=chooseFinish({},rectangle,3),form=current;
 const dimensions=()=>form.title.getData().rawtext[1].text;
 const select=(name:string,key:string)=>{const c=field(name);c.value.setData(c.items.find((i:any)=>i.label.translate===`altare.${key}`).value);};
 assert.equal(dimensions(),' · 2 × 7');
 assert.equal(form.title.getData().rawtext[0].translate,'altare.menu.title');
 select('menu.model','structure.colonnade');select('menu.pattern','textile.none');
 assert.equal(field('menu.front'),undefined);assert.equal(dimensions(),' · 2 × 7');
 select('menu.pattern','textile.agnus');assert.equal(field('menu.front').value.getData(),3);
 field('menu.front').value.setData(0);assert.equal(dimensions(),' · 7 × 2');
 click('menu.restore');assert.equal(dimensions(),' · 2 × 7');
 const control=field('menu.front').value;click('menu.cancel');assert.equal(await result,undefined);
 control.setData(0);assert.equal(dimensions(),' · 2 × 7');assert.equal(control.callbacks.size,0);
});


// Frontal means a centre role on architecture, but Guadalupe on classic blocks.
const savedLayout=(design:string|undefined,ornamental:boolean,facing=0,width=7)=>{
 const cells=Array.from({length:width*2},(_,i)=>({position:{x:i%width,y:0,z:Math.floor(i/width)},stone:2,cloth:0,frontal:0,facing:0,edges:15}));
 return planFinish(cells,{stone:2,cloth:0,ornamental,facing,...(design?{design}:{})}).map(tile=>{const saved=encodeTile(tile);return decodeTile(saved.id,tile.position,saved.states)!;});
};

test('ornament identity never interprets an architectural centre role as Guadalupe',async()=>{
 for(const design of DESIGNS.filter(d=>d.structure!=='classic')){
  const layout=savedLayout(design.id,false),snapshot=structuredClone(layout);
  const result=chooseFinish({},layout,0);field('menu.model').value.setData(0);
  const toggle=field('menu.ornamental').value.getData();click('menu.apply');const finish=await result;
  assert.equal(toggle,false,design.id);assert.equal(finish.ornamental,false,design.id);assert.deepEqual(layout,snapshot);
 }
});

test('Guadalupe intent survives saved classic textiles, model switches, explicit choices and Restore',async()=>{
 for(const design of [undefined,...DESIGNS.filter(d=>d.structure==='classic').map(d=>d.id)])for(const ornamental of [false,true])for(const facing of [0,1,2,3])for(const width of [1,2,7,8]){
  const layout=savedLayout(design,ornamental,facing,width),snapshot=structuredClone(layout);
  const result=chooseFinish({},layout,facing);
  assert.equal(field('menu.ornamental').value.getData(),ornamental,`${design??'legacy'} initial`);
  field('menu.model').value.setData(4);field('menu.model').value.setData(0);
  assert.equal(field('menu.ornamental').value.getData(),ornamental,'switching models preserves the classic choice');
  field('menu.ornamental').value.setData(!ornamental);
  field('menu.model').value.setData(1);field('menu.model').value.setData(0);
  assert.equal(field('menu.ornamental').value.getData(),!ornamental,'explicit choice survives a switch');
  click('menu.restore');assert.equal(field('menu.ornamental').value.getData(),ornamental);
  click('menu.apply');assert.equal((await result).ornamental,ornamental);assert.deepEqual(layout,snapshot);
 }
});

test('mixed altar keeps genuine Guadalupe but ignores unrelated architectural centres',async()=>{
 const architecture=savedLayout('altare:a_pilaster_marble_none_none',false);
 for(const expected of [false,true])for(const reverse of [false,true]){
  const classic=savedLayout(undefined,expected,0,1)[0]!;
  const mixed=architecture.map((tile,i)=>i===0?{...classic,position:tile.position}:tile);
  if(reverse)mixed.reverse();const snapshot=structuredClone(mixed);
  const result=chooseFinish({},mixed,0);field('menu.model').value.setData(0);
  const toggle=field('menu.ornamental').value.getData();click('menu.apply');const finish=await result;
  assert.equal(toggle,expected);assert.equal(finish.ornamental,expected);assert.deepEqual(mixed,snapshot);
 }
});

test('explicit Guadalupe choice after an architectural transition is retained and Restore removes only that draft choice',async()=>{
 const layout=savedLayout('altare:a_pilaster_marble_none_none',false);
 let result=chooseFinish({},layout,0);field('menu.model').value.setData(0);field('menu.ornamental').value.setData(true);
 field('menu.model').value.setData(4);field('menu.model').value.setData(0);
 assert.equal(field('menu.ornamental').value.getData(),true);click('menu.apply');assert.equal((await result).ornamental,true);
 result=chooseFinish({},layout,0);field('menu.model').value.setData(0);field('menu.ornamental').value.setData(true);
 click('menu.restore');field('menu.model').value.setData(0);
 const restored=field('menu.ornamental').value.getData();click('menu.apply');const finish=await result;
 assert.equal(restored,false);assert.equal(finish.ornamental,false);
});

test('Undo changes follows the whole draft while Apply remains available for recomposition',async()=>{
 const result=chooseFinish({},tiles,0);
 const undo=field('menu.restore'),apply=field('menu.apply');
 assert.equal(undo.options.disabled.getData(),true);
 assert.equal(undo.options.disabled.clientWritable,false);
 assert.notEqual(apply.options.disabled,true);
 field('menu.color').value.setData(3);
 assert.equal(undo.options.disabled.getData(),false);
 field('menu.model').value.setData(6);field('menu.pattern').value.setData(9);
 assert.equal(field('menu.color'),undefined);
 assert.equal(undo.options.disabled.getData(),false);
 click('menu.restore');assert.equal(undo.options.disabled.getData(),true);
 assert.equal(field('menu.color').value.getData(),1);
 click('menu.apply');assert.equal((await result).design,tiles[0]!.design);
});

test('unavailable relief explains the compatible color and retains the chosen relief',async()=>{
 const result=chooseFinish({},tiles,0);
 const relief=field('menu.applique').value.getData();
 field('menu.color').value.setData(3);
 assert.equal(field('menu.applique'),undefined);
 assert.equal(field('menu.relief_limit').kind,'label');
 field('menu.color').value.setData(1);
 assert.equal(field('menu.relief_limit'),undefined);
 assert.equal(field('menu.applique').value.getData(),relief);
 click('menu.cancel');assert.equal(await result,undefined);
});

test('symmetric models hide the front spacer along with its section',async()=>{
 const result=chooseFinish({},tiles,0);
 const frontHeader=current.controls.findIndex((c:any)=>c.label==='altare.menu.frontal');
 const spacer=current.controls[frontHeader-1];
 assert.equal(spacer.kind,'spacer');assert.equal(spacer.options.visible.getData(),true);
 field('menu.model').value.setData(6);field('menu.pattern').value.setData(9);
 assert.equal(spacer.options.visible.getData(),false);assert.equal(field('menu.frontal'),undefined);
 field('menu.pattern').value.setData(6);
 assert.equal(spacer.options.visible.getData(),true);assert.ok(field('menu.frontal'));
 click('menu.cancel');await result;
});

test('rapid or stale action callbacks cannot close twice or turn Cancel into Apply',async()=>{
 for(const action of ['menu.apply','menu.cancel']){
  const result=chooseFinish({},tiles,0),form=current;
  const apply=field('menu.apply').callback,cancel=field('menu.cancel').callback,undo=field('menu.restore').callback;
  const color=field('menu.color').value;
  click(action);
  assert.doesNotThrow(()=>{apply();cancel();undo();color.setData(3);});
  assert.equal(form.showing,false);
  const finish=await result;
  assert.equal(finish?.design,action==='menu.apply'?tiles[0]!.design:undefined);
  assert.equal(color.callbacks.size,0);
 }
 const result=chooseFinish({},tiles,0),apply=field('menu.apply').callback;
 current.close();assert.doesNotThrow(apply);assert.equal(await result,undefined);
});


test('every displayed control, option and hint resolves in both shipped locales',async()=>{
 const result=chooseFinish({},tiles,0);
 assert.deepEqual(Object.keys(locales.pt_BR).sort(),Object.keys(locales.en_US).sort());
 for(const entries of Object.values(locales)){
  for(const control of current.controls){
   if(control.label)assert.ok(entries[control.label],control.label);
   for(const item of control.items??[])assert.ok(entries[item.label.translate],item.label.translate);
   const description=control.options?.description?.translate;
   if(description)assert.ok(entries[description],description);
  }
 }
 assert.equal(locales.en_US['altare.menu.ornamental'],'Guadalupe image');
 assert.equal(locales.pt_BR['altare.applique.none'],'Sem relevo');
 click('menu.cancel');await result;
});

test('every model and cloth exposes one honest material and no empty front section',async()=>{
 const result=chooseFinish({},tiles,0);
 const models=field('menu.model'),cloths=field('menu.pattern');
 for(const model of models.items)for(const cloth of cloths.items){
  models.value.setData(model.value);cloths.value.setData(cloth.value);
  for(const color of [0,1,3]){
   field('menu.color')?.value.setData(color);
   const material=current.controls.filter((c:any)=>['altare.menu.surface','altare.menu.material_walnut','altare.menu.material_marble'].includes(c.label)&&c.options.visible.getData());
   assert.equal(material.length,1,`${model.label.translate}/${cloth.label.translate}`);
   assert.equal(Boolean(field('menu.frontal')),Boolean(field('menu.front')));
   assert.ok(!field('menu.relief_limit')||!field('menu.applique'));
  }
 }
 click('menu.cancel');assert.equal(await result,undefined);
});

test('expiry discovered by Apply closes the view and returns no finish',async()=>{
 const sessions=new EditSessions(),session=sessions.acquire('expiry','d',['0,0,0'],0)!;
 let tick=1199;
 const result=chooseFinish({},tiles,0,()=>sessions.isCurrent(session,tick),(callback:()=>void)=>sessions.onRelease(session,callback));
 tick=1200;
 assert.doesNotThrow(()=>click('menu.apply'));
 assert.equal(current.showing,false);assert.equal(await result,undefined);
 assert.ok(current.controls.filter((c:any)=>c.value).every((c:any)=>c.value.callbacks.size===0));
 const replacement=sessions.acquire('expiry','d',['0,0,0'],tick);assert.ok(replacement);sessions.release(replacement!);
});

test('release after Apply but before its continuation invalidates the selected finish',async()=>{
 const sessions=new EditSessions(),session=sessions.acquire('release','d',['0,0,0'],0)!;
 const result=chooseFinish({},tiles,0,()=>sessions.isCurrent(session,1),(callback:()=>void)=>sessions.onRelease(session,callback));
 click('menu.apply');assert.equal(current.showing,false);
 assert.doesNotThrow(()=>sessions.release(session));
 assert.equal(await result,undefined);
});

test('failed native close leaves an open editor cancellable without retaining an Apply',async()=>{
 for(const action of ['menu.cancel','menu.apply']){
  const result=chooseFinish({},tiles,0),form=current,nativeClose=form.close.bind(form);
  let calls=0;form.close=()=>{if(++calls===1)throw Error('EngineError');nativeClose();};
  assert.throws(()=>click(action),/EngineError/);assert.equal(form.showing,true);
  field('menu.color').value.setData(3);click('menu.restore');
  assert.equal(field('menu.color').value.getData(),1);
  click('menu.cancel');
  // End even on a regression, so the test reports an assertion rather than hanging.
  assert.equal(form.showing,false);assert.equal(await result,undefined);
  assert.equal(calls,2);
  assert.ok(form.controls.filter((c:any)=>c.value).every((c:any)=>c.value.callbacks.size===0));
 }
});

test('failed Apply can be retried with the current draft rather than its previous choice',async()=>{
 const result=chooseFinish({},tiles,0),form=current,nativeClose=form.close.bind(form);
 let calls=0;form.close=()=>{if(++calls===1)throw Error('EngineError');nativeClose();};
 assert.throws(()=>click('menu.apply'),/EngineError/);
 field('menu.color').value.setData(3);field('menu.model').value.setData(3);
 click('menu.apply');assert.equal(form.showing,false);
 assert.equal((await result).design,'altare:l_trestle_marble_purple');assert.equal(calls,2);
});

test('close error after native dismissal cannot revive callbacks or commit a failed Apply',async()=>{
 const result=chooseFinish({},tiles,0),form=current,nativeClose=form.close.bind(form);
 let calls=0;form.close=()=>{calls++;nativeClose();throw Error('EngineError');};
 assert.throws(()=>click('menu.apply'),/EngineError/);assert.equal(form.showing,false);
 assert.doesNotThrow(()=>{click('menu.apply');click('menu.cancel');field('menu.color').value.setData(3);});
 assert.equal(await result,undefined);assert.equal(calls,1);
 assert.ok(form.controls.filter((c:any)=>c.value).every((c:any)=>c.value.callbacks.size===0));
});

test('a released session remains unable to Apply when native close initially fails',async()=>{
 let valid=true,release:()=>void=()=>{};
 const result=chooseFinish({},tiles,0,()=>valid,(callback:()=>void)=>{release=callback;return ()=>{};});
 const form=current,nativeClose=form.close.bind(form);let calls=0;
 form.close=()=>{if(++calls===1)throw Error('EngineError');nativeClose();};
 valid=false;assert.throws(release,/EngineError/);assert.equal(form.showing,true);
 assert.doesNotThrow(()=>click('menu.apply'));assert.equal(form.showing,false);
 assert.equal(await result,undefined);assert.equal(calls,2);
});

test('mixed notice distinguishes actual finishes from per-module contour and centre roles',async()=>{
 const positions=Array.from({length:14},(_,i)=>({position:{x:i%7,y:0,z:Math.floor(i/7)},stone:0,cloth:0,frontal:0,facing:0,edges:15}));
 for(const design of DESIGNS){
  const uniform=planFinish(positions,{stone:0,cloth:0,ornamental:true,facing:1,design:design.id});
  const result=chooseFinish({},uniform,1);
  assert.equal(field('menu.mixed'),undefined,design.id);click('menu.cancel');await result;
 }
 const classic=planFinish(positions,{stone:0,cloth:1,ornamental:true,facing:0});
 let result=chooseFinish({},classic,0);assert.equal(field('menu.mixed'),undefined);click('menu.cancel');await result;
 for(const patch of [{stone:1},{cloth:2},{facing:1},{design:'altare:a_ogive_marble_ruby_cross'}]){
  const mixed=classic.map((tile,i)=>i===0?{...tile,...patch}:tile),before=structuredClone(mixed);
  result=chooseFinish({},mixed,0);assert.equal(field('menu.mixed')?.kind,'label');click('menu.cancel');await result;assert.deepEqual(mixed,before);
 }
});

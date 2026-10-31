import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGNS} from '../src/domain/catalog.ts';
import {customizationFromFinish, customizationFinish, changeCustomization, customizationCapabilities} from '../src/domain/customization.ts';

test('every published design reopens and applies with exactly the same identity', () => {
  for (const design of DESIGNS) {
    const finish = {stone:0, cloth:0, ornamental:false, facing:3, design:design.id};
    assert.deepEqual(customizationFinish(customizationFromFinish(finish)), {...finish,facing:design.codec==='symmetric'?0:finish.facing});
  }
  for (let stone=0; stone<3; stone++) for (let cloth=0; cloth<5; cloth++) for (const ornamental of [false,true]) {
    const finish = {stone, cloth, ornamental, facing:2};
    assert.deepEqual(customizationFinish(customizationFromFinish(finish)), finish);
  }
});
test('model and textile changes preserve compatible choices and retain suspended relief', () => {
  const original = customizationFromFinish({stone:1,cloth:4,ornamental:true,facing:1});
  let draft = changeCustomization(original, {model:'trestle',surface:'walnut',textile:'floral',relief:'cross'});
  draft = changeCustomization(draft,{color:'purple'});
  assert.equal(customizationCapabilities(draft).relief,false);
  assert.equal(customizationFinish(draft).design,'altare:l_trestle_walnut_purple');
  draft = changeCustomization(draft,{model:'ogive'});
  assert.equal(draft.color,'purple'); assert.equal(draft.surface,'walnut');
  draft = changeCustomization(draft,{textile:'agnus'});
  assert.equal(customizationFinish(draft).design,'altare:a_ogive_walnut_agnus_cross');
  draft = changeCustomization(draft,{model:'classic'});
  assert.equal(customizationFinish(draft).design,'altare:u_classic_agnus');assert.equal(draft.stone,original.stone);assert.equal(draft.ornamental,original.ornamental);
});
test('one floral textile resolves red relief variants and all eight plain colors', () => {
  const original = customizationFromFinish({stone:0,cloth:0,ornamental:false,facing:0});
  for (const color of ['white','red','green','purple','rose','black','gold','silver'] as const) {
    const draft = changeCustomization(original,{model:'pilaster',textile:'floral',color});
    const resolved = customizationFromFinish(customizationFinish(draft));
    assert.equal(resolved.textile,'floral'); assert.equal(resolved.color,color);
  }
  assert.throws(()=>changeCustomization(original,{facing:NaN}),/configuration/);
  assert.throws(()=>changeCustomization(original,{textile:'future' as never}),/configuration/);
});

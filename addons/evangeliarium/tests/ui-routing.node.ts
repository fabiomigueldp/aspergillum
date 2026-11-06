import {test} from 'node:test';
import assert from 'node:assert/strict';
import {definitions,bridge} from '../assets-src/ui/design.mjs';
import contract from '../assets-src/ui/contract.json' with {type:'json'};

// Small, deliberately strict evaluator for the fully parenthesized subset used
// by these bindings. This is not a Minecraft renderer or a JSON UI emulator.
function evaluate(expression:string,title:string):string|boolean {
 const tokens=expression.match(/'[^']*'|#[a-z_]+|\(|\)|\bnot\b|\band\b|\bor\b|=|-/g)??[];
 let index=0;
 function take(expected:string){assert.equal(tokens[index++],expected,expression);}
 function value():string|boolean {
  const token=tokens[index++];
  if(token==='#title_text')return title;
  if(token?.startsWith("'"))return token.slice(1,-1);
  assert.equal(token,'(',expression);
  if(tokens[index]==='not'){index++;const result=!value();take(')');return result;}
  const left=value(),operator=tokens[index++],right=value();take(')');
  switch(operator){
   case '-':return String(left).replace(String(right),'');
   case '=':return left===right;
   case 'and':return Boolean(left&&right);
   case 'or':return Boolean(left||right);
   default:assert.fail(`Unexpected operator ${operator}`);
  }
 }
 const result=value();assert.equal(index,tokens.length,'Every token must be consumed');return result;
}
function visible(control:any,title:string){
 const binding=control.bindings.find((b:any)=>b.target_property_name==='#visible');
 assert.equal(control.visible,false,'Routed branches start hidden until the title binding resolves');
 return evaluate(binding.source_property_name,title);
}
const ui:any=definitions();
test('every book form selects exactly one long-form skin, including sequential changes',()=>{
 const cases=[['',0],['Other addon',0],[contract.readerPrefix+'Saudação',1],[contract.menuPrefix+'Seções',2],[contract.catalogPrefix+'Ordenação',3],['Other addon again',0],[contract.readerPrefix+'Evangelho',1]] as const;
 for(const [title,expected] of cases){
  const routes=ui.long_router.controls.map((row:any)=>visible(Object.values(row)[0],title));
  assert.deepEqual(routes,[0,1,2,3].map(index=>index===expected),title);
 }
});
test('modal forms select one skin and unmarked forms retain vanilla',()=>{
 for(const title of ['Date',...Object.values(contract).filter(value=>typeof value==='string').map(prefix=>prefix+'Data')]){
  const routes=ui.modal_router.controls.map((row:any)=>visible(Object.values(row)[0],title));
  assert.deepEqual(routes,title==='Date'?[true,false]:[false,true]);
 }
});
test('all titles remove the internal marker without modifying their wording',()=>{
 const heading=ui.reader_frame.controls.find((row:any)=>row.heading).heading;
 const expression=heading.bindings.find((b:any)=>b.target_property_name==='#ev_title').source_property_name;
 for(const prefix of [contract.readerPrefix,contract.menuPrefix,contract.catalogPrefix])assert.equal(evaluate(expression,prefix+'Saudação'), 'Saudação');
});
test('one native factory and confined fallback controls preserve other addon forms',()=>{
 const main:any=bridge().main_screen_content;
 assert.equal(main.controls.length,1);
 assert.deepEqual(main.controls[0].server_form_factory.control_ids,{long_form:'@evangeliarium_ui.long_router',custom_form:'@evangeliarium_ui.modal_router'});
 assert.deepEqual(ui.long_router.controls[0].native_container.controls,[{'native@server_form.long_form':{}}]);
 assert.deepEqual(ui.modal_router.controls[0].native_container.controls,[{'native@server_form.custom_form':{}}]);
});

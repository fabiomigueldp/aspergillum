import {build} from 'esbuild';
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
export let current:any;
function requireClientWritable(value:Observable<unknown>,binding:string){
  if(!value.clientWritable){
    const error=new Error(`Expect '${binding}' observable to be client writable.`);
    error.name='InvalidObservableError';throw error;
  }
}
class Form {
  controls:any[]=[]; showing=false; resolve:(value:unknown)=>void=()=>{};
  title:any;
  constructor(_player?:unknown,title?:any){this.title=title;current=this;}
  header(text:any,options:any={}){this.controls.push({kind:'header',label:text.translate,options});return this;}
  label(text:any,options:any={}){this.controls.push({kind:'label',label:text.translate,options});return this;}
  spacer(options:any={}){this.controls.push({kind:'spacer',options});return this;}
  divider(){this.controls.push({kind:'divider'});return this;}
  dropdown(label:any,value:any,items:any,options:any={}){requireClientWritable(value,'dropdown value');this.controls.push({kind:'dropdown',label:label.translate,value,items,options});return this;}
  toggle(label:any,value:any,options:any={}){requireClientWritable(value,'toggle value');this.controls.push({kind:'toggle',label:label.translate,value,options});return this;}
  button(label:any,callback:()=>void,options:any={}){this.controls.push({kind:'button',label:label.translate,callback,options});return this;}
  isShowing(){return this.showing;}
  show(){this.showing=true;return new Promise(resolve=>{this.resolve=resolve;});}
  close(){if(!this.showing)throw Error('FormVisibilityError');this.showing=false;this.resolve(undefined);}
}
(globalThis as any).__altareTestUI={CustomForm:Form,ObservableBoolean:Observable,ObservableNumber:Observable,ObservableUIRawMessage:Observable};
const bundled=await build({entryPoints:[new URL('../../src/presentation/menu.ts',import.meta.url).pathname.replace(/^\/(.:)/,'$1')],bundle:true,format:'esm',platform:'node',write:false,plugins:[{
 name:'native-ui-double',setup(b){b.onResolve({filter:/^@minecraft\/server-ui$/},()=>({path:'ui',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const {CustomForm,ObservableBoolean,ObservableNumber,ObservableUIRawMessage}=globalThis.__altareTestUI;'}));},
}]});
export const {chooseFinish}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0]!.text+'\n//# sourceURL=altare-menu-test.mjs').toString('base64'));

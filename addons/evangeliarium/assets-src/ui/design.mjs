import contract from './contract.json' with {type:'json'};

// OKLCH source tokens; the pack receives sRGB values supported by Bedrock.
const tokens={paper:[.945,.025,85],paperEdge:[.83,.035,80],ink:[.275,.016,45],wine:[.32,.075,20],winePressed:[.25,.055,20],gold:[.66,.074,80],line:[.77,.034,80],button:[.90,.028,85]};
const srgb=x=>Math.max(0,Math.min(1,x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055));
const convert=([L,C,h])=>{const a=C*Math.cos(h*Math.PI/180),b=C*Math.sin(h*Math.PI/180),l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(srgb);};
export const colors=Object.fromEntries(Object.entries(tokens).map(([k,v])=>[k,convert(v)]));
const rgb=name=>colors[name].map(v=>Math.round(v*255));
export function texture(name){
 const size=name==='rule'?8:32,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const edge=Math.min(x,y,size-1-x,size-1-y);let color;
  if(name==='paper')color=edge<2?'wine':edge===2?'gold':edge<5?'paperEdge':'paper';
  else if(name==='button')color=edge===0?'line':'button';
  else if(name==='hover')color=edge===0?'gold':'wine';
  else if(name==='pressed')color=edge===0?'gold':'winePressed';
  else color='line';
  pixels.set([...rgb(color),255],(y*size+x)*4);
 }
 return{width:size,height:size,pixels};
}
const ns='evangeliarium_ui',tex=name=>'textures/evangeliarium/ui/'+name;
const view=(expression,target='#visible')=>({binding_type:'view',source_property_name:expression,target_property_name:target});
const selected=prefix=>`(not (#title_text = (#title_text - '${prefix}')))`;
const any=`(${selected(contract.readerPrefix)} or ${selected(contract.menuPrefix)} or ${selected(contract.catalogPrefix)})`;
const native=`((#title_text = (#title_text - '${contract.readerPrefix}')) and (#title_text = (#title_text - '${contract.menuPrefix}')) and (#title_text = (#title_text - '${contract.catalogPrefix}')))`;
const visible=expr=>[{binding_name:'#title_text'},view(expr)];
const label=(text,size=['100%','default'],extra={})=>({type:'label',text,size,layer:3,color:colors.ink,shadow:false,text_alignment:'left',anchor_from:'top_left',anchor_to:'top_left',...extra});
const picture=(name,size,extra={})=>({type:'image',texture:tex(name),size,keep_ratio:false,...extra});
const control=(name,data)=>({[name]:data});
const state=(background,light=false,multiline=false)=>({type:'panel',size:['100%','100%'],controls:[control('surface',picture(background,['100%','100%'],{nineslice_size:2})),control('text',label('#form_button_text',[multiline?'100% - 12px':'100% - 8px',multiline?40:12],{color:light?colors.paper:colors.ink,anchor_from:'center',anchor_to:'center',text_alignment:'center',bindings:[{binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'}]}))]});
function frame(content,reader=false){
 return{type:'panel',size:['92%','90%'],max_size:[reader?400:330,reader?340:282],layer:2,controls:[
  control('paper',picture('paper',['100%','100%'],{nineslice_size:8})),
  control('heading',label('#ev_title',['100% - 74px',22],{offset:[25,19],font_scale_factor:1.25,color:colors.wine,bindings:[{binding_name:'#title_text'},view(`(#title_text - '${contract.readerPrefix}' - '${contract.menuPrefix}' - '${contract.catalogPrefix}')`,'#ev_title')]})),
  control('close@common.close_button',{$close_button_offset:[-12,11]}),
  control('rule',picture('rule',['100% - 50px',1],{nineslice_size:1,anchor_from:'top_left',anchor_to:'top_left',offset:[25,42]})),
  control('inside_header_panel@common.scrolling_panel',{anchor_from:'top_left',anchor_to:'top_left',offset:[25,52],size:['100% - 50px',reader?'100% - 106px':'100% - 74px'],$show_background:false,$scrolling_content:ns+'.'+content,$scroll_size:[3,'100%'],$scrolling_pane_size:['100%','100%'],$scroll_bar_right_padding_size:[0,0],$allow_scrolling_even_when_content_fits:false}),
  ...(reader?[control('navigation', {type:'stack_panel',orientation:'horizontal',size:['100% - 44px',28],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,-16],collection_name:'form_buttons',controls:[0,1,2].map(i=>control('slot'+i+'@'+ns+'.nav_cell',{collection_index:i}))})]:[])
 ]};
}
export function definitions(){
 const d={namespace:ns};
 d.long_router={type:'panel',size:['100%','100%'],controls:[
  control('native_container',{type:'panel',size:['100%','100%'],bindings:visible(native),controls:[control('native@server_form.long_form',{})]}),
  control('reader@'+ns+'.reader_frame',{bindings:visible(selected(contract.readerPrefix))}),
  control('menu@'+ns+'.menu_frame',{bindings:visible(selected(contract.menuPrefix))}),
  control('catalog@'+ns+'.catalog_frame',{bindings:visible(selected(contract.catalogPrefix))})
 ]};
 d.modal_router={type:'panel',size:['100%','100%'],controls:[control('native_container',{type:'panel',size:['100%','100%'],bindings:visible(native),controls:[control('native@server_form.custom_form',{})]}),control('input@'+ns+'.modal_frame',{bindings:visible(any)})]};
 d.catalog_frame=frame('catalog');
 d.reader_frame=frame('reading',true);d.menu_frame=frame('menu');d.modal_frame=frame('input');d.modal_frame.max_size=[330,230];
 d.reading={type:'stack_panel',orientation:'vertical',size:['100% - 8px','100%c'],anchor_from:'top_left',anchor_to:'top_left',controls:[control('text',label('#form_text',['100%','default'],{line_padding:2}))]};
 d.menu={type:'stack_panel',orientation:'vertical',size:['100% - 6px','100%c'],anchor_from:'top_left',anchor_to:'top_left',controls:[
  control('context',label('#form_text',['100%','default'],{line_padding:2,bindings:[{binding_name:'#form_text'},view("(not (#form_text = ''))")]})),control('space',{type:'panel',size:['100%',8],bindings:[{binding_name:'#form_text'},view("(not (#form_text = ''))")]}),
  control('choices',{type:'stack_panel',orientation:'vertical',size:['100%','100%c'],factory:{name:'buttons',control_ids:{button:ns+'.menu_cell',label:'@server_form.dynamic_label',header:'@server_form.dynamic_header',divider:'@settings_common.option_group_section_divider'}},collection_name:'form_buttons',bindings:[{binding_name:'#form_button_contents',binding_name_override:'#collection_length'}]})
 ]};
 d['choice@common.button']={size:['100% - 4px',26],$pressed_button_name:'button.form_button_click',$button_tts_header:'#form_button_text',bindings:[{binding_type:'collection_details',binding_collection_name:'form_buttons'},{binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'},view("(not (#form_button_text = ''))")],controls:[control('default',state('button')),control('hover',state('hover',true)),control('pressed',state('pressed',true))]};
 // Only the large liturgical indices use multiline rows; existing Gospel menus stay unchanged.
 d.catalog=structuredClone(d.menu);
 d.catalog.controls.find(c=>c.choices).choices.factory.control_ids.button=ns+'.catalog_cell';
 d['catalog_choice@common.button']={...structuredClone(d['choice@common.button']),size:['100%',50],controls:[control('default',state('button',false,true)),control('hover',state('hover',true,true)),control('pressed',state('pressed',true,true))]};
 d.catalog_cell={type:'panel',size:['100%',56],controls:[control('button@'+ns+'.catalog_choice',{})]};
 d.nav_cell={type:'panel',size:['33.333%',28],controls:[control('button@'+ns+'.choice',{})]};
 d.menu_cell={type:'panel',size:['100%',32],controls:[control('button@'+ns+'.choice',{size:['100%',27]})]};
 d.input={type:'stack_panel',orientation:'vertical',size:['100% - 6px','100%c'],anchor_from:'top_left',anchor_to:'top_left',$main_header_text_color:colors.ink,controls:[
  control('fields',{type:'stack_panel',orientation:'vertical',size:['100%','100%c'],collection_name:'custom_form',factory:{name:'buttons',control_ids:{input:'@'+ns+'.input_field',dropdown:'@'+ns+'.dropdown',label:'@'+ns+'.field_label'}},bindings:[{binding_name:'#custom_form_length',binding_name_override:'#collection_length'}]}),control('space',{type:'panel',size:['100%',10]}),
  control('submit@'+ns+'.submit',{})
 ]};
 d['input_field@server_form.custom_input']={$main_header_text_color:colors.ink};
 d['dropdown@server_form.custom_dropdown']={$main_header_text_color:colors.ink};
 d.field_label=label('#custom_text',['100%','default'],{line_padding:2,bindings:[{binding_name:'#custom_text',binding_type:'collection',binding_collection_name:'custom_form'}]});
 const submitState=(background,light=false)=>({type:'panel',size:['100%','100%'],controls:[control('surface',picture(background,['100%','100%'],{nineslice_size:2})),control('text',label('#submit_text',['100% - 8px',12],{color:light?colors.paper:colors.ink,anchor_from:'center',anchor_to:'center',text_alignment:'center',bindings:[{binding_name:'#submit_text'}]}))]});
 d['submit@common.button']={size:['100%',28],$pressed_button_name:'button.submit_custom_form',$button_tts_header:'#submit_text',bindings:[{binding_name:'#submit_button_visible',binding_name_override:'#visible'}],controls:[control('default',submitState('button')),control('hover',submitState('hover',true)),control('pressed',submitState('pressed',true))]};
 return d;
}
export function bridge(){return{namespace:'server_form',main_screen_content:{type:'panel',size:['100%','100%'],controls:[control('server_form_factory',{type:'factory',size:['100%','100%'],control_ids:{long_form:'@'+ns+'.long_router',custom_form:'@'+ns+'.modal_router'}})]}};}

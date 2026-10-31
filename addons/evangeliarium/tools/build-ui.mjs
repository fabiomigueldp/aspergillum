import {PNG} from 'pngjs';
import {definitions,bridge,texture} from '../assets-src/ui/design.mjs';
export function buildUi(write,json){
 for(const name of ['paper','button','hover','pressed','rule']){const source=texture(name),image=new PNG({width:source.width,height:source.height});image.data.set(source.pixels);write(`packs/resource/textures/evangeliarium/ui/${name}.png`,PNG.sync.write(image));}
 json('packs/resource/ui/evangeliarium.json',definitions());
 json('packs/resource/ui/server_form.json',bridge());
 json('packs/resource/ui/_ui_defs.json',{ui_defs:['ui/evangeliarium.json']});
}

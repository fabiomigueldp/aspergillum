export class ObservableString{constructor(value){this.value=value;}getData(){return this.value;}setData(v){this.value=v;}}
export class ObservableBoolean extends ObservableString{}
export class ObservableNumber extends ObservableString{}
export const forms=[];
export const FormCancelationReason={UserClosed:'UserClosed',UserBusy:'UserBusy'};
class Form{
 buttons=[];inputs=[];labels=[];showing=false;
 title(value){this.heading=value;return this;}
 body(value){this.text=value;return this;}
 label(value){this.labels.push(value);return this;}
 show(player){this.player=player;this.showing=true;forms.push(this);return new Promise(r=>{this.resolve=r;});}
 respond(value){this.showing=false;this.resolve?.(value);}
}
export class ActionFormData extends Form{button(label){this.buttons.push(label);return this;}}
export class ModalFormData extends Form{
 textField(label,placeholder,options){this.inputs.push({label,placeholder,options});return this;}
 dropdown(label,items,options){this.inputs.push({label,items,options});return this;}
 submitButton(label){this.submit=label;return this;}
}
export const uiManager={closeAllForms(player){for(const f of forms)if(f.showing&&f.player===player)f.respond({canceled:true,cancelationReason:'UserClosed'});}};
export class CustomForm{
 static forms=[];buttons=[];labels=[];inputs=[];showing=false;
 constructor(player,title){this.player=player;this.title=title;CustomForm.forms.push(this);}
 button(label,callback,options={}){this.buttons.push({label,callback,options});return this;}
 label(value){this.labels.push(value);return this;}header(value){return this.label(value);}
 textField(label,value){this.inputs.push({label,value});return this;}
 dropdown(label,value,options){this.inputs.push({label,value,options});return this;}
 closeButton(){return this;}
 show(){this.showing=true;return new Promise(r=>{this.resolve=r;});}
 isShowing(){return this.showing;}
 close(){this.showing=false;this.resolve?.('closed');}
}

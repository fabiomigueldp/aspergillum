export interface EditSession { id:number; player:string; dimension:string; keys:readonly string[]; expires:number }
export class EditSessions {
  private next=1;
  private players=new Map<string,EditSession>();
  private cells=new Map<string,EditSession>();
  private closing=new WeakMap<EditSession,Set<()=>void>>();
  onRelease(session:EditSession,callback:()=>void):()=>void {
    if(this.players.get(session.player)!==session){callback();return ()=>{};}
    let handlers=this.closing.get(session);
    if(!handlers){handlers=new Set();this.closing.set(session,handlers);}
    handlers.add(callback);return ()=>handlers!.delete(callback);
  }
  acquire(player:string,dimension:string,keys:readonly string[],tick:number):EditSession|undefined {
    for(const session of this.players.values())if(tick>=session.expires)this.release(session);
    if(this.players.has(player)||keys.some(k=>this.cells.has(`${dimension}:${k}`)))return undefined;
    const session={id:this.next++,player,dimension,keys:[...keys],expires:tick+1200};
    this.players.set(player,session);for(const k of keys)this.cells.set(`${dimension}:${k}`,session);
    return session;
  }
  isCurrent(session:EditSession,tick:number):boolean {
    if(tick>=session.expires){this.release(session);return false;}
    return this.players.get(session.player)===session;
  }
  release(session:EditSession):void {
    if(this.players.get(session.player)!==session)return;
    this.players.delete(session.player);for(const k of session.keys)if(this.cells.get(`${session.dimension}:${k}`)===session)this.cells.delete(`${session.dimension}:${k}`);
    const handlers=this.closing.get(session);this.closing.delete(session);
    for(const callback of handlers??[])try{callback();}catch{/* Closing a view cannot retain a world lock. */}
  }
  releasePlayer(player:string):void { const session=this.players.get(player);if(session)this.release(session); }
  invalidate(dimension:string,key:string):void { const session=this.cells.get(`${dimension}:${key}`);if(session)this.release(session); }
}

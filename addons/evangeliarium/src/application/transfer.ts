/** Synchronous transaction. Persistent journal and compensation are provided by the world adapter. */
export interface TransferPort {
  validate():void;
  prepare():void;
  removeSource():void;
  writeDestination():void;
  commit():void;
  restoreSource():void;
  clearDestination():void;
  abort():void;
}
export function transfer(port:TransferPort):void{
  port.validate();port.prepare();
  let removed=false,destinationAttempted=false;
  try{
    port.removeSource();removed=true;
    destinationAttempted=true;port.writeDestination();port.commit();
  }catch(error){
    // If compensation fails the journal remains for reconciliation; never erase its evidence.
    if(destinationAttempted)port.clearDestination();
    if(removed)port.restoreSource();
    port.abort();throw error;
  }
}

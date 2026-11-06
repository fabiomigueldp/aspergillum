import catalog from '../../assets-src/catalog/items.json';
export type BookId = 'gospel' | 'missal' | 'pontifical' | 'lectionary';
export interface BookDefinition {id:string;localId:string;bookId:BookId;name:string;icon:string;blockId:string;visualId:string}
export const BOOKS = catalog.items as BookDefinition[];
export const bookByItem = (id:string|undefined):BookDefinition|undefined => BOOKS.find(b=>b.id===id);
export const bookByBlock = (id:string|undefined):BookDefinition|undefined => BOOKS.find(b=>b.blockId===id);
export const bookByVisual = (id:string|undefined):BookDefinition|undefined => BOOKS.find(b=>b.visualId===id);
export const bookDefinition = (id:BookId):BookDefinition => BOOKS.find(b=>b.bookId===id)!;

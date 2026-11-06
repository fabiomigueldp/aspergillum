import {ReadingError} from './scripture.ts';
export interface ReadingOption {label:string;reference:string;sourceReference:string;expanded:boolean}
export interface CalendarDay {date:string;celebration:string;readings:ReadingOption[];noDaytimeMass?:boolean}
export type Calendar=Record<string,CalendarDay>;
export function brazilDate(timestamp:number):string{
  if(!Number.isFinite(timestamp))throw new ReadingError('Data indisponível.');
  // Shared fixed Brasília UTC−03 policy. Never use world ticks, host timezone or client locale.
  // Historical DST and future legal timezone changes are not reconstructed.
  return new Date(timestamp-3*3600_000).toISOString().slice(0,10);
}
export function parseDate(input:string):string{
  let value=input.trim();const br=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if(br)value=`${br[3]}-${br[2]}-${br[1]}`;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ReadingError('Use dia/mês/ano.');
  const timestamp=Date.parse(value+'T12:00:00Z');
  if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==value)throw new ReadingError('Confira a data.');
  return value;
}
export function dayFor(date:string,calendar:Calendar):CalendarDay{
  const day=calendar[parseDate(date)];
  if(!day)throw new ReadingError('Calendário disponível de 2026 a 2027.');return day;
}
export function displayDate(iso:string):string{return iso.split('-').reverse().join('/');}

import {PlayerPermissionLevel,world,type Player} from '@minecraft/server';
import {OrdoStore} from '../domain/ordo.ts';
import {ordoFormularies} from '../domain/ordo-votives.ts';
import {liturgy} from '../generated/liturgy.ts';
import {dateChoices} from '../domain/ordo-calendar.ts';
import {lectionary,lectionaryKeyToSection} from '../generated/lectionary.ts';
export const ORDO='evangeliarium:ordo';
export const ORDO_STATE='evangeliarium:ordo_state';
export function canConfigureOrdo(player:Player):boolean{return player.isValid&&player.playerPermissionLevel===PlayerPermissionLevel.Operator;}
export const ordo=new OrdoStore({read:()=>world.getDynamicProperty(ORDO_STATE),write:state=>world.setDynamicProperty(ORDO_STATE,JSON.stringify(state)),now:()=>Date.now(),votiveIds:new Set(ordoFormularies(liturgy.books.missal.sections).map(s=>s.id)),dateSelectionAllowed:selection=>dateChoices(selection.date,lectionary.book.sections,lectionaryKeyToSection).some(c=>c.selection.key===selection.key&&c.selection.mass===selection.mass)});

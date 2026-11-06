import {sectionGroups,type LiturgySection} from './liturgy.ts';
/** Existing Mass formularies for explicit operator composition.
 * Saint Therese is the supplied memorial proper, not an invented votive Mass.
 * No reading relationship is inferred from a title or dedication.
 */
export function ordoFormularies(sections:LiturgySection[]):LiturgySection[]{
 return sections.filter(section=>(sectionGroups(section).includes('Missas Votivas')&&section.title!=='Missas Votivas')||section.id==='missal--santa-teresa-do-menino-jesus');
}

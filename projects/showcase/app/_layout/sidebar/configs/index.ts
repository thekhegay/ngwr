export { ANIMATIONS_SIDEBAR } from './animations.config';
export { GUIDES_SIDEBAR } from './guides.config';
export { ICONS_SIDEBAR } from './icons.config';
export { REFERENCE_SIDEBAR } from './reference.config';
export { START_SIDEBAR } from './start.config';

/**
 * Reference has ONE sidebar, and `/reference` attaches it (see `routing.ts`).
 *
 * The seven cluster routes in `reference/reference.routing.ts` still set a
 * `data.sidebar` of their own, and the sidebar reads the DEEPEST one, so those
 * seven names have to keep resolving — to the same nav, or the section changes
 * shape as you move between clusters, which is the thing this restructure
 * removes. They are aliases rather than seven configs: the rows live in
 * `<cluster>.config.ts` and are assembled once in `reference.config.ts`.
 * Dropping the seven `data.sidebar` entries makes these aliases dead; the
 * parent attachment already covers every `/reference/*` page.
 */
export {
  REFERENCE_SIDEBAR as COMPONENTS_SIDEBAR,
  REFERENCE_SIDEBAR as DIRECTIVES_SIDEBAR,
  REFERENCE_SIDEBAR as INTERFACES_SIDEBAR,
  REFERENCE_SIDEBAR as PIPES_SIDEBAR,
  REFERENCE_SIDEBAR as SERVICES_SIDEBAR,
  REFERENCE_SIDEBAR as UTILS_SIDEBAR,
  REFERENCE_SIDEBAR as VALIDATORS_SIDEBAR,
} from './reference.config';

import type { SidebarGroup } from '../sidebar.types';

/**
 * The Validators group of the Reference sidebar — one row per `WrValidators`
 * member. Flat and alphabetical for the same reason as {@link UTILS_GROUP}:
 * the cluster is a top-level group now, and the sidebar renders two levels.
 */
export const VALIDATORS_GROUP: SidebarGroup = {
  title: 'Validators',
  children: [
    { title: 'cardNumber', url: ['/reference/validators', 'card-number'] },
    { title: 'cvc', url: ['/reference/validators', 'cvc'] },
    { title: 'hexColor', url: ['/reference/validators', 'hex-color'] },
    { title: 'iban', url: ['/reference/validators', 'iban'] },
    { title: 'match', url: ['/reference/validators', 'match'] },
    { title: 'matchFields', url: ['/reference/validators', 'match-fields'] },
    { title: 'maxDate', url: ['/reference/validators', 'max-date'] },
    { title: 'minDate', url: ['/reference/validators', 'min-date'] },
    { title: 'noWhitespace', url: ['/reference/validators', 'no-whitespace'] },
    { title: 'oneOf', url: ['/reference/validators', 'one-of'] },
    { title: 'url', url: ['/reference/validators', 'url'] },
  ],
};

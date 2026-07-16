import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/reference/validators/*` — one row per `WrValidators` member, grouped by purpose. */
export const VALIDATORS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Cross-control',
    children: [
      { title: 'match', url: ['/reference/validators', 'match'] },
      { title: 'oneOf', url: ['/reference/validators', 'one-of'] },
    ],
  },
  {
    title: 'Dates',
    children: [
      { title: 'maxDate', url: ['/reference/validators', 'max-date'] },
      { title: 'minDate', url: ['/reference/validators', 'min-date'] },
    ],
  },
  {
    title: 'Network & payments',
    children: [
      { title: 'cardNumber', url: ['/reference/validators', 'card-number'] },
      { title: 'cvc', url: ['/reference/validators', 'cvc'] },
      { title: 'iban', url: ['/reference/validators', 'iban'] },
      { title: 'url', url: ['/reference/validators', 'url'] },
    ],
  },
  {
    title: 'String shape',
    children: [
      { title: 'hexColor', url: ['/reference/validators', 'hex-color'] },
      { title: 'noWhitespace', url: ['/reference/validators', 'no-whitespace'] },
    ],
  },
];

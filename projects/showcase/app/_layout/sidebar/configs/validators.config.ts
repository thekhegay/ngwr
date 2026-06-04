import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/validators/*` — one row per `WrValidators` member, grouped by purpose. */
export const VALIDATORS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'String shape',
    children: [
      { title: 'email', url: ['/validators', 'email'] },
      { title: 'noWhitespace', url: ['/validators', 'no-whitespace'] },
      { title: 'hexColor', url: ['/validators', 'hex-color'] },
    ],
  },
  {
    title: 'Network & payments',
    children: [
      { title: 'url', url: ['/validators', 'url'] },
      { title: 'cardNumber', url: ['/validators', 'card-number'] },
      { title: 'cvc', url: ['/validators', 'cvc'] },
      { title: 'iban', url: ['/validators', 'iban'] },
    ],
  },
  {
    title: 'Cross-control',
    children: [
      { title: 'match', url: ['/validators', 'match'] },
      { title: 'oneOf', url: ['/validators', 'one-of'] },
    ],
  },
  {
    title: 'Dates',
    children: [
      { title: 'minDate', url: ['/validators', 'min-date'] },
      { title: 'maxDate', url: ['/validators', 'max-date'] },
    ],
  },
];

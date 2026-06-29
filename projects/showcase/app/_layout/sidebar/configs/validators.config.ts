import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/validators/*` — one row per `WrValidators` member, grouped by purpose. */
export const VALIDATORS_SIDEBAR: readonly SidebarGroup[] = [
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
      { title: 'maxDate', url: ['/validators', 'max-date'] },
      { title: 'minDate', url: ['/validators', 'min-date'] },
    ],
  },
  {
    title: 'Network & payments',
    children: [
      { title: 'cardNumber', url: ['/validators', 'card-number'] },
      { title: 'cvc', url: ['/validators', 'cvc'] },
      { title: 'iban', url: ['/validators', 'iban'] },
      { title: 'url', url: ['/validators', 'url'] },
    ],
  },
  {
    title: 'String shape',
    children: [
      { title: 'hexColor', url: ['/validators', 'hex-color'] },
      { title: 'noWhitespace', url: ['/validators', 'no-whitespace'] },
    ],
  },
];

import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/guides/translations/*` — the `WrI18n` service tour. */
export const TRANSLATE_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Overview',
    url: ['/guides/translations', 'overview'],
  },
  {
    title: 'Getting started',
    children: [
      { title: 'Setup & loaders', url: ['/guides/translations', 'setup'] },
      { title: 'Usage in templates', url: ['/guides/translations', 'usage'] },
    ],
  },
  {
    title: 'Advanced',
    children: [
      { title: 'Interpolation', url: ['/guides/translations', 'interpolation'] },
      { title: 'Scopes', url: ['/guides/translations', 'scopes'] },
    ],
  },
  {
    title: 'Reference',
    // Leaves the guide on purpose: the API table is maintained once, in
    // reference. A guide that keeps its own copy is how the two drifted apart
    // in the first place — this one was more complete than the "real" one.
    children: [{ title: 'WrI18n API', url: ['/reference/services', 'i18n'] }],
  },
];

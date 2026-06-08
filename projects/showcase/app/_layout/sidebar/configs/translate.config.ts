import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/translate/*` — the `WrI18n` service tour. */
export const TRANSLATE_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Overview',
    url: ['/translate', 'overview'],
  },
  {
    title: 'Get started',
    children: [
      { title: 'Setup & loaders', url: ['/translate', 'setup'] },
      { title: 'Usage in templates', url: ['/translate', 'usage'] },
    ],
  },
  {
    title: 'Advanced',
    children: [
      { title: 'Scopes', url: ['/translate', 'scopes'] },
      { title: 'Interpolation', url: ['/translate', 'interpolation'] },
    ],
  },
  {
    title: 'Reference',
    children: [{ title: 'API', url: ['/translate', 'api'] }],
  },
];

import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const t = ROUTES.guides.typography;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.overview.path },
  { path: t.overview.path, loadComponent: () => import('./overview/overview') },
  { path: t.headings.path, loadComponent: () => import('./headings/headings') },
  { path: t.paragraphs.path, loadComponent: () => import('./paragraphs/paragraphs') },
  { path: t.lists.path, loadComponent: () => import('./lists/lists') },
  { path: t.links.path, loadComponent: () => import('./links/links') },
  // Pre-flowbite name for the paragraphs page.
  { path: t.text.path, redirectTo: t.paragraphs.path },
  { path: t.code.path, loadComponent: () => import('./code/code') },
  // `<wr-kbd>` ships from `ngwr/keyboard`, not `ngwr/typography` — this page
  // only ever sat here because keycaps show up in prose. Install, sizes and
  // the API were a second copy of the component reference; the one demo it
  // owned (a cap inline in a paragraph) moved there with it.
  { path: t.keyboard.path, redirectTo: '/reference/components/keyboard' },
] satisfies Routes;

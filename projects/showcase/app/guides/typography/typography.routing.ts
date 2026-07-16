import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.typography;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.overview },
  { path: t.overview, loadComponent: () => import('./overview/overview') },
  { path: t.headings, loadComponent: () => import('./headings/headings') },
  { path: t.paragraphs, loadComponent: () => import('./paragraphs/paragraphs') },
  { path: t.lists, loadComponent: () => import('./lists/lists') },
  { path: t.links, loadComponent: () => import('./links/links') },
  // Pre-flowbite name for the paragraphs page.
  { path: t.text, redirectTo: t.paragraphs },
  { path: t.code, loadComponent: () => import('./code/code') },
  // `<wr-kbd>` ships from `ngwr/keyboard`, not `ngwr/typography` — this page
  // only ever sat here because keycaps show up in prose. Install, sizes and
  // the API were a second copy of the component reference; the one demo it
  // owned (a cap inline in a paragraph) moved there with it.
  { path: t.keyboard, redirectTo: '/reference/components/keyboard' },
] satisfies Routes;

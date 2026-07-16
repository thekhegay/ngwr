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
  { path: t.keyboard, loadComponent: () => import('./keyboard/keyboard') },
] satisfies Routes;

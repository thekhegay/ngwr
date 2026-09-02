import type { Routes } from '@angular/router';

import { routes } from '#routing';

const directives = routes.directives;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: directives.affix, loadComponent: () => import('./affix/affix') },
  { path: directives.autofocus, loadComponent: () => import('./autofocus/autofocus') },
  { path: directives.autosize, loadComponent: () => import('./autosize/autosize') },
  { path: directives.clickOutside, loadComponent: () => import('./click-outside/click-outside') },
  { path: directives.copyToClipboard, loadComponent: () => import('./copy-to-clipboard/copy-to-clipboard') },
  { path: directives.typography, loadComponent: () => import('./typography/typography') },
] satisfies Routes;

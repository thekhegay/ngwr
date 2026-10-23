import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const directives = ROUTES.reference.directives;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: directives.affix.path, loadComponent: () => import('./affix/affix') },
  { path: directives.autofocus.path, loadComponent: () => import('./autofocus/autofocus') },
  { path: directives.autosize.path, loadComponent: () => import('./autosize/autosize') },
  { path: directives.clickOutside.path, loadComponent: () => import('./click-outside/click-outside') },
  { path: directives.copyToClipboard.path, loadComponent: () => import('./copy-to-clipboard/copy-to-clipboard') },
  { path: directives.typography.path, loadComponent: () => import('./typography/typography') },
] satisfies Routes;

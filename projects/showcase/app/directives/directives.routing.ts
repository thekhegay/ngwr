import type { Routes } from '@angular/router';

import { routes } from '#routing';

const directives = routes.directives;

export default [
  { path: '', pathMatch: 'full', redirectTo: directives.autofocus },
  { path: directives.autofocus, loadComponent: () => import('./autofocus/autofocus') },
  { path: directives.autosize, loadComponent: () => import('./autosize/autosize') },
  { path: directives.clickOutside, loadComponent: () => import('./click-outside/click-outside') },
  { path: directives.copyToClipboard, loadComponent: () => import('./copy-to-clipboard/copy-to-clipboard') },
] satisfies Routes;

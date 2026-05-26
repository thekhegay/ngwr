import type { Routes } from '@angular/router';

import { routes } from '#routing';

const directives = routes.directives;

export default [
  { path: '', pathMatch: 'full', redirectTo: directives.autofocus },
  { path: directives.autofocus, loadComponent: () => import('./autofocus/autofocus') },
  { path: directives.autosize, loadComponent: () => import('./autosize/autosize') },
  { path: directives.borderGlow, loadComponent: () => import('./border-glow/border-glow') },
  { path: directives.clickOutside, loadComponent: () => import('./click-outside/click-outside') },
  { path: directives.copyToClipboard, loadComponent: () => import('./copy-to-clipboard/copy-to-clipboard') },
  { path: directives.reveal, loadComponent: () => import('./reveal/reveal') },
  { path: directives.shimmer, loadComponent: () => import('./shimmer/shimmer') },
  { path: directives.spotlight, loadComponent: () => import('./spotlight/spotlight') },
  { path: directives.tilt, loadComponent: () => import('./tilt/tilt') },
] satisfies Routes;

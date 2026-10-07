import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const services = ROUTES.reference.services;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: services.theme.path, loadComponent: () => import('./theme/theme') },
  { path: services.tour.path, loadComponent: () => import('./tour/tour') },
  { path: services.scroll.path, loadComponent: () => import('./scroll/scroll') },
  { path: services.hotkey.path, loadComponent: () => import('./hotkey/hotkey') },
  { path: services.media.path, loadComponent: () => import('./media/media') },
  { path: services.platform.path, loadComponent: () => import('./platform/platform') },
  { path: services.meta.path, loadComponent: () => import('./meta/meta') },
  { path: services.storage.path, loadComponent: () => import('./storage/storage') },
  { path: services.i18n.path, loadComponent: () => import('./i18n/i18n') },
  { path: services.density.path, loadComponent: () => import('./density/density') },
  { path: services.clipboard.path, loadComponent: () => import('./clipboard/clipboard') },
  { path: services.cookie.path, loadComponent: () => import('./cookie/cookie') },
  { path: services.loadingBar.path, loadComponent: () => import('./loading-bar/loading-bar') },
] satisfies Routes;

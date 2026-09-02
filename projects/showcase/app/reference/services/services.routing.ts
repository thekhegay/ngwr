import type { Routes } from '@angular/router';

import { routes } from '#routing';

const services = routes.services;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: services.theme, loadComponent: () => import('./theme/theme') },
  { path: services.tour, loadComponent: () => import('./tour/tour') },
  { path: services.scroll, loadComponent: () => import('./scroll/scroll') },
  { path: services.hotkey, loadComponent: () => import('./hotkey/hotkey') },
  { path: services.media, loadComponent: () => import('./media/media') },
  { path: services.platform, loadComponent: () => import('./platform/platform') },
  { path: services.meta, loadComponent: () => import('./meta/meta') },
  { path: services.storage, loadComponent: () => import('./storage/storage') },
  { path: services.i18n, loadComponent: () => import('./i18n/i18n') },
  { path: services.density, loadComponent: () => import('./density/density') },
  { path: services.clipboard, loadComponent: () => import('./clipboard/clipboard') },
  { path: services.cookie, loadComponent: () => import('./cookie/cookie') },
  { path: services.loadingBar, loadComponent: () => import('./loading-bar/loading-bar') },
] satisfies Routes;

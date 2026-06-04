import type { Routes } from '@angular/router';

import { routes } from '#routing';

const services = routes.services;

export default [
  { path: '', pathMatch: 'full', redirectTo: services.theme },
  { path: services.theme, loadComponent: () => import('./theme/theme') },
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
] satisfies Routes;

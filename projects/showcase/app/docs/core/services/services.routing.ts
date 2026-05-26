import type { Routes } from '@angular/router';

import { routes } from '#routing';

const services = routes.docs.core.services;

export default [
  { path: '', pathMatch: 'full', redirectTo: services.theme },
  { path: services.theme, loadComponent: () => import('./theme/theme') },
  { path: services.scroll, loadComponent: () => import('./scroll/scroll') },
  { path: services.hotkey, loadComponent: () => import('./hotkey/hotkey') },
  { path: services.media, loadComponent: () => import('./media/media') },
  { path: services.platform, loadComponent: () => import('./platform/platform') },
  { path: services.meta, loadComponent: () => import('./meta/meta') },
] satisfies Routes;

import type { Routes } from '@angular/router';

import { routes } from '#routing';

const services = routes.docs.core.services;

export default [
  { path: '', pathMatch: 'full', redirectTo: services.theme },
  { path: services.theme, loadComponent: () => import('./theme/theme.component') },
  { path: services.scroll, loadComponent: () => import('./scroll/scroll.component') },
  { path: services.hotkey, loadComponent: () => import('./hotkey/hotkey.component') },
  { path: services.media, loadComponent: () => import('./media/media.component') },
  { path: services.platform, loadComponent: () => import('./platform/platform.component') },
  { path: services.meta, loadComponent: () => import('./meta/meta.component') },
] satisfies Routes;

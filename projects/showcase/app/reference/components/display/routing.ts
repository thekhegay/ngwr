import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const DISPLAY_ROUTES = [
  { path: components.avatar.path, loadComponent: () => import('./avatar/avatar') },
  { path: components.badge.path, loadComponent: () => import('./badge/badge') },
  { path: components.comment.path, loadComponent: () => import('./comment/comment') },
  { path: components.compare.path, loadComponent: () => import('./compare/compare') },
  { path: components.copyValue.path, loadComponent: () => import('./copy-value/copy-value') },
  { path: components.counter.path, loadComponent: () => import('./counter/counter') },
  { path: components.dateStamp.path, loadComponent: () => import('./date-stamp/date-stamp') },
  { path: components.keyboard.path, loadComponent: () => import('./keyboard/keyboard') },
  { path: components.descriptions.path, loadComponent: () => import('./descriptions/descriptions') },
  { path: components.divider.path, loadComponent: () => import('./divider/divider') },
  { path: components.icon.path, loadComponent: () => import('./icon/icon') },
  { path: components.lightbox.path, loadComponent: () => import('./lightbox/lightbox') },
  { path: components.imageCropper.path, loadComponent: () => import('./image-cropper/image-cropper') },
  { path: components.qrCode.path, loadComponent: () => import('./qr/qr') },
  { path: components.statistic.path, loadComponent: () => import('./statistic/statistic') },
  { path: components.timeline.path, loadComponent: () => import('./timeline/timeline') },
] satisfies Routes;

import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const OVERLAYS_ROUTES = [
  { path: components.commandPalette.path, loadComponent: () => import('./command-palette/command-palette') },
  { path: components.contextMenu.path, loadComponent: () => import('./context-menu/context-menu') },
  { path: components.dialog.path, loadComponent: () => import('./dialog/dialog') },
  { path: components.drawer.path, loadComponent: () => import('./drawer/drawer') },
  { path: components.popconfirm.path, loadComponent: () => import('./popconfirm/popconfirm') },
  { path: components.popover.path, loadComponent: () => import('./popover/popover') },
  { path: components.toast.path, loadComponent: () => import('./toast/toast') },
  { path: components.window.path, loadComponent: () => import('./window/window') },
] satisfies Routes;

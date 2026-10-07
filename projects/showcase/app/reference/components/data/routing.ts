import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const DATA_ROUTES = [
  { path: components.pagination.path, loadComponent: () => import('./pagination/pagination') },
  { path: components.table.path, loadComponent: () => import('./table/table') },
  { path: components.virtualScroll.path, loadComponent: () => import('./virtual-scroll/virtual-scroll') },
  { path: components.sortableList.path, loadComponent: () => import('./sortable-list/sortable-list') },
  { path: components.eventCalendar.path, loadComponent: () => import('./event-calendar/event-calendar') },
  { path: components.tree.path, loadComponent: () => import('./tree/tree') },
  { path: components.graph.path, loadComponent: () => import('./graph/graph') },
] satisfies Routes;

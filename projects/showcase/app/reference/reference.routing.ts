import type { Routes } from '@angular/router';

import {
  COMPONENTS_SIDEBAR,
  DIRECTIVES_SIDEBAR,
  INTERFACES_SIDEBAR,
  PIPES_SIDEBAR,
  SERVICES_SIDEBAR,
  UTILS_SIDEBAR,
  VALIDATORS_SIDEBAR,
} from '../_layout/sidebar/configs';

import { routes } from '#routing';

const reference = routes.reference;

/**
 * Reference — one public API per page: what it is, how it behaves, and the
 * full table of inputs / outputs / methods. Task-oriented prose lives under
 * `/guides` and links back here.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: reference.components },
  {
    path: reference.components,
    data: { sidebar: COMPONENTS_SIDEBAR },
    loadChildren: () => import('./components/components.routing'),
  },
  {
    path: reference.directives,
    data: { sidebar: DIRECTIVES_SIDEBAR },
    loadChildren: () => import('./directives/directives.routing'),
  },
  {
    path: reference.pipes,
    data: { sidebar: PIPES_SIDEBAR },
    loadChildren: () => import('./pipes/pipes.routing'),
  },
  {
    path: reference.services,
    data: { sidebar: SERVICES_SIDEBAR },
    loadChildren: () => import('./services/services.routing'),
  },
  {
    path: reference.utils,
    data: { sidebar: UTILS_SIDEBAR },
    loadChildren: () => import('./utils/utils.routing'),
  },
  {
    path: reference.validators,
    data: { sidebar: VALIDATORS_SIDEBAR },
    loadChildren: () => import('./validators/validators.routing'),
  },
  {
    path: reference.interfaces,
    data: { sidebar: INTERFACES_SIDEBAR },
    loadChildren: () => import('./interfaces/interfaces.routing'),
  },
] satisfies Routes;

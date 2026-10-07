import type { Routes } from '@angular/router';

import { routes } from '#routing';

const docs = routes.docs;

/**
 * Getting the library into an app: what it is, how to install it, how to wire
 * it, how to move between majors, and the two assets an agent reads. Not how to
 * USE a subsystem — that is `/guides`.
 *
 * `''` redirects to `installation` rather than to `introduction`: `/docs` is
 * reached from "Get started", which is a decision already made.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: docs.installation },
  { path: docs.introduction, loadComponent: () => import('./introduction/introduction') },
  { path: docs.installation, loadComponent: () => import('./installation/installation') },
  { path: docs.configuration, loadComponent: () => import('./configuration/configuration') },
  { path: docs.migration, loadComponent: () => import('./migration/migration') },
  { path: docs.skills, loadComponent: () => import('./skills/skills') },
  { path: docs.mcp, loadComponent: () => import('./mcp/mcp') },
] satisfies Routes;

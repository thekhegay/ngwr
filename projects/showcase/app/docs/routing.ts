import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const docs = ROUTES.docs;

/**
 * Getting the library into an app: what it is, how to install it, how to wire
 * it, how to move between majors, and the two assets an agent reads. Not how to
 * USE a subsystem — that is `/guides`.
 *
 * `''` redirects to `installation` rather than to `introduction`: `/docs` is
 * reached from "Get started", which is a decision already made.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: docs.installation.path },
  { path: docs.introduction.path, loadComponent: () => import('./introduction/introduction') },
  { path: docs.installation.path, loadComponent: () => import('./installation/installation') },
  { path: docs.configuration.path, loadComponent: () => import('./configuration/configuration') },
  { path: docs.migration.path, loadComponent: () => import('./migration/migration') },
  { path: docs.skills.path, loadComponent: () => import('./skills/skills') },
  { path: docs.mcp.path, loadComponent: () => import('./mcp/mcp') },
] satisfies Routes;

import type { Routes } from '@angular/router';

import { BUTTONS_ROUTES } from './buttons/routing';
import { DATA_ROUTES } from './data/routing';
import { DISPLAY_ROUTES } from './display/routing';
import { FEEDBACK_ROUTES } from './feedback/routing';
import { FORM_ROUTES } from './form/routing';
import { LAYOUT_ROUTES } from './layout/routing';
import { NAVIGATION_ROUTES } from './navigation/routing';
import { OVERLAYS_ROUTES } from './overlays/routing';

import { ROUTES } from '#routes';

/**
 * The components cluster, assembled from one routing file per sidebar group.
 *
 * The groups are FOLDERS, not URL segments: every page stays at
 * `/reference/components/<slug>`, so a published link still resolves.
 */
const components = ROUTES.reference.components;

export default [
  { path: '', pathMatch: 'full', redirectTo: components.alert.path },
  ...BUTTONS_ROUTES,
  ...DATA_ROUTES,
  ...DISPLAY_ROUTES,
  ...FEEDBACK_ROUTES,
  ...FORM_ROUTES,
  ...LAYOUT_ROUTES,
  ...NAVIGATION_ROUTES,
  ...OVERLAYS_ROUTES,

  // Slugs that were published and then renamed or folded. Every one was a page
  // at some point, so every one keeps resolving.
  { path: 'drag-drop', redirectTo: components.sortableList.path },
  { path: components.typography.path, redirectTo: '/guides/typography/overview' },
  { path: 'tag', redirectTo: components.badge.path },
  { path: 'count-up', redirectTo: components.counter.path },
  { path: 'tooltip', redirectTo: components.popover.path },
  { path: 'autocomplete', redirectTo: components.select.path },
  { path: 'chips-input', redirectTo: components.select.path },
  { path: 'tree-select', redirectTo: components.tree.path },
  { path: 'bottom-sheet', redirectTo: components.drawer.path },
  { path: 'time-picker', redirectTo: components.datePicker.path },
  { path: 'date-time-picker', redirectTo: components.datePicker.path },
  { path: 'action-sheet', redirectTo: components.drawer.path },
  { path: 'squircle', redirectTo: components.button.path },
] satisfies Routes;

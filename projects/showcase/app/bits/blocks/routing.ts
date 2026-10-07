import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const a = ROUTES.bits;

/** Effects that wrap a block of content. Folder only — the URL stays `/bits/<slug>`. */
export const BLOCK_ROUTES = [
  { path: a.borderGlow.path, loadComponent: () => import('./border-glow/border-glow') },
  { path: a.marquee.path, loadComponent: () => import('./marquee/marquee') },
  { path: a.spotlightCard.path, loadComponent: () => import('./spotlight-card/spotlight-card') },
  { path: a.starBorder.path, loadComponent: () => import('./star-border/star-border') },
  { path: a.tiltCard.path, loadComponent: () => import('./tilt-card/tilt-card') },
] satisfies Routes;

import type { Routes } from '@angular/router';

import { routes } from '#routing';

const a = routes.bits;

/** Effects that wrap a block of content. Folder only — the URL stays `/bits/<slug>`. */
export const BLOCK_ROUTES = [
  { path: a.borderGlow, loadComponent: () => import('./border-glow/border-glow') },
  { path: a.marquee, loadComponent: () => import('./marquee/marquee') },
  { path: a.spotlightCard, loadComponent: () => import('./spotlight-card/spotlight-card') },
  { path: a.starBorder, loadComponent: () => import('./star-border/star-border') },
  { path: a.tiltCard, loadComponent: () => import('./tilt-card/tilt-card') },
] satisfies Routes;

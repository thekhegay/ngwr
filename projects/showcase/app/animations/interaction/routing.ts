import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const animations = ROUTES.animations;

/** Effects on the pointer and the elements it reaches. Folder only: the URL stays `/animations/<slug>`. */
export const INTERACTION_ROUTES = [
  { path: animations.clickSparks.path, loadComponent: () => import('./click-sparks/click-sparks') },
  { path: animations.confetti.path, loadComponent: () => import('./confetti/confetti') },
  { path: animations.fluidCursor.path, loadComponent: () => import('./fluid-cursor/fluid-cursor') },
  { path: animations.glowBorder.path, loadComponent: () => import('./glow-border/glow-border') },
  { path: animations.marquee.path, loadComponent: () => import('./marquee/marquee') },
  { path: animations.spotlight.path, loadComponent: () => import('./spotlight/spotlight') },
  { path: animations.tilt.path, loadComponent: () => import('./tilt/tilt') },
] satisfies Routes;

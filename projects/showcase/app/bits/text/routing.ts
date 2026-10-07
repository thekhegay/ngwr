import type { Routes } from '@angular/router';

import { routes } from '#routing';

const a = routes.bits;

/** Animated type. Folder only — the URL stays `/bits/<slug>`. */
export const TEXT_ROUTES = [
  { path: a.blurText, loadComponent: () => import('./blur-text/blur-text') },
  { path: a.circularText, loadComponent: () => import('./circular-text/circular-text') },
  { path: a.decryptText, loadComponent: () => import('./decrypt-text/decrypt-text') },
  { path: a.fallingText, loadComponent: () => import('./falling-text/falling-text') },
  { path: a.fuzzyText, loadComponent: () => import('./fuzzy-text/fuzzy-text') },
  { path: a.glitchText, loadComponent: () => import('./glitch-text/glitch-text') },
  { path: a.gradientText, loadComponent: () => import('./gradient-text/gradient-text') },
  { path: a.rotatingText, loadComponent: () => import('./rotating-text/rotating-text') },
  { path: a.shinyText, loadComponent: () => import('./shiny-text/shiny-text') },
  { path: a.splitText, loadComponent: () => import('./split-text/split-text') },
  { path: a.typewriter, loadComponent: () => import('./typewriter/typewriter') },
] satisfies Routes;

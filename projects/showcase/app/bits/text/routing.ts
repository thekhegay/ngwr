import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const a = ROUTES.bits;

/** Animated type. Folder only — the URL stays `/bits/<slug>`. */
export const TEXT_ROUTES = [
  { path: a.blurText.path, loadComponent: () => import('./blur-text/blur-text') },
  { path: a.circularText.path, loadComponent: () => import('./circular-text/circular-text') },
  { path: a.decryptText.path, loadComponent: () => import('./decrypt-text/decrypt-text') },
  { path: a.fallingText.path, loadComponent: () => import('./falling-text/falling-text') },
  { path: a.fuzzyText.path, loadComponent: () => import('./fuzzy-text/fuzzy-text') },
  { path: a.glitchText.path, loadComponent: () => import('./glitch-text/glitch-text') },
  { path: a.gradientText.path, loadComponent: () => import('./gradient-text/gradient-text') },
  { path: a.rotatingText.path, loadComponent: () => import('./rotating-text/rotating-text') },
  { path: a.shinyText.path, loadComponent: () => import('./shiny-text/shiny-text') },
  { path: a.splitText.path, loadComponent: () => import('./split-text/split-text') },
  { path: a.typewriter.path, loadComponent: () => import('./typewriter/typewriter') },
] satisfies Routes;

import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const animations = ROUTES.animations;

/** Effects on a run of text. Folder only — the URL stays `/animations/<slug>`. */
export const TEXT_ROUTES = [
  { path: animations.blurReveal.path, loadComponent: () => import('./blur-reveal/blur-reveal') },
  { path: animations.decode.path, loadComponent: () => import('./decode/decode') },
  { path: animations.letterStagger.path, loadComponent: () => import('./letter-stagger/letter-stagger') },
  { path: animations.shine.path, loadComponent: () => import('./shine/shine') },
] satisfies Routes;

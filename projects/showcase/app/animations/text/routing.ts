import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const animations = ROUTES.animations;

/** Effects on a run of text. Folder only — the URL stays `/animations/<slug>`. */
export const TEXT_ROUTES = [
  { path: animations.blurReveal.path, loadComponent: () => import('./blur-reveal/blur-reveal') },
  { path: animations.decode.path, loadComponent: () => import('./decode/decode') },
  { path: animations.destruct.path, loadComponent: () => import('./destruct/destruct') },
  { path: animations.fallingLetters.path, loadComponent: () => import('./falling-letters/falling-letters') },
  { path: animations.glitch.path, loadComponent: () => import('./glitch/glitch') },
  { path: animations.gradientFlow.path, loadComponent: () => import('./gradient-flow/gradient-flow') },
  { path: animations.orbit.path, loadComponent: () => import('./orbit/orbit') },
  { path: animations.reveal.path, loadComponent: () => import('./reveal/reveal') },
  { path: animations.rotateReveal.path, loadComponent: () => import('./rotate-reveal/rotate-reveal') },
  { path: animations.shine.path, loadComponent: () => import('./shine/shine') },
  { path: animations.typewriter.path, loadComponent: () => import('./typewriter/typewriter') },
] satisfies Routes;

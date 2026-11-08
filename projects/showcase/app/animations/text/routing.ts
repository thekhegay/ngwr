import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const animations = ROUTES.animations;

/** Effects on a run of text. Folder only — the URL stays `/animations/<slug>`. */
export const TEXT_ROUTES = [
  { path: animations.blurReveal.path, loadComponent: () => import('./blur-reveal/blur-reveal') },
  { path: animations.circleText.path, loadComponent: () => import('./circle-text/circle-text') },
  { path: animations.decode.path, loadComponent: () => import('./decode/decode') },
  { path: animations.fallingLetters.path, loadComponent: () => import('./falling-letters/falling-letters') },
  { path: animations.glitch.path, loadComponent: () => import('./glitch/glitch') },
  { path: animations.gradientFlow.path, loadComponent: () => import('./gradient-flow/gradient-flow') },
  { path: animations.letterStagger.path, loadComponent: () => import('./letter-stagger/letter-stagger') },
  { path: animations.noiseText.path, loadComponent: () => import('./noise-text/noise-text') },
  { path: animations.shine.path, loadComponent: () => import('./shine/shine') },
  { path: animations.signalSweep.path, loadComponent: () => import('./signal-sweep/signal-sweep') },
  { path: animations.typewriter.path, loadComponent: () => import('./typewriter/typewriter') },
  { path: animations.wordRotator.path, loadComponent: () => import('./word-rotator/word-rotator') },
] satisfies Routes;

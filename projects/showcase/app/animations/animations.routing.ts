import type { Routes } from '@angular/router';

import { routes } from '#routing';

const a = routes.animations;

export default [
  { path: '', pathMatch: 'full', redirectTo: a.aurora },

  // In-house animations / effects.
  { path: a.borderGlow, loadComponent: () => import('./border-glow/border-glow') },
  { path: a.aurora, loadComponent: () => import('./aurora/aurora') },
  { path: a.marquee, loadComponent: () => import('./marquee/marquee') },
  { path: a.confetti, loadComponent: () => import('./confetti/confetti') },

  // Reactbits ports.
  { path: a.spotlightCard, loadComponent: () => import('./spotlight-card/spotlight-card') },
  { path: a.tiltCard, loadComponent: () => import('./tilt-card/tilt-card') },
  { path: a.clickSpark, loadComponent: () => import('./click-spark/click-spark') },
  { path: a.waves, loadComponent: () => import('./waves/waves') },
  { path: a.starBorder, loadComponent: () => import('./star-border/star-border') },
  { path: a.splashCursor, loadComponent: () => import('./splash-cursor/splash-cursor') },
  { path: a.splitText, loadComponent: () => import('./split-text/split-text') },
  { path: a.blurText, loadComponent: () => import('./blur-text/blur-text') },
  { path: a.shinyText, loadComponent: () => import('./shiny-text/shiny-text') },
  { path: a.gradientText, loadComponent: () => import('./gradient-text/gradient-text') },
  { path: a.rotatingText, loadComponent: () => import('./rotating-text/rotating-text') },
  { path: a.typewriter, loadComponent: () => import('./typewriter/typewriter') },
  { path: a.decryptText, loadComponent: () => import('./decrypt-text/decrypt-text') },
  { path: a.glitchText, loadComponent: () => import('./glitch-text/glitch-text') },
  { path: a.fuzzyText, loadComponent: () => import('./fuzzy-text/fuzzy-text') },
  { path: a.fallingText, loadComponent: () => import('./falling-text/falling-text') },
  { path: a.circularText, loadComponent: () => import('./circular-text/circular-text') },
] satisfies Routes;

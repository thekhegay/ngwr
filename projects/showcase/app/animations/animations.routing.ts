import type { Routes } from '@angular/router';

import { routes } from '#routing';

const a = routes.animations;

export default [
  { path: '', pathMatch: 'full', redirectTo: a.borderGlow },

  // In-house animations / effects.
  { path: a.motion, loadComponent: () => import('./motion/motion') },
  { path: a.borderGlow, loadComponent: () => import('./border-glow/border-glow') },
  { path: a.aurora, loadComponent: () => import('./aurora/aurora') },
  { path: a.marquee, loadComponent: () => import('./marquee/marquee') },
  { path: a.animatedText, loadComponent: () => import('./animated-text/animated-text') },
  { path: a.confetti, loadComponent: () => import('./confetti/confetti') },
  { path: a.reveal, loadComponent: () => import('./reveal/reveal') },
  { path: a.shimmer, loadComponent: () => import('./shimmer/shimmer') },
  { path: a.spotlight, loadComponent: () => import('./spotlight/spotlight') },
  { path: a.tilt, loadComponent: () => import('./tilt/tilt') },

  // Reactbits ports.
  { path: a.spotlightCard, loadComponent: () => import('./spotlight-card/spotlight-card') },
  { path: a.logoLoop, loadComponent: () => import('./logo-loop/logo-loop') },
  { path: a.clickSpark, loadComponent: () => import('./click-spark/click-spark') },
  { path: a.splitText, loadComponent: () => import('./split-text/split-text') },
  { path: a.blurText, loadComponent: () => import('./blur-text/blur-text') },
  { path: a.shinyText, loadComponent: () => import('./shiny-text/shiny-text') },
  { path: a.gradientText, loadComponent: () => import('./gradient-text/gradient-text') },
  { path: a.rotatingText, loadComponent: () => import('./rotating-text/rotating-text') },
  { path: a.typewriter, loadComponent: () => import('./typewriter/typewriter') },
  { path: a.scrambleText, loadComponent: () => import('./scramble-text/scramble-text') },
  { path: a.decryptText, loadComponent: () => import('./decrypt-text/decrypt-text') },
  { path: a.glitchText, loadComponent: () => import('./glitch-text/glitch-text') },
] satisfies Routes;

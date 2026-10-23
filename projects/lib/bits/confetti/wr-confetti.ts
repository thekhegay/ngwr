/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { resolveCssColor } from 'ngwr/utils';

import type { WrConfettiOptions } from './types';

/**
 * The default palette, as theme tokens resolved when a burst is fired — so a
 * dark page gets the dark intents. Each slot is the token nearest the hex it
 * replaced (`#f51c6a` had no token of its own and became `danger-light`, the
 * green `#00a400` became `success-light`), plus `info` for the fifth intent.
 * The hex survives as each token's CSS fallback, which is what a page that
 * never loaded `ngwr/theme` paints.
 */
const DEFAULT_COLORS: readonly string[] = [
  'var(--wr-color-primary, #3969e2)',
  'var(--wr-color-danger-light, #f51c6a)',
  'var(--wr-color-success-light, #00a400)',
  'var(--wr-color-warning, #ffba00)',
  'var(--wr-color-danger, #fa383e)',
  'var(--wr-color-info, #3472d9)',
];

/** What a colour that resolves to nothing at all is painted with. */
const FALLBACK_COLOR = '#3969e2';

const DEFAULTS: Required<WrConfettiOptions> = {
  count: 80,
  spread: 60,
  angle: 90,
  velocity: 12,
  gravity: 0.35,
  drag: 0.92,
  origin: { x: 0.5, y: 1 },
  colors: DEFAULT_COLORS,
  size: 8,
  ttl: 180,
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  ttl: number;
  /**
   * The physics this particle was FIRED with.
   *
   * Carried per particle rather than read off `DEFAULTS` in the tick, which
   * is what it used to do: `fire({ gravity: 1 })` behaved exactly like
   * `fire()`, because `spawn` merged the options and `tick` then ignored
   * them. A field rather than a per-burst variable because bursts overlap —
   * one loop drains particles from several `fire()` calls at once, and each
   * should keep the arc it was given.
   */
  gravity: number;
  drag: number;
}

/**
 * Burst of celebratory confetti particles painted onto a single shared
 * full-viewport canvas. The canvas is created on first call and reused.
 *
 * @example
 * ```ts
 * const confetti = inject(WrConfetti);
 * confetti.fire();
 * confetti.fire({ count: 200, origin: { x: 0.25, y: 0.5 } });
 * ```
 *
 * @see https://ngwr.dev/bits/confetti
 */
@Service()
export class WrConfetti {
  private readonly doc = inject(DOCUMENT);
  private readonly platform = inject(WrPlatform);

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private rafId: number | null = null;

  // Named, so it can be removed again. The listener used to be an inline arrow
  // and the canvas was never taken back out of `document.body`, which is only
  // harmless while this is the root singleton: a route or a component that
  // lists `WrConfetti` in its own `providers` left one orphaned full-viewport
  // canvas — and one listener still reallocating its backing store on every
  // window resize — behind per destroyed injector.
  private readonly onResize = (): void => this.resize();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /** Spawn a confetti burst with the given (or default) options. */
  fire(options: WrConfettiOptions = {}): void {
    if (!this.platform.isBrowser) return;
    if (this.platform.prefersReducedMotion()) return;
    const opts: Required<WrConfettiOptions> = { ...DEFAULTS, ...options };
    this.ensureCanvas();
    this.spawn(opts);
    this.rafId ??= requestAnimationFrame(() => this.tick());
  }

  // Internals

  private ensureCanvas(): void {
    if (this.canvas) return;
    const win = this.doc.defaultView;
    if (!win) return;
    const canvas = this.doc.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.setAttribute('aria-hidden', 'true');
    this.doc.body.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    win.addEventListener('resize', this.onResize);
  }

  /**
   * Give back the canvas and the listener `ensureCanvas()` took from the page,
   * stop the frame loop, and reset the state both of them guard on so a `fire()`
   * from a fresh injector rebuilds cleanly.
   */
  private teardown(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.doc.defaultView?.removeEventListener('resize', this.onResize);
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
  }

  private resize(): void {
    if (!this.canvas) return;
    const win = this.doc.defaultView;
    if (!win) return;
    const dpr = win.devicePixelRatio || 1;
    this.canvas.width = win.innerWidth * dpr;
    this.canvas.height = win.innerHeight * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private spawn(opts: Required<WrConfettiOptions>): void {
    const win = this.doc.defaultView;
    if (!win) return;
    const cx = opts.origin.x * win.innerWidth;
    const cy = opts.origin.y * win.innerHeight;
    // Resolved once per burst, against the canvas: `fillStyle` reads neither a
    // `var()` token nor `light-dark()` and silently keeps the previous colour, so
    // `colors: ['var(--wr-color-primary)']` painted whatever the last particle
    // had. Per burst is also what makes the default palette follow the colour
    // scheme: a burst fired after a switch resolves the tokens afresh. A colour
    // that resolves to nothing falls back to the primary blue.
    const canvas = this.canvas;
    const palette = canvas ? opts.colors.map(color => resolveCssColor(canvas, color, FALLBACK_COLOR)) : opts.colors;
    const halfSpread = (opts.spread / 2) * (Math.PI / 180);
    for (let i = 0; i < opts.count; i++) {
      // Launch direction: 90° = up (default), 0° = right — same convention
      // as canvas-confetti. Jitter spreads the cone around it.
      const base = (-opts.angle * Math.PI) / 180;
      const angle = base + (Math.random() - 0.5) * 2 * halfSpread;
      const speed = opts.velocity * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: opts.size * (0.8 + Math.random() * 0.6),
        ttl: opts.ttl,
        gravity: opts.gravity,
        drag: opts.drag,
      });
    }
  }

  private tick(): void {
    const ctx = this.ctx;
    const win = this.doc.defaultView;
    if (!ctx || !win) {
      this.rafId = null;
      return;
    }
    ctx.clearRect(0, 0, win.innerWidth, win.innerHeight);
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.ttl -= 1;
      if (p.ttl <= 0 || p.y > win.innerHeight + 50) continue;
      next.push(p);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.min(1, p.ttl / 60);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    this.particles = next;
    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(() => this.tick());
    } else {
      this.rafId = null;
    }
  }
}

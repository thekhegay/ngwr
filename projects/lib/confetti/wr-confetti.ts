/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

import type { WrConfettiOptions } from './interfaces';

const DEFAULTS: Required<WrConfettiOptions> = {
  count: 80,
  spread: 60,
  angle: 90,
  velocity: 12,
  gravity: 0.35,
  drag: 0.92,
  origin: { x: 0.5, y: 1 },
  colors: ['#3969e2', '#f51c6a', '#00a400', '#ffba00', '#fa383e'],
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
 * @see https://ngwr.dev/docs/core/services
 */
@Service()
export class WrConfetti {
  private readonly doc = inject(DOCUMENT);
  private readonly platform = inject(WrPlatform);

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private rafId: number | null = null;

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
    win.addEventListener('resize', () => this.resize());
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
        color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        size: opts.size * (0.8 + Math.random() * 0.6),
        ttl: opts.ttl,
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
      p.vx *= DEFAULTS.drag;
      p.vy = p.vy * DEFAULTS.drag + DEFAULTS.gravity;
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

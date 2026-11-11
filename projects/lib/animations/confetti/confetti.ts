/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, Service, effect, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { wrClamp, wrResolveCssColor } from 'ngwr/utils';

import { MAX_FRAME_MS, canvasBackdropRatio } from '../internal';

import type { WrConfettiOptions, WrConfettiRect } from './types';

/** Pieces in one burst. */
const CONFETTI_COUNT = 84;

/** How wide the fan of launch directions is, in degrees, centred straight up. */
const CONFETTI_CONE = 80;

/** Launch speed, px/s: the slowest and the fastest piece. */
const CONFETTI_SPEED_MIN = 520;
const CONFETTI_SPEED_MAX = 980;

/** Gravity, px/s²: light, as paper falls, not a stone. */
const CONFETTI_GRAVITY = 560;

/**
 * Air drag, per second: velocity decays by `e^-drag` every second, so a piece
 * launched at 900px/s is at a third of that after two thirds of a second and
 * falls no faster than `gravity / drag` (350px/s) however long it drops.
 */
const CONFETTI_DRAG = 1.6;

/** How far the flutter pushes a piece sideways, px/s at the peak of a flip. */
const CONFETTI_SWAY = 60;

/** How long a piece lives, ms: at least this, plus up to the spread. */
const CONFETTI_LIFE_MS = 1900;
const CONFETTI_LIFE_SPREAD_MS = 500;

/** A piece fades over its last ms. */
const CONFETTI_FADE_MS = 600;

/** Every fifth piece is a thin strip rather than a rectangle. */
const CONFETTI_STRIP_EVERY = 5;

/**
 * The colour hooks on the canvas, each a bare intent: confetti is a graphic,
 * not text, so it keeps the intent itself rather than the `-ink` text role
 * (see `docs/internals/theme.md`). The literal is the fallback when a hook
 * cannot be resolved, as in a document with no stylesheet.
 */
const CONFETTI_COLORS: readonly (readonly [hook: string, fallback: string])[] = [
  ['var(--wr-confetti-color-1)', '#3969e2'],
  ['var(--wr-confetti-color-2)', '#008800'],
  ['var(--wr-confetti-color-3)', '#ffba00'],
  ['var(--wr-confetti-color-4)', '#dc3137'],
  ['var(--wr-confetti-color-5)', '#3472d9'],
];

/** One piece of paper in the air. Positions in CSS px, velocities in px/s, angles in rad. */
export interface WrConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly width: number;
  readonly height: number;
  /** Its turn on the screen plane. */
  angle: number;
  readonly spin: number;
  /** Its flip round its own long axis: the drawn height is `height * cos(phase)`. */
  phase: number;
  readonly flutter: number;
  readonly color: string;
  /** ms left. */
  life: number;
}

/* eslint-disable no-bitwise -- xorshift is defined in 32-bit integer arithmetic */
/**
 * A deterministic 0–1 sequence from `seed` (xorshift32): the same seed gives
 * the same burst, which a spec can pin. A zero seed would stay zero for ever,
 * so it is replaced by a constant.
 */
export function confettiRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}
/* eslint-enable no-bitwise */

/**
 * The pieces of one burst at launch: `count` of them, spread over `from`,
 * each thrown upward inside the cone at its own speed with its own spin,
 * flutter and life, coloured from `palette` in turn so every colour is
 * equally represented.
 */
export function confettiLaunch(
  from: WrConfettiRect,
  seed: number,
  count: number,
  palette: readonly string[]
): WrConfettiPiece[] {
  const random = confettiRandom(seed);
  const half = (CONFETTI_CONE / 2) * (Math.PI / 180);
  const pieces: WrConfettiPiece[] = [];
  for (let i = 0; i < Math.max(0, Math.round(count)); i++) {
    const strip = i % CONFETTI_STRIP_EVERY === CONFETTI_STRIP_EVERY - 1;
    const direction = -Math.PI / 2 + (random() * 2 - 1) * half;
    const speed = CONFETTI_SPEED_MIN + random() * (CONFETTI_SPEED_MAX - CONFETTI_SPEED_MIN);
    pieces.push({
      x: from.left + random() * from.width,
      y: from.top + random() * from.height,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      width: strip ? 2 + random() * 1.5 : 6 + random() * 4,
      height: strip ? 10 + random() * 6 : 3 + random() * 2.5,
      angle: random() * Math.PI * 2,
      spin: (random() * 2 - 1) * 8,
      phase: random() * Math.PI * 2,
      flutter: 5 + random() * 7,
      color: palette[i % palette.length] ?? '',
      life: CONFETTI_LIFE_MS + random() * CONFETTI_LIFE_SPREAD_MS,
    });
  }
  return pieces;
}

/**
 * Moves one piece `dt` ms on. Gravity pulls, drag slows both axes towards the
 * terminal speed, the flutter sways it sideways as it flips, and the spin and
 * the flip advance; the life runs down.
 */
export function confettiStep(piece: WrConfettiPiece, dt: number): void {
  const s = dt / 1000;
  const keep = Math.exp(-CONFETTI_DRAG * s);
  const terminal = CONFETTI_GRAVITY / CONFETTI_DRAG;
  piece.vx *= keep;
  piece.vy = terminal + (piece.vy - terminal) * keep;
  piece.x += (piece.vx + Math.sin(piece.phase) * CONFETTI_SWAY) * s;
  piece.y += piece.vy * s;
  piece.angle += piece.spin * s;
  piece.phase += piece.flutter * s;
  piece.life -= dt;
}

/** Whether a piece is still worth drawing: alive and not below the bottom edge of a `height` tall viewport. */
export function confettiAlive(piece: WrConfettiPiece, height: number): boolean {
  return piece.life > 0 && piece.y - Math.max(piece.width, piece.height) < height;
}

/** A piece's opacity: solid, then fading over its last {@link CONFETTI_FADE_MS}. */
export function confettiAlpha(piece: WrConfettiPiece): number {
  return wrClamp(piece.life / CONFETTI_FADE_MS, 0, 1);
}

/**
 * A one-shot celebration: small paper pieces burst up and out from an
 * element, flutter, tumble and fall under gravity, and are gone inside two
 * and a half seconds. A service, not a component: call {@link burst} from
 * wherever the moment is.
 *
 * The first burst makes one fixed, full-viewport canvas in `document.body`
 * (`aria-hidden`, under no pointer, at the device ratio capped as the
 * backdrops cap it) and starts one frame loop; a burst that comes while
 * pieces are in the air joins the same canvas and loop, and the canvas goes
 * when the last piece has faded or dropped off the bottom. The layout of a
 * burst is deterministic for a seed; the physics is in {@link confettiLaunch},
 * {@link confettiStep} and {@link confettiAlive}, pure functions a spec can
 * run on their own. Each piece is a rectangle, every fifth a thin strip,
 * turning on the screen plane while its drawn height follows a cosine, so it
 * flips like paper; the back of a piece paints a shade darker.
 *
 * Colours are the `--wr-confetti-color-*` hooks on the canvas, bare theme
 * intents by default, resolved through the cascade when a burst starts, so
 * the scheme the reader is in is the one that paints. Nothing happens under
 * `prefers-reduced-motion: reduce` (a preference that flips mid-burst clears
 * the canvas at once), under `forced-colors: active` or on the server; a
 * hidden document pauses the loop and a visible one resumes it where it
 * stopped. Styles: `@use 'ngwr/animations/confetti'`, which places the canvas and
 * lists the `--wr-confetti-color-*` hooks; a service has no host to check them
 * from, so the first burst warns in dev mode when the sheet is missing.
 */
@Service()
export class WrConfetti {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private pieces: WrConfettiPiece[] = [];
  private rafId: number | null = null;
  private lastFrame = 0;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private listeners: AbortController | null = null;
  /** The stylesheet was looked for once in this document. */
  private checked = false;

  constructor() {
    if (!this.browser) return;

    effect(() => {
      const reduced = this.platform.prefersReducedMotion();
      this.platform.pageVisible();
      if (reduced) this.clear();
      else this.sync();
    });

    inject(DestroyRef).onDestroy(() => this.clear());
  }

  /** Whether pieces are in the air. */
  get active(): boolean {
    return this.pieces.length > 0;
  }

  /**
   * Throws a burst of confetti up from `from`: an element, whose client rect
   * is read now, or a rect in client coordinates. Pieces start anywhere
   * inside the rect, so a wide block showers along its width and a button
   * bursts from a point.
   */
  burst(from: Element | WrConfettiRect, options: WrConfettiOptions = {}): void {
    if (!this.browser || this.platform.prefersReducedMotion()) return;
    const view = this.doc.defaultView;
    if (!view || view.matchMedia?.('(forced-colors: active)').matches) return;

    const canvas = this.canvas ?? this.mount(view);
    if (!canvas) return;
    const rect = 'getBoundingClientRect' in from ? from.getBoundingClientRect() : from;
    const seed = options.seed ?? Math.floor(Math.random() * 0x1_0000_0000);
    const palette = CONFETTI_COLORS.map(([hook, fallback]) => wrResolveCssColor(canvas, hook, fallback));
    this.pieces.push(...confettiLaunch(rect, seed, options.count ?? CONFETTI_COUNT, palette));
    this.sync();
  }

  /** Stops the loop and takes the canvas and every piece out. Idempotent. */
  clear(): void {
    this.stopLoop();
    this.pieces = [];
    this.listeners?.abort();
    this.listeners = null;
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }

  /** Makes the canvas, or returns `null` when the browser gives it no context. */
  private mount(view: Window): HTMLCanvasElement | null {
    const canvas = this.doc.createElement('canvas');
    canvas.className = 'wr-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    this.canvas = canvas;
    this.ctx = ctx;
    this.listeners = new AbortController();
    view.addEventListener('resize', () => this.resize(view), { signal: this.listeners.signal, passive: true });
    this.doc.body.append(canvas);
    this.resize(view);
    if (typeof ngDevMode === 'undefined' || ngDevMode) this.checkStyles(view);
    return canvas;
  }

  /**
   * The service's own `wrCheckStyles`, which a root service cannot call: that
   * helper reads the host element it is injected beside, and a service has
   * none. The same marker, the same words, once per document.
   */
  private checkStyles(view: Window): void {
    if (this.checked || /jsdom|happydom/i.test(view.navigator.userAgent)) return;
    this.checked = true;
    const loaded = view.getComputedStyle(this.doc.documentElement).getPropertyValue('--wr-loaded-animations-confetti');
    if (loaded.trim() !== '') return;
    // eslint-disable-next-line no-console -- a dev-mode diagnostic, reported and never thrown
    console.warn(
      "[NGWR] WrConfetti paints without its styles. Add @use 'ngwr/animations/confetti'; to your global stylesheet, " +
        'or run ng g ngwr:component-style animations/confetti.'
    );
  }

  private resize(view: Window): void {
    if (!this.canvas || !this.ctx) return;
    this.width = view.innerWidth;
    this.height = view.innerHeight;
    this.dpr = canvasBackdropRatio(Math.max(1, this.width), Math.max(1, this.height), view.devicePixelRatio ?? 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  /** Starts or stops the loop: it runs while pieces are in the air and the document is visible. */
  private sync(): void {
    const run = this.ctx !== null && this.pieces.length > 0 && this.platform.pageVisible();
    if (run === (this.rafId !== null)) return;
    if (run) {
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
      return;
    }
    this.stopLoop();
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly frame = (now: number): void => {
    this.rafId = null;
    // A tab that was throttled comes back with one huge frame; the pieces move at most this far at once.
    const dt = wrClamp(now - this.lastFrame, 0, MAX_FRAME_MS);
    this.lastFrame = now;
    for (const piece of this.pieces) confettiStep(piece, dt);
    this.pieces = this.pieces.filter(piece => confettiAlive(piece, this.height));
    if (this.pieces.length === 0) {
      this.clear();
      return;
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.frame);
  };

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width * dpr, this.height * dpr);
    for (const piece of this.pieces) {
      const flip = Math.cos(piece.phase);
      // Never flat: a sheet seen edge-on still shows its edge.
      const thickness = Math.sign(flip || 1) * Math.max(0.12, Math.abs(flip));
      ctx.setTransform(dpr, 0, 0, dpr, piece.x * dpr, piece.y * dpr);
      ctx.rotate(piece.angle);
      ctx.scale(1, thickness);
      // The back of the paper is in shadow.
      ctx.globalAlpha = confettiAlpha(piece) * (flip < 0 ? 0.75 : 1);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
    }
    ctx.globalAlpha = 1;
  }
}

export {
  CONFETTI_CONE,
  CONFETTI_COUNT,
  CONFETTI_DRAG,
  CONFETTI_FADE_MS,
  CONFETTI_GRAVITY,
  CONFETTI_LIFE_MS,
  CONFETTI_LIFE_SPREAD_MS,
  CONFETTI_SPEED_MAX,
  CONFETTI_SPEED_MIN,
  CONFETTI_STRIP_EVERY,
};

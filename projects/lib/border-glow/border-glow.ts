/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Port of the reactbits.dev BorderGlow effect — a cursor-tracked cone of
 * mesh-gradient light that follows the pointer along the card's perimeter,
 * with an outer halo and optional auto-sweep on mount.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

const RADIANS_TO_DEG = 180 / Math.PI;

interface ParsedHsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

function parseHsl(input: string): ParsedHsl {
  const match = /([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/.exec(input);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: Number.parseFloat(match[1]), s: Number.parseFloat(match[2]), l: Number.parseFloat(match[3]) };
}

const GLOW_OPACITY_STEPS = [100, 60, 50, 40, 30, 20, 10] as const;
const GLOW_VAR_SUFFIXES = ['', '-60', '-50', '-40', '-30', '-20', '-10'] as const;

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'] as const;
const GRADIENT_VAR_NAMES = [
  '--gradient-one',
  '--gradient-two',
  '--gradient-three',
  '--gradient-four',
  '--gradient-five',
  '--gradient-six',
  '--gradient-seven',
] as const;
const GRADIENT_COLOR_INDEX = [0, 1, 2, 0, 1, 2, 1] as const;

const DEFAULT_COLORS: readonly string[] = ['#c084fc', '#f472b6', '#38bdf8'];

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const { h, s, l } = parseHsl(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const out: Record<string, string> = {};
  for (let i = 0; i < GLOW_OPACITY_STEPS.length; i++) {
    const alpha = Math.min(GLOW_OPACITY_STEPS[i] * intensity, 100);
    out[`--glow-color${GLOW_VAR_SUFFIXES[i]}`] = `hsl(${base} / ${alpha}%)`;
  }
  return out;
}

function buildGradientVars(colors: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  for (let i = 0; i < GRADIENT_VAR_NAMES.length; i++) {
    const colour = palette[Math.min(GRADIENT_COLOR_INDEX[i], palette.length - 1)];
    out[GRADIENT_VAR_NAMES[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${colour} 0px, transparent 50%)`;
  }
  out['--gradient-base'] = `linear-gradient(${palette[0]} 0 100%)`;
  return out;
}

interface AnimateOptions {
  readonly start?: number;
  readonly end?: number;
  readonly duration?: number;
  readonly delay?: number;
  readonly ease?: (t: number) => number;
  readonly onUpdate: (v: number) => void;
  readonly onEnd?: () => void;
}

/** Tiny rAF-driven tweener. Returns a cancel function so callers can clean up on destroy. */
function animateValue(opts: AnimateOptions): () => void {
  const { start = 0, end = 100, duration = 1000, delay = 0, ease = (t: number): number => t, onUpdate, onEnd } = opts;
  let raf = 0;
  let cancelled = false;

  const startAt = performance.now() + delay;
  const tick = (): void => {
    if (cancelled) return;
    const elapsed = performance.now() - startAt;
    const t = Math.min(Math.max(elapsed / duration, 0), 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) raf = requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  };

  const timer = setTimeout(() => {
    raf = requestAnimationFrame(tick);
  }, delay);

  return () => {
    cancelled = true;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
  };
}

/**
 * Cursor-tracked glowing border card. A cone of light follows the pointer
 * along the card's perimeter, brightening as the cursor approaches an edge.
 *
 * - Outer halo via stacked `box-shadow` on an inner `.edge-light` element.
 * - Inner "soft bloom" via `mix-blend-mode: soft-light` for content near the
 *   edges (subtle; control via `[fillOpacity]`).
 * - Optional `[animated]` mode performs a one-shot sweep on mount, useful
 *   for drawing attention to a freshly-rendered card.
 *
 * @example
 * ```html
 * <wr-border-glow [animated]="true" [colors]="['#c084fc', '#f472b6', '#38bdf8']">
 *   <h3>Hover me</h3>
 *   <p>The border lights up where the cursor is.</p>
 * </wr-border-glow>
 * ```
 *
 * @see https://www.reactbits.dev/components/border-glow (visual reference)
 */
@Component({
  selector: 'wr-border-glow',
  templateUrl: './border-glow.html',
  styleUrl: './border-glow.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-border-glow',
    '(pointermove)': 'onPointerMove($event)',
  },
})
export class WrBorderGlow {
  /** Card background fill. @default '#120F17' */
  readonly backgroundColor = input('#120F17');

  /** Corner radius in pixels. @default 28 */
  readonly borderRadius = input(28, { transform: num(28) });

  /** Halo extent in pixels — how far the outer glow reaches past the card edge. @default 40 */
  readonly glowRadius = input(40, { transform: num(40) });

  /** Halo opacity multiplier (1 = full strength). @default 1 */
  readonly glowIntensity = input(1, { transform: num(1) });

  /** Width of the lit cone as a percentage of the perimeter. @default 25 */
  readonly coneSpread = input(25, { transform: num(25) });

  /** How sharply the halo fades as the cursor leaves the edge. Lower = wider falloff. @default 30 */
  readonly edgeSensitivity = input(30, { transform: num(30) });

  /** Strength of the soft-light interior fill near edges. @default 0.5 */
  readonly fillOpacity = input(0.5, { transform: num(0.5) });

  /** Halo colour as `'H S L'` (HSL parts, no commas). @default '40 80 80' */
  readonly glowColor = input('40 80 80');

  /** Mesh-gradient palette for the colored border slice. @default purple / pink / cyan */
  readonly colors = input<readonly string[]>(DEFAULT_COLORS);

  /** Play a one-shot perimeter sweep on mount, then fade out. @default false */
  readonly animated = input(false, { transform: coerceBooleanProperty });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Inline CSS variable bag — recomputed when colour / radius / sensitivity inputs change. */
  protected readonly cssVars = computed<Record<string, string>>(() => ({
    '--card-bg': this.backgroundColor(),
    '--border-radius': `${this.borderRadius()}px`,
    '--glow-padding': `${this.glowRadius()}px`,
    '--cone-spread': String(this.coneSpread()),
    '--edge-sensitivity': String(this.edgeSensitivity()),
    '--fill-opacity': String(this.fillOpacity()),
    ...buildGlowVars(this.glowColor(), this.glowIntensity()),
    ...buildGradientVars(this.colors()),
  }));

  constructor() {
    // Apply the variable bag to the host on every input change. Bind in an
    // effect rather than `host: { '[style.--foo]': '...' }` so a single
    // `setProperty` loop handles the lot.
    effect(() => {
      const host = this.el.nativeElement;
      const vars = this.cssVars();
      for (const [k, v] of Object.entries(vars)) host.style.setProperty(k, v);
    });

    if (!this.isBrowser) return;

    // Auto-sweep on mount — fires once when `animated` is true.
    effect(() => {
      if (!this.animated()) return;
      this.runAutoSweep();
    });
  }

  /** Pointer-driven update of `--cursor-angle` + `--edge-proximity`. */
  protected onPointerMove(event: PointerEvent): void {
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const dx = x - cx;
    const dy = y - cy;

    // `edge-proximity`: 0 at centre, 1 at the perimeter (whichever axis hits first).
    let edge = 0;
    if (dx !== 0 || dy !== 0) {
      const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
      const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
      edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    }

    // `cursor-angle`: 0deg = top, increases clockwise.
    let angle = 0;
    if (dx !== 0 || dy !== 0) {
      angle = Math.atan2(dy, dx) * RADIANS_TO_DEG + 90;
      if (angle < 0) angle += 360;
    }

    host.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
    host.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }

  /** One-shot perimeter sweep: in → around → out, mirroring the reactbits behaviour. */
  private runAutoSweep(): void {
    const host = this.el.nativeElement;
    const ANGLE_START = 110;
    const ANGLE_END = 465;
    host.classList.add('wr-border-glow--sweeping');
    host.style.setProperty('--cursor-angle', `${ANGLE_START}deg`);

    const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
    const easeInCubic = (t: number): number => t * t * t;
    const lerpAngle = (v: number): string => `${(ANGLE_END - ANGLE_START) * (v / 100) + ANGLE_START}deg`;

    // 1. Ramp edge-proximity up to 100 quickly.
    const cancelA = animateValue({
      duration: 500,
      onUpdate: v => host.style.setProperty('--edge-proximity', `${v}`),
    });
    // 2. Sweep angle first half (ease-in).
    const cancelB = animateValue({
      duration: 1500,
      end: 50,
      ease: easeInCubic,
      onUpdate: v => host.style.setProperty('--cursor-angle', lerpAngle(v)),
    });
    // 3. Sweep angle second half (ease-out).
    const cancelC = animateValue({
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      ease: easeOutCubic,
      onUpdate: v => host.style.setProperty('--cursor-angle', lerpAngle(v)),
    });
    // 4. Fade proximity back to 0.
    const cancelD = animateValue({
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      ease: easeInCubic,
      onUpdate: v => host.style.setProperty('--edge-proximity', `${v}`),
      onEnd: () => host.classList.remove('wr-border-glow--sweeping'),
    });

    this.destroyRef.onDestroy(() => {
      cancelA();
      cancelB();
      cancelC();
      cancelD();
      host.classList.remove('wr-border-glow--sweeping');
    });
  }
}

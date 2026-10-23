/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Port of the reactbits.dev BorderGlow effect — a cursor-tracked cone of
 * mesh-gradient light that follows the pointer along the card's perimeter,
 * with an outer halo, an optional auto-sweep on mount and an optional endless
 * loop.
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, PLATFORM_ID, ViewEncapsulation, computed, effect, inject, input } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { isSafeCssValue, numAttr } from 'ngwr/utils';

const RADIANS_TO_DEG = 180 / Math.PI;

/**
 * Where a looping cone rests under reduced motion, and where it starts when
 * nothing has written an angle yet — the stylesheet's own default.
 */
const REST_ANGLE = 45;

/**
 * The most frame time one loop step may count, in ms. A hidden tab, a long task
 * or a debugger stops frames without telling the loop, and the first frame back
 * would otherwise jump the cone by the whole time away.
 */
const MAX_LOOP_STEP_MS = 100;

/** `'40 80 80'`, `'268 100% 76%'`, `'40deg 80% 80%'` — the bare HSL parts `glowColor` has always taken. */
const HSL_PARTS = /^\s*([\d.]+)(?:deg)?\s+([\d.]+)%?\s+([\d.]+)%?\s*$/;

const GLOW_OPACITY_STEPS = [100, 60, 50, 40, 30, 20, 10] as const;
const GLOW_VAR_SUFFIXES = ['', '-60', '-50', '-40', '-30', '-20', '-10'] as const;

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'] as const;
const GRADIENT_VAR_NAMES = [
  '--wr-border-glow-gradient-one',
  '--wr-border-glow-gradient-two',
  '--wr-border-glow-gradient-three',
  '--wr-border-glow-gradient-four',
  '--wr-border-glow-gradient-five',
  '--wr-border-glow-gradient-six',
  '--wr-border-glow-gradient-seven',
] as const;
const GRADIENT_COLOR_INDEX = [0, 1, 2, 0, 1, 2, 1] as const;

const DEFAULT_COLORS: readonly string[] = ['#c084fc', '#f472b6', '#38bdf8'];

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> | null {
  const parts = HSL_PARTS.exec(glowColor);
  // Anything else is a CSS colour, interpolated into a `color-mix()` — so it is
  // held to the containment check `colors` and `backgroundColor` pass, and an
  // unsafe value leaves the halo to the theme.
  if (!parts && !isSafeCssValue(glowColor)) return null;
  const base = parts
    ? `${Number.parseFloat(parts[1])}deg ${Number.parseFloat(parts[2])}% ${Number.parseFloat(parts[3])}%`
    : glowColor.trim();
  const out: Record<string, string> = {};
  for (let i = 0; i < GLOW_OPACITY_STEPS.length; i++) {
    const alpha = Math.min(GLOW_OPACITY_STEPS[i] * intensity, 100);
    out[`--wr-border-glow-color${GLOW_VAR_SUFFIXES[i]}`] = parts
      ? `hsl(${base} / ${alpha}%)`
      : `color-mix(in srgb, ${base} ${alpha}%, transparent)`;
  }
  return out;
}

function buildGradientVars(colors: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  // Each entry is INTERPOLATED into the `radial-gradient()` below, so a value
  // that balances the parens around it escapes into a sibling layer and can add
  // a `url()` the browser fetches. One unsafe entry discards the palette — the
  // same all-or-nothing rule `wr-gradient-text` follows, for the same reason.
  const palette = colors.length > 0 && colors.every(color => isSafeCssValue(color)) ? colors : DEFAULT_COLORS;
  for (let i = 0; i < GRADIENT_VAR_NAMES.length; i++) {
    const colour = palette[Math.min(GRADIENT_COLOR_INDEX[i], palette.length - 1)];
    out[GRADIENT_VAR_NAMES[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${colour} 0px, transparent 50%)`;
  }
  out['--wr-border-glow-gradient-base'] = `linear-gradient(${palette[0]} 0 100%)`;
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
 * - Inner bloom near the edges, painted with a normal blend by default and
 *   overridable through `--wr-border-glow-fill-blend` (subtle; control the
 *   strength via `[fillOpacity]`).
 * - Optional `[animated]` mode performs a one-shot sweep on mount, useful
 *   for drawing attention to a freshly-rendered card.
 * - Optional `[loop]` mode circles the perimeter for ever, edge fully lit —
 *   a frame for a call to action rather than a reaction to the cursor.
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
    '(pointerenter)': 'onPointerEnter()',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'onPointerLeave()',
  },
})
export class WrBorderGlow {
  /** Card background fill. When unset, uses the theme surface token. */
  readonly backgroundColor = input<string | null>(null);

  /** Corner radius in pixels. @default 28 */
  readonly borderRadius = input(28, { transform: numAttr(28) });

  /** Halo extent in pixels — how far the outer glow reaches past the card edge. @default 40 */
  readonly glowRadius = input(40, { transform: numAttr(40) });

  /**
   * Halo opacity multiplier (1 = full strength).
   *
   * Applies only alongside an explicit `glowColor`: the halo variables are
   * built from the two together, so on the default palette this input is read
   * and never reaches a declaration.
   *
   * @default 1
   */
  readonly glowIntensity = input(1, { transform: numAttr(1) });

  /** Width of the lit cone as a percentage of the perimeter. @default 25 */
  readonly coneSpread = input(25, { transform: numAttr(25) });

  /** How sharply the halo fades as the cursor leaves the edge. Lower = wider falloff. @default 30 */
  readonly edgeSensitivity = input(30, { transform: numAttr(30) });

  /** Strength of the interior bloom near edges (blend: `--wr-border-glow-fill-blend`). @default 0.5 */
  readonly fillOpacity = input(0.5, { transform: numAttr(0.5) });

  /**
   * Halo colour: any CSS colour (`'#3567ff'`, `'var(--wr-color-primary)'`), or
   * the bare `'H S L'` parts (no commas) it has always taken. A value that
   * could escape the `color-mix()` it is composed into is ignored. When unset,
   * the theme decides: a deep amber on light surfaces, pale amber on dark.
   * Note `glowIntensity` only applies alongside an explicit `glowColor`.
   */
  readonly glowColor = input<string | null>(null);

  /**
   * Mesh-gradient palette for the colored border slice. When unset, the
   * theme decides: deep tones on light, pastels on dark.
   */
  readonly colors = input<readonly string[] | null>(null);

  /** Play a one-shot perimeter sweep on mount, then fade out. @default false */
  readonly animated = input(false, { transform: coerceBooleanProperty });

  /**
   * Circle the perimeter for ever at a constant pace, edge fully lit. The
   * pointer still drives while it is over the card, and the loop picks up from
   * where it left. Replaces the `animated` sweep; under reduced motion the edge
   * stays lit and still.
   *
   * @default false
   */
  readonly loop = input(false, { transform: coerceBooleanProperty });

  /** Seconds per lap while `loop` is on. @default 6 */
  readonly speed = input(6, { transform: numAttr(6) });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Whether a pointer is over the card — the loop holds still while it drives. */
  private pointerInside = false;

  /** Inline CSS variable bag — recomputed when colour / radius / sensitivity inputs change. */
  protected readonly cssVars = computed<Record<string, string>>(() => {
    const vars: Record<string, string> = {
      '--wr-border-glow-radius': `${this.borderRadius()}px`,
      '--wr-border-glow-padding': `${this.glowRadius()}px`,
      '--wr-border-glow-cone-spread': String(this.coneSpread()),
      '--wr-border-glow-edge-sensitivity': String(this.edgeSensitivity()),
      '--wr-border-glow-fill-opacity': String(this.fillOpacity()),
    };
    const colors = this.colors();
    if (colors !== null) Object.assign(vars, buildGradientVars(colors));
    // Colour vars are written only when set — otherwise the stylesheet's
    // per-theme defaults (light vs dark) take over.
    // Composed, not passed through: `_rules.scss` reads this var inside a
    // `linear-gradient()` and again in a `background` shorthand, where a `url()`
    // is valid and fetches. An audit bound `url("…")` here and recorded the
    // request. Validated like its `colors` sibling on this same component —
    // leaving one of the two unchecked is two rules inside one component.
    const bg = this.backgroundColor();
    if (bg !== null && isSafeCssValue(bg)) vars['--wr-border-glow-bg'] = bg;
    const glow = this.glowColor();
    const glowVars = glow === null ? null : buildGlowVars(glow, this.glowIntensity());
    if (glowVars !== null) Object.assign(vars, glowVars);
    return vars;
  });

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

    // Auto-sweep on mount — fires once when `animated` is true, unless `loop`
    // replaces it.
    effect(onCleanup => {
      if (!this.animated() || this.loop()) return;
      onCleanup(this.runAutoSweep());
    });

    // Endless loop. Reduced motion is read here, so a change to the preference
    // swaps the rotation for a still, lit edge and back.
    effect(onCleanup => {
      if (!this.loop()) return;
      onCleanup(this.runLoop(this.platform.prefersReducedMotion()));
    });
  }

  protected onPointerEnter(): void {
    this.pointerInside = true;
  }

  /** Hands the cone back to the loop, re-lit, from wherever the pointer left it. */
  protected onPointerLeave(): void {
    this.pointerInside = false;
    if (this.loop()) this.el.nativeElement.style.setProperty('--wr-border-glow-edge-proximity', '100');
  }

  /** Pointer-driven update of `--wr-border-glow-angle` + `--wr-border-glow-edge-proximity`. */
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

    host.style.setProperty('--wr-border-glow-edge-proximity', (edge * 100).toFixed(3));
    host.style.setProperty('--wr-border-glow-angle', `${angle.toFixed(3)}deg`);
  }

  /** One-shot perimeter sweep: in → around → out, mirroring the reactbits behaviour. */
  private runAutoSweep(): () => void {
    // Reduced motion: skip the decorative mount sweep. The pointer-driven
    // glow stays — it maps 1:1 to the cursor with no autonomous motion.
    if (this.platform.prefersReducedMotion()) return () => undefined;
    const host = this.el.nativeElement;
    const ANGLE_START = 110;
    const ANGLE_END = 465;
    host.classList.add('wr-border-glow--sweeping');
    host.style.setProperty('--wr-border-glow-angle', `${ANGLE_START}deg`);

    const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
    const easeInCubic = (t: number): number => t * t * t;
    const lerpAngle = (v: number): string => `${(ANGLE_END - ANGLE_START) * (v / 100) + ANGLE_START}deg`;

    // 1. Ramp edge-proximity up to 100 quickly.
    const cancelA = animateValue({
      duration: 500,
      onUpdate: v => host.style.setProperty('--wr-border-glow-edge-proximity', `${v}`),
    });
    // 2. Sweep angle first half (ease-in).
    const cancelB = animateValue({
      duration: 1500,
      end: 50,
      ease: easeInCubic,
      onUpdate: v => host.style.setProperty('--wr-border-glow-angle', lerpAngle(v)),
    });
    // 3. Sweep angle second half (ease-out).
    const cancelC = animateValue({
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      ease: easeOutCubic,
      onUpdate: v => host.style.setProperty('--wr-border-glow-angle', lerpAngle(v)),
    });
    // 4. Fade proximity back to 0.
    const cancelD = animateValue({
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      ease: easeInCubic,
      onUpdate: v => host.style.setProperty('--wr-border-glow-edge-proximity', `${v}`),
      onEnd: () => host.classList.remove('wr-border-glow--sweeping'),
    });

    // Returned rather than registered on `destroyRef`: this method runs from an
    // effect, so registering there stacked one more teardown per re-run and none
    // of them fired until the component died. The caller ties it to the effect's
    // own cleanup instead.
    return () => {
      cancelA();
      cancelB();
      cancelC();
      cancelD();
      host.classList.remove('wr-border-glow--sweeping');
    };
  }

  /** Endless perimeter loop at a constant pace. Returns its canceller, like `runAutoSweep`. */
  private runLoop(reducedMotion: boolean): () => void {
    const host = this.el.nativeElement;
    host.classList.add('wr-border-glow--looping');
    host.style.setProperty('--wr-border-glow-edge-proximity', '100');

    // Reduced motion: no rotation at all. The edge stays lit and still, so a
    // card that uses it as a frame keeps one.
    if (reducedMotion) {
      host.style.setProperty('--wr-border-glow-angle', `${REST_ANGLE}deg`);
      return () => host.classList.remove('wr-border-glow--looping');
    }

    let raf = 0;
    let angle = REST_ANGLE;
    // `null` until there is a frame to measure from: the first frame, and the
    // first after the pointer leaves or the card scrolls back into view, pick up
    // the painted angle instead of jumping by the time that passed.
    let last: number | null = null;

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      if (this.pointerInside) {
        last = null;
        return;
      }
      if (last === null) {
        angle = this.paintedAngle();
      } else {
        // By elapsed time rather than per frame, so the pace is the same at
        // any refresh rate. `speed` is in seconds, the timestamps in ms.
        const lap = this.speed() * 1000;
        const step = Math.min(now - last, MAX_LOOP_STEP_MS);
        if (lap > 0) angle = (angle + (360 * step) / lap) % 360;
      }
      last = now;
      host.style.setProperty('--wr-border-glow-angle', `${angle.toFixed(3)}deg`);
    };
    const start = (): void => {
      if (raf === 0) raf = requestAnimationFrame(tick);
    };
    const pause = (): void => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    };

    // Off screen the loop stops asking for frames. Without an observer (jsdom)
    // it simply runs.
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'undefined') {
      start();
    } else {
      observer = new IntersectionObserver(entries => (entries[entries.length - 1].isIntersecting ? start() : pause()));
      observer.observe(host);
    }

    return () => {
      observer?.disconnect();
      pause();
      host.classList.remove('wr-border-glow--looping');
    };
  }

  /** The angle the host paints now — the pointer's, a sweep's or the loop's own. */
  private paintedAngle(): number {
    const angle = Number.parseFloat(this.el.nativeElement.style.getPropertyValue('--wr-border-glow-angle'));
    return Number.isNaN(angle) ? REST_ANGLE : angle;
  }
}

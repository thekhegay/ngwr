import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

import { VISIBLE } from '../stagger';

/**
 * Where the target is in its cycle. `wait` is the quiet between bursts, where a
 * hover or focus may bring the next one forward; `burst` is the glitch itself;
 * `cool` is the first second after a burst, where nothing may start one. `null`
 * is off: nothing is scheduled and the target holds no copy.
 */
type GlitchState = 'wait' | 'burst' | 'cool';

/** Before the first burst after the target comes into view, in ms: the page settles first. */
const GLITCH_DELAY = 400;

/** How long one burst lasts, in ms: inside this range, which burst decides where. */
const GLITCH_BURST_MIN = 300;
const GLITCH_BURST_MAX = 500;

/** From the end of one burst to the start of the next, in ms: inside this range, which burst decides where. */
const GLITCH_GAP_MIN = 5000;
const GLITCH_GAP_MAX = 8000;

/**
 * After a burst ends, how long a hover or focus is ignored, in ms. A burst is
 * one pair of opposing luminance changes over the glyphs (the copies appear
 * and vanish), and with the shortest burst and this hold after it two bursts
 * start at least 1.3 s apart, so no pointer can make more than one such pair
 * in any one second: a third of what WCAG 2.3.1 allows.
 */
const GLITCH_COOLDOWN = 1000;

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/** The `target` input: a bare `ngwrGlitch` is the empty string, and means the host. */
const selector = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);

/** `(n * φ) mod 1` for n = 1, 2, 3, ...: spreads over (0, 1) with no two neighbours close and no period a reader could learn. */
const PHI = 0.618_033_988_749_895;

/** Burst `n`'s place in its range, in (0, 1), for the n-th burst since the directive was made. */
function glitchVariation(n: number, phase = 0): number {
  const x = (n * PHI + phase) % 1;
  return x < 0 ? x + 1 : x;
}

/** How long burst `n` lasts, in ms: between {@link GLITCH_BURST_MIN} and {@link GLITCH_BURST_MAX}. */
function glitchBurstMs(n: number): number {
  return Math.round(GLITCH_BURST_MIN + glitchVariation(n) * (GLITCH_BURST_MAX - GLITCH_BURST_MIN));
}

/** How long the quiet after burst `n` lasts, in ms: between {@link GLITCH_GAP_MIN} and {@link GLITCH_GAP_MAX}, and never under the cooldown. */
function glitchGapMs(n: number): number {
  return Math.max(
    GLITCH_COOLDOWN,
    Math.round(GLITCH_GAP_MIN + glitchVariation(n, 0.5) * (GLITCH_GAP_MAX - GLITCH_GAP_MIN))
  );
}

/**
 * A short piece of text that, now and then, looks like a broken signal for a
 * fraction of a second: two tinted copies of it are cut into thin horizontal
 * slices that jump sideways by a few pixels while the text itself leans and
 * shifts a little, then everything snaps back clean.
 *
 * It plays in bursts, never as a constant flicker: one burst shortly after the
 * target comes into view, then one every several seconds, and one at once on a
 * pointer entering or focus landing on the target (or its closest focusable
 * ancestor) while the text is waiting. The length of a burst and the quiet
 * after it walk a fixed low-discrepancy sequence ({@link glitchBurstMs},
 * {@link glitchGapMs}), so the cadence is reproducible and still never reads as
 * a metronome. A burst in flight is never restarted, and a second after one
 * ends nothing can start another, so two bursts start at least 1.3 s apart
 * and the text shows at most one opposing pair of luminance changes in any
 * one second, where WCAG 2.3.1 allows three. The copies are theme inks mixed to about half
 * strength and offset by a few pixels, so what moves is a faint tint over the
 * glyphs, not a strobe, and the text reads in its own colour at every frame.
 * The cycle runs only while most of the target is in the viewport and the
 * document is visible, and costs nothing otherwise.
 *
 * The effect usually sits on its host, but a selector as the directive's value
 * points it at one descendant instead, for a heading a library component draws
 * (`<wr-result-404 ngwrGlitch=".wr-result__title">`). The target is looked up
 * once after the first render; if nothing matches, nothing happens.
 *
 * The text is never touched: its node stays where it is, with its bindings.
 * The copies are two `aria-hidden` spans appended to the target for the length
 * of a burst and removed after it. They are absolutely positioned over the
 * target's box, so the line never moves, and they sit outside the selection
 * (`user-select: none`), so a copy of the page gives the text once. Nothing
 * plays under `prefers-reduced-motion: reduce`, under `forced-colors: active`,
 * on the server or without `IntersectionObserver`. Styles: `glitch.scss`,
 * loaded by `styles.scss`.
 */
@Directive({
  selector: '[ngwrGlitch]',
})
export class Glitch {
  /**
   * A selector for one descendant of the host to glitch instead of the host
   * itself, written as the directive's own value: `ngwrGlitch=".wr-result__title"`.
   * Resolved once after the first render with `querySelector`; a selector that
   * matches nothing turns the effect off. Unset or empty, the host.
   */
  readonly target = input<string | null, unknown>(null, { alias: 'ngwrGlitch', transform: selector });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly intersecting = signal(false);
  private observer: IntersectionObserver | null = null;
  private listeners: AbortController | null = null;
  /** The element that glitches, once resolved and armed; `null` before and after. */
  private el: HTMLElement | null = null;
  private copies: HTMLElement[] = [];
  private state: GlitchState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Bursts begun so far: the index into the variation sequence. */
  private bursts = 0;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      // The stylesheet paints no copy under forced colours: nothing to run.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;

      const host = this.host.nativeElement;
      const selector = this.target();
      const el = selector ? host.querySelector<HTMLElement>(selector) : host;
      if (!el) return;
      this.el = el;
      el.classList.add('ngwr-glitch');

      // The target, not the host: the host may be a box-less wrapper
      // (`display: contents`) that no observer can measure.
      this.observer = new IntersectionObserver(
        entries => this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false),
        { threshold: VISIBLE }
      );
      this.observer.observe(el);
      this.listen();
    });

    // One place decides whether the cycle runs: in view, page visible, motion allowed.
    effect(() => {
      const on = this.intersecting() && this.platform.pageVisible() && !this.platform.prefersReducedMotion();
      if (on) this.start();
      else this.stop();
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      this.listeners?.abort();
      this.listeners = null;
      this.stop();
      this.el?.classList.remove('ngwr-glitch');
      this.el = null;
    });
  }

  /**
   * Read on the glitching element, or its closest focusable ancestor, which is
   * what a keyboard reaches. Not the host: on a targeted heading the host is a
   * whole component, and a focus on one of its buttons is not about the heading.
   */
  private listen(): void {
    const el = this.el ?? this.host.nativeElement;
    const source = el.closest<HTMLElement>(FOCUSABLE) ?? el;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    source.addEventListener('pointerenter', () => this.nudge(), options);
    source.addEventListener('focusin', () => this.nudge(), options);
  }

  /** Begin the cycle at the first delay, unless it already runs. */
  private start(): void {
    if (this.state !== null || !this.el) return;
    this.schedule('wait', GLITCH_DELAY, () => this.burst());
  }

  /** Off at once: no timer, no copy, no modifier. */
  private stop(): void {
    this.clearTimer();
    this.state = null;
    this.clean();
  }

  /** A hover or focus: burst now when the text is waiting, never mid-burst, in the cooldown or when the cycle is off. */
  private nudge(): void {
    if (this.state === 'wait') this.burst();
  }

  /**
   * One burst: the copies go in, the target gets the modifier and the burst's
   * length as a custom property, so the stylesheet's animations last exactly
   * as long as the timer that takes everything out again.
   */
  private burst(): void {
    const el = this.el;
    if (!el) return;
    const n = ++this.bursts;
    const ms = glitchBurstMs(n);
    const text = el.textContent ?? '';
    if (text.trim() !== '') {
      this.copies = ['a', 'b'].map(which => {
        const copy = el.ownerDocument.createElement('span');
        copy.className = `ngwr-glitch__copy ngwr-glitch__copy--${which}`;
        copy.setAttribute('aria-hidden', 'true');
        copy.textContent = text;
        return copy;
      });
      el.append(...this.copies);
    }
    el.style.setProperty('--ngwr-glitch-burst', `${ms}ms`);
    el.classList.add('ngwr-glitch--burst');
    this.schedule('burst', ms, () => {
      this.clean();
      const gap = glitchGapMs(n);
      this.schedule('cool', GLITCH_COOLDOWN, () => this.schedule('wait', gap - GLITCH_COOLDOWN, () => this.burst()));
    });
  }

  /** Take the copies, the modifier and the burst length off the target. Idempotent. */
  private clean(): void {
    for (const copy of this.copies) copy.remove();
    this.copies = [];
    this.el?.classList.remove('ngwr-glitch--burst');
    this.el?.style.removeProperty('--ngwr-glitch-burst');
  }

  private schedule(state: GlitchState, ms: number, next: () => void): void {
    this.clearTimer();
    this.state = state;
    this.timer = setTimeout(() => {
      this.timer = null;
      next();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

export {
  GLITCH_BURST_MAX,
  GLITCH_BURST_MIN,
  GLITCH_COOLDOWN,
  GLITCH_DELAY,
  GLITCH_GAP_MAX,
  GLITCH_GAP_MIN,
  glitchBurstMs,
  glitchGapMs,
  glitchVariation,
};
export type { GlitchState };

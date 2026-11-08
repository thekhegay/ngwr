/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, effect, inject, signal } from '@angular/core';

import { VIEW_THRESHOLD } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { wrCheckStyles } from 'ngwr/utils';

import type { WrShineState } from './types';

const STATES: readonly WrShineState[] = ['first', 'pass', 'rest'];

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/** The `animation-name` of the band and of the silent wait, as the stylesheet declares them. */
const PASS = 'wr-shine-pass';
const REST = 'wr-shine-rest';

/**
 * A soft band of light that crosses the glyphs of a short label, waits, and
 * crosses again, for as long as the label is on screen. The directive owns the
 * cadence and the stylesheet owns the paint: the host cycles through three
 * modifiers, each of which is one CSS animation, and the directive flips to
 * the next on `animationend`. So the pass, the pause and the first delay are
 * all stylesheet durations (`--wr-shine-pass`, `--wr-shine-pause`,
 * `--wr-shine-delay`) and no script runs between two flips.
 *
 * It costs nothing off screen: the cycle runs only while most of the host is
 * in the viewport and the document is visible, and stops (no modifier, no
 * animation) the moment either ends. A pointer entering or focus landing on
 * the host, or on its closest focusable ancestor, plays one pass at once when
 * the host is waiting, and is ignored while a pass is in flight.
 *
 * The text is never touched: no split, no copy, no pseudo-element content.
 * The band is a background clipped to the glyphs over the text's own colour,
 * so what a screen reader hears, what a selection copies and where the lines
 * break are what they were. Nothing plays under
 * `prefers-reduced-motion: reduce`, under `forced-colors: active`, on the
 * server or without `IntersectionObserver`. Put it on an element that holds
 * only text and paints no background of its own, such as a `<span>` inside a
 * badge: a background on the host would be covered while the band passes.
 */
@Directive({
  selector: '[wrShine]',
  host: { class: 'wr-shine' },
})
export class WrShine {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly intersecting = signal(false);
  private observer: IntersectionObserver | null = null;
  private listeners: AbortController | null = null;
  private state: WrShineState | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/shine');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      // The stylesheet paints no band under forced colours; without this the
      // host would sit in `--pass` forever, waiting for an end that never comes.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;

      this.observer = new IntersectionObserver(
        entries => this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false),
        { threshold: VIEW_THRESHOLD }
      );
      this.observer.observe(this.host.nativeElement);
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
    });
  }

  /** The closest focusable ancestor is what a keyboard reaches, so it is what both events are read on. */
  private listen(): void {
    const host = this.host.nativeElement;
    const target = host.closest<HTMLElement>(FOCUSABLE) ?? host;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    target.addEventListener('pointerenter', () => this.nudge(), options);
    target.addEventListener('focusin', () => this.nudge(), options);
    host.addEventListener('animationend', event => this.onAnimationEnd(event), options);
  }

  /** Begin the cycle at the first delay, unless it already runs. */
  private start(): void {
    if (this.state !== null) return;
    this.set('first');
  }

  private stop(): void {
    this.set(null);
  }

  /** A hover or focus: play a pass now when the host is waiting, never while one is in flight or when the cycle is off. */
  private nudge(): void {
    if (this.state === 'first' || this.state === 'rest') this.set('pass');
  }

  /**
   * The host's own animation ended: a wait becomes a pass, a pass becomes a
   * wait. A child's animation, or one that is not this effect's, is not it.
   */
  private onAnimationEnd(event: Event): void {
    if (event.target !== this.host.nativeElement || this.state === null) return;
    const name = (event as AnimationEvent).animationName;
    if (name === REST && this.state !== 'pass') this.set('pass');
    else if (name === PASS && this.state === 'pass') this.set('rest');
  }

  /**
   * Written to the DOM by hand rather than through a binding: the next state
   * must be on the host in the same task as the `animationend` that asked for
   * it, and change detection may run after the next paint.
   */
  private set(state: WrShineState | null): void {
    this.state = state;
    const classes = this.host.nativeElement.classList;
    for (const each of STATES) classes.toggle(`wr-shine--${each}`, each === state);
  }
}

// The two animation names, for the spec; the entry point does not export them.
export { PASS as SHINE_PASS, REST as SHINE_REST };

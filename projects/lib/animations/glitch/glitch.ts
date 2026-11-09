/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { FOCUSABLE, optionalSelector } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * A short piece of text that looks like a broken signal while the pointer is
 * over it: two tinted copies of it are cut into thin horizontal slices that
 * jump sideways by a few pixels while the text itself leans and shifts a
 * little. The moment the pointer leaves, everything snaps back clean.
 *
 * It plays only under a pointer or with keyboard focus, never on its own: a
 * pointer entering the target (or its closest focusable ancestor, which is
 * what a keyboard reaches) starts it, and the matching leave or focusout stops
 * it. While it plays the stylesheet loops one cycle of `--wr-glitch-cycle`,
 * 1.2 s unset, in six held steps; each step shows one thin slice of each
 * copy, and the twelve slices of a cycle are disjoint bands of the line, so no
 * point of the text is lit more than once per cycle by either copy. Any one
 * second therefore holds at most two opposing pairs of luminance changes at
 * any point (the end of one cycle and the start of the next), where WCAG 2.3.1
 * allows three, and each is a faint tint over a thin band of glyphs, never a
 * strobe: the copies are theme inks mixed to about half strength and offset
 * by a few pixels, so the text reads in its own colour at every frame.
 * Nothing runs while the document is hidden, and a pointer still over the
 * target when it is shown again picks the effect back up.
 *
 * The effect usually sits on its host, but a selector as the directive's value
 * points it at one descendant instead, for a heading a library component draws
 * (`<wr-result-404 wrGlitch=".wr-result__title">`). The target is looked up
 * once after the first render; if nothing matches, nothing happens.
 *
 * The text is never touched: its node stays where it is, with its bindings.
 * The copies are two `aria-hidden` spans appended to the target while it plays
 * and removed after. They are absolutely positioned over the target's box, so
 * the line never moves, and they sit outside the selection (`user-select:
 * none`), so a copy of the page gives the text once. Nothing plays under
 * `prefers-reduced-motion: reduce`, under `forced-colors: active` or on the
 * server.
 */
@Directive({
  selector: '[wrGlitch]',
})
export class WrGlitch {
  /**
   * A selector for one descendant of the host to glitch instead of the host
   * itself, written as the directive's own value: `wrGlitch=".wr-result__title"`.
   * Resolved once after the first render with `querySelector`; a selector that
   * matches nothing turns the effect off. Unset or empty, the host.
   */
  readonly target = input<string | null, unknown>(null, { alias: 'wrGlitch', transform: optionalSelector });

  /**
   * Plays the effect while true, exactly as under a pointer; hover and focus
   * still start it when this is false. Drive it with short bursts to make a
   * tile glitch on its own: keep each burst to one cycle or more and the gaps
   * longer than the burst, so the flash budget above holds.
   */
  readonly active = input(false, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  /** A pointer is over the source, or focus is in it. */
  private readonly engaged = signal(false);
  private readonly playing = computed(() => this.engaged() || this.active());
  private listeners: AbortController | null = null;
  /** The element that glitches, once resolved and armed; `null` before and after. */
  private el: HTMLElement | null = null;
  private copies: HTMLElement[] = [];
  private live = false;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/glitch');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion()) return;
      // The stylesheet paints no copy under forced colours: nothing to run.
      if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;

      const host = this.host.nativeElement;
      const selector = this.target();
      const el = selector ? host.querySelector<HTMLElement>(selector) : host;
      if (!el) return;
      this.el = el;
      el.classList.add('wr-glitch');
      this.listen();
    });

    // One place decides whether it plays: engaged, page visible, motion allowed.
    effect(() => {
      const on = this.playing() && this.platform.pageVisible() && !this.platform.prefersReducedMotion();
      untracked(() => (on ? this.start() : this.stop()));
    });

    inject(DestroyRef).onDestroy(() => {
      this.listeners?.abort();
      this.listeners = null;
      this.stop();
      this.el?.classList.remove('wr-glitch');
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
    source.addEventListener('pointerenter', () => this.engaged.set(true), options);
    source.addEventListener('pointerleave', () => this.engaged.set(false), options);
    source.addEventListener('focusin', () => this.engaged.set(true), options);
    source.addEventListener('focusout', () => this.engaged.set(false), options);
  }

  /** The copies go in and the target gets the modifier; the stylesheet loops from there. Idempotent. */
  private start(): void {
    const el = this.el;
    if (this.live || !el) return;
    this.live = true;
    const text = el.textContent ?? '';
    if (text.trim() !== '') {
      this.copies = ['a', 'b'].map(which => {
        const copy = el.ownerDocument.createElement('span');
        copy.className = `wr-glitch__copy wr-glitch__copy--${which}`;
        copy.setAttribute('aria-hidden', 'true');
        copy.textContent = text;
        return copy;
      });
      el.append(...this.copies);
    }
    el.classList.add('wr-glitch--live');
  }

  /** Take the copies and the modifier off the target. Idempotent. */
  private stop(): void {
    this.live = false;
    for (const copy of this.copies) copy.remove();
    this.copies = [];
    this.el?.classList.remove('wr-glitch--live');
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import {
  BREAKING_SPACES,
  VIEW_THRESHOLD,
  type WrStaggerBy,
  graphemes,
  optionalMs,
  staggerGap,
} from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { numAttr, wrCheckStyles } from 'ngwr/utils';

import type { WrRevealTrigger } from './types';

/** One piece and its place in the sequence. */
interface RevealPiece {
  readonly text: string;
  readonly index: number;
}

/** A word's pieces, or the run of spaces after it (`pieces` empty). */
interface RevealItem {
  readonly gap: string;
  readonly pieces: readonly RevealPiece[];
}

/**
 * A text run that rises into place piece by piece on page load, for a hero
 * headline. Built for above the fold: the pieces come from the template, so
 * the server HTML already holds them, and the motion is a CSS animation that
 * starts at first paint, before any script, and keeps running through
 * hydration. A piece carries its index in `--wr-reveal-i`; the
 * stylesheet turns that into a delay. Several runs in one headline form one
 * sequence through `start`, and an inline element that is not text (a logo
 * chip) joins it as class `wr-reveal__item` with the same custom
 * property set inline. While the pieces play they are `aria-hidden`, with a
 * visually-hidden copy of the text beside them, so a screen reader hears the
 * sentence once; when the last piece lands the host swaps them for the plain
 * text, so the headline at rest is exactly the text it would have been,
 * kerning and copy included. Under `prefers-reduced-motion: reduce` the
 * stylesheet plays nothing and the host swaps at once. Without script the
 * pieces still end fully visible.
 */
@Component({
  selector: 'wr-reveal',
  templateUrl: './reveal.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-reveal',
    '[class.wr-reveal--play]': 'play()',
    '[class.wr-reveal--masked]': 'masked()',
    '[style.--wr-reveal-gap]': 'gap()',
    '[style.--wr-reveal-delay]': 'delayMs()',
    '(animationend)': 'onAnimationEnd($event)',
    '(animationcancel)': 'settle()',
  },
})
export class WrReveal {
  /** The text of this run. Breaking spaces stay real spaces, so it wraps as plain text would. */
  readonly text = input.required<string>();

  /**
   * What enters one at a time: a grapheme, or a word. In letter mode the
   * letters of one word sit in a no-wrap wrapper, so a word never breaks across
   * lines mid-word. @default 'letters'
   */
  readonly by = input<WrStaggerBy>('letters');

  /**
   * Each word clips its pieces at a padded line box, so a letter comes up from
   * under the line instead of fading in where it stands. Descenders and
   * accents at rest sit inside the padding. @default false
   */
  readonly masked = input(false, { transform: booleanAttribute });

  /**
   * The index of this run's first piece. A headline made of several runs
   * passes each one the count the runs before it used, so they play as one
   * sequence. @default 0
   */
  readonly start = input(0, { transform: numAttr(0) });

  /**
   * Gap between the start of one piece and the next, in ms. Unset, the mode
   * decides: 28 for letters, 70 for words. Either way the sequence up to this
   * run's last piece spreads over 1.2 s at most; a long sequence of several
   * runs sets the same `stagger` on each, so the gap is one gap.
   */
  readonly stagger = input<number | null, unknown>(null, { transform: optionalMs });

  /** Pause before the first piece of the sequence, in ms. @default 0 */
  readonly delay = input(0, { transform: numAttr(0) });

  /**
   * `load` plays from first paint, with no script. `view` keeps the pieces
   * visible and arms them the first time most of the host is in the viewport;
   * an `__item` outside the host does not follow it. @default 'load'
   */
  readonly trigger = input<WrRevealTrigger>('load');

  protected readonly items = computed<RevealItem[]>(() => {
    const letters = this.by() === 'letters';
    const items: RevealItem[] = [];
    let index = this.start();
    // `split` on a capturing group alternates: a run of text, then the spaces after it.
    this.text()
      .split(BREAKING_SPACES)
      .forEach((run, i) => {
        if (run === '') return;
        if (i % 2 === 1) {
          items.push({ gap: run, pieces: [] });
          return;
        }
        const texts = letters ? graphemes(run) : [run];
        items.push({ gap: '', pieces: texts.map(text => ({ text, index: index++ })) });
      });
    return items;
  });

  protected readonly count = computed(() => this.items().reduce((n, item) => n + item.pieces.length, 0));

  protected readonly gap = computed(() => `${staggerGap(this.by(), this.start() + this.count(), this.stagger())}ms`);

  protected readonly delayMs = computed(() => `${Math.max(0, this.delay())}ms`);

  /** The pieces are gone and the host holds the plain text. */
  protected readonly settled = signal(false);

  /** `view` mode: the host has been in view, the pieces may hide and play. */
  protected readonly armed = signal(false);

  protected readonly plain = computed(() => this.settled() || this.count() === 0);

  protected readonly play = computed(() => this.trigger() === 'load' || this.armed());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private observer: IntersectionObserver | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/reveal');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion()) {
        this.settle();
        return;
      }
      const host = this.host.nativeElement;
      if (this.trigger() === 'load') {
        // Hydrated after the last piece landed: its `animationend` is not coming.
        if (typeof host.getAnimations === 'function' && host.getAnimations({ subtree: true }).length === 0) {
          this.settle();
        }
        return;
      }
      if (typeof IntersectionObserver === 'undefined') {
        this.settle();
        return;
      }
      this.observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          this.observer?.disconnect();
          this.observer = null;
          if (this.platform.prefersReducedMotion()) this.settle();
          else this.armed.set(true);
        },
        { threshold: VIEW_THRESHOLD }
      );
      this.observer.observe(host);
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
    });
  }

  /**
   * The run's last piece landed: swap the pieces for the text. Pieces play in
   * index order and last the same, so the last one ends last, and the ends
   * that hydration missed do not matter.
   */
  protected onAnimationEnd(event: Event): void {
    const target = event.target as HTMLElement;
    const last = this.start() + this.count() - 1;
    if (target.style?.getPropertyValue('--wr-reveal-i') === String(last)) this.settle();
  }

  protected settle(): void {
    this.settled.set(true);
  }
}

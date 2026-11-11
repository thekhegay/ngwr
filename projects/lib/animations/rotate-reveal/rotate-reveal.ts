/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrCheckStyles } from 'ngwr/utils';

import { VIEW_THRESHOLD, graphemes } from '../internal';

/** How long a word stands before the next one takes its place when `hold` is not set, in ms. */
const ROTATE_REVEAL_HOLD = 2400;

/** One letter of the word leaving or the word arriving, and its place in the stagger. */
interface RotateRevealLetter {
  readonly text: string;
  readonly index: number;
}

const letters = (word: string): RotateRevealLetter[] => graphemes(word).map((text, index) => ({ text, index }));

/**
 * One word of a sentence that gives way to the next from a list, in place.
 * The letters of the word leaving rise out of the line and fade, one after
 * another, while the letters of the word arriving climb in from under it, and
 * the slot they stand in eases from the one word's width to the other's, so
 * the rest of the sentence glides rather than jumps. The slot is clipped to
 * the line, so a letter on its way never crosses a neighbouring line.
 *
 * The widths come from one measurement of every word in the browser, once the
 * fonts are ready and again on resize, never from a layout read per swap. The
 * swap itself is CSS: one state change splits the two words into letters, the
 * stylesheet animates them and the width, and the `animationend` of the last
 * letter arriving puts the plain word back, so at rest the slot holds nothing
 * but the text, kerning and copy included.
 *
 * The list plays once: after the last word the first comes back and stays, as
 * WCAG 2.2.2 asks of content that moves on its own; `loop` lifts that. A
 * pointer over the sentence, or focus in it, pauses the hold and leaving
 * resumes it, and so does the host leaving the viewport or the document being
 * hidden. The slot is `aria-hidden` and a visually-hidden phrase beside it
 * names every word once, so a screen reader hears "A, B and C" and never a
 * word mid-flight; the phrase is out of the selection, so a copy of the
 * sentence gives the word on show. The server renders the first word as text,
 * and so does a browser under `prefers-reduced-motion: reduce` or without
 * `IntersectionObserver`: nothing swaps there, not even without motion.
 */
@Component({
  selector: 'wr-rotate-reveal',
  templateUrl: './rotate-reveal.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-rotate-reveal',
    '[class.wr-rotate-reveal--swap]': 'outgoing() !== null',
    '(animationend)': 'onAnimationEnd($event)',
    '(animationcancel)': 'settle()',
  },
})
export class WrRotateReveal {
  /** The words, in the order they show. The first is what the server and a still page show. */
  readonly words = input.required<readonly string[]>();

  /** How long a word stands before the next replaces it, in ms. @default 2400 */
  readonly hold = input(ROTATE_REVEAL_HOLD, { transform: wrNumAttr(ROTATE_REVEAL_HOLD) });

  /**
   * Pause before the first word's hold starts counting, in ms, from the moment
   * the host is in view: room for an entrance above it to finish. @default 0
   */
  readonly delay = input(0, { transform: wrNumAttr(0) });

  /** Keep cycling instead of stopping on the first word after one pass through the list. @default false */
  readonly loop = input(false, { transform: booleanAttribute });

  /**
   * The word between the last two words of the phrase a screen reader hears:
   * "A, B and C". Unset, the `rotateReveal.conjunction` string of the i18n
   * catalog, "and" in English.
   */
  readonly conjunctionLabel = input<string | null>(null);

  /** Which word stands in the slot. */
  protected readonly index = signal(0);

  /** The word on its way out while a swap plays, else `null`: the slot holds the plain word. */
  protected readonly outgoing = signal<number | null>(null);

  protected readonly word = computed(() => this.words()[this.index()] ?? '');

  protected readonly outLetters = computed(() => {
    const outgoing = this.outgoing();
    return outgoing === null ? [] : letters(this.words()[outgoing] ?? '');
  });

  protected readonly inLetters = computed(() => (this.outgoing() === null ? [] : letters(this.word())));

  /** The longer of the two words in letters: how far the stagger reaches, for the stylesheet's swap length. */
  protected readonly count = computed(() => Math.max(this.outLetters().length, this.inLetters().length));

  private readonly conjunction = useI18nText(this.conjunctionLabel, 'rotateReveal.conjunction', 'and');

  /** Every word once, as a phrase: "A, B and C". */
  protected readonly phrase = computed(() => {
    const words = this.words();
    if (words.length < 2) return words[0] ?? '';
    return `${words.slice(0, -1).join(', ')} ${this.conjunction()} ${words[words.length - 1]}`;
  });

  /** The measured width of each word, in px, or `null` until the browser has measured them. */
  private readonly widths = signal<readonly number[] | null>(null);

  /** The slot's width target: the current word's measured width, or none until measured. */
  protected readonly width = computed(() => this.widths()?.[this.index()] ?? null);

  private readonly intersecting = signal(false);
  private readonly hovered = signal(false);
  /** One pass is over and `loop` is off: the first word stays. */
  private readonly done = signal(false);
  /** `afterNextRender` ran in a browser that can play: the cycle may run. */
  private readonly ready = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private observer: IntersectionObserver | null = null;
  private listeners: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** The delay is spent once, before the first hold. */
  private delayed = false;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/rotate-reveal');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      if (this.words().length < 2) return;
      this.observer = new IntersectionObserver(
        entries => this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false),
        { threshold: VIEW_THRESHOLD }
      );
      this.observer.observe(this.host.nativeElement);
      this.listen();
      this.ready.set(true);
    });

    // One place decides whether the hold counts: in view, page visible, not
    // hovered, motion allowed, a pass still to go. A swap in flight finishes
    // on its own and asks again when it has.
    effect(() => {
      const on =
        this.ready() &&
        this.intersecting() &&
        this.platform.pageVisible() &&
        !this.platform.prefersReducedMotion() &&
        !this.hovered() &&
        !this.done() &&
        this.outgoing() === null;
      untracked(() => (on ? this.arm() : this.clear()));
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      this.listeners?.abort();
      this.listeners = null;
      this.clear();
    });
  }

  /**
   * The last letter arriving landed: the slot holds the plain word again. The
   * letters arrive in index order and last the same, so the last one ends last.
   */
  protected onAnimationEnd(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.classList?.contains('wr-rotate-reveal__letter--in')) return;
    if (target.style.getPropertyValue('--wr-rotate-reveal-i') === String(this.inLetters().length - 1)) this.settle();
  }

  protected settle(): void {
    this.outgoing.set(null);
  }

  /**
   * The sentence is the host's parent: a pointer over any of it, or focus in
   * it, holds the word on show, so what is being read does not change under
   * the reader. Fonts that finish loading later re-measure the words.
   */
  private listen(): void {
    const host = this.host.nativeElement;
    const sentence = host.parentElement ?? host;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    sentence.addEventListener('pointerenter', () => this.hovered.set(true), options);
    sentence.addEventListener('pointerleave', () => this.hovered.set(false), options);
    sentence.addEventListener('focusin', () => this.hovered.set(true), options);
    sentence.addEventListener('focusout', () => this.hovered.set(false), options);
    const view = this.doc.defaultView;
    view?.addEventListener('resize', () => this.measure(), options);
    const fonts = this.doc.fonts;
    if (fonts) {
      fonts.addEventListener('loadingdone', () => this.measure(), options);
      void fonts.ready.then(() => {
        if (this.listeners) this.measure();
      });
    } else {
      this.measure();
    }
  }

  /**
   * The width of every word, in px, read off one hidden span in the slot that
   * takes each word in turn, so each width is the word's in the slot's own
   * font. Once per measurement, never per frame or per swap.
   */
  private measure(): void {
    const slot = this.host.nativeElement.querySelector<HTMLElement>('.wr-rotate-reveal__slot');
    if (!slot) return;
    const probe = this.doc.createElement('span');
    probe.className = 'wr-rotate-reveal__probe';
    probe.setAttribute('aria-hidden', 'true');
    slot.append(probe);
    const widths = this.words().map(word => {
      probe.textContent = word;
      return probe.getBoundingClientRect().width;
    });
    probe.remove();
    this.widths.set(widths);
  }

  /** Start the hold of the word on show, the first one after `delay`, unless it already counts. */
  private arm(): void {
    if (this.timer !== null) return;
    const wait = Math.max(0, this.hold()) + (this.delayed ? 0 : Math.max(0, this.delay()));
    this.delayed = true;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.swap();
    }, wait);
  }

  private clear(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** The next word takes the slot: the one on show starts leaving. The first word coming back ends the pass. */
  private swap(): void {
    const from = this.index();
    const to = (from + 1) % this.words().length;
    if (this.widths() === null) this.measure();
    this.outgoing.set(from);
    this.index.set(to);
    if (to === 0 && !this.loop()) this.done.set(true);
  }
}

export { ROTATE_REVEAL_HOLD };

import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

import { SPACES, type StaggerBy, VISIBLE, graphemes, optionalMs, staggerGap } from '../stagger';

/** What one animated piece of the text is. */
type BlurRevealBy = StaggerBy;

/** The side a piece settles in from. */
type BlurRevealFrom = 'below' | 'above';

/**
 * One-shot entrance for a text element: the first time the host scrolls into
 * view its text comes in piece by piece, each one from blurred, transparent and
 * a little below its place to sharp, opaque and in place, in reading order. The
 * host keeps its own tag and its authored children: they are moved out while
 * the pieces play and the same nodes are moved back when the last piece lands,
 * so selection, find-in-page and Angular bindings inside work as before. While
 * split, the pieces are `aria-hidden` and a visually-hidden copy of the text
 * stands beside them, so a screen reader hears the sentence once. Nothing is
 * split under `prefers-reduced-motion: reduce`, on the server or without
 * `IntersectionObserver`. Styles: `blur-reveal.scss`, loaded by `styles.scss`.
 */
@Directive({
  selector: '[ngwrBlurReveal]',
  host: {
    class: 'ngwr-blur-reveal',
    '[class.ngwr-blur-reveal--letters]': 'by() === "letters"',
    '[class.ngwr-blur-reveal--above]': 'from() === "above"',
    '(animationend)': 'onAnimationEnd($event)',
    '(animationcancel)': 'restore()',
  },
})
export class BlurReveal {
  /**
   * What enters one at a time: a word, or a grapheme. In letter mode the
   * letters of one word sit in a no-wrap wrapper, so a word never breaks across
   * lines mid-word. @default 'words'
   */
  readonly by = input<BlurRevealBy>('words');

  /** The side a piece settles in from. @default 'below' */
  readonly from = input<BlurRevealFrom>('below');

  /**
   * Gap between the start of one piece and the next, in ms. Unset, the mode
   * decides: 70 for words, 28 for letters. Either way the whole reveal spreads
   * over 1.2 s at most, so for a long text the gap shrinks until the last piece
   * starts by then.
   */
  readonly stagger = input<number | null, unknown>(null, { transform: optionalMs });

  /** Pause between the host entering the viewport and the first piece, in ms. @default 0 */
  readonly delay = input(0, { transform: numAttr(0) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private observer: IntersectionObserver | null = null;
  /** The host's authored children while they are out of the DOM, else `null`. */
  private original: ChildNode[] | null = null;
  private lastPiece: HTMLElement | null = null;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
      this.observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          this.observer?.disconnect();
          this.observer = null;
          if (!this.platform.prefersReducedMotion()) this.play();
        },
        { threshold: VISIBLE }
      );
      this.observer.observe(this.host.nativeElement);
    });

    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
      this.restore();
    });
  }

  /** Last piece landed: the authored children go back. Another piece or a child's own animation is not it. */
  protected onAnimationEnd(event: Event): void {
    if (event.target === this.lastPiece) this.restore();
  }

  /**
   * Put the authored children back, the same node objects, and drop the
   * wrappers. Idempotent: the end of the last piece, a cancelled animation and
   * destroy all call it.
   */
  protected restore(): void {
    if (!this.original) return;
    const host = this.host.nativeElement;
    host.replaceChildren(...this.original);
    host.classList.remove('ngwr-blur-reveal--run');
    this.original = null;
    this.lastPiece = null;
  }

  /**
   * Split the authored children into pieces and start the animation in one
   * task. Each piece carries its index; the stylesheet turns that into a delay,
   * and `--run` is added by hand rather than through a binding because change
   * detection may run after the next paint, and that paint would show the
   * pieces sharp before they hide.
   */
  private play(): void {
    const host = this.host.nativeElement;
    const original = Array.from(host.childNodes);
    const text = host.textContent ?? '';
    const letters = this.by() === 'letters';
    const pieces = document.createElement('span');
    pieces.className = 'ngwr-blur-reveal__pieces';
    pieces.setAttribute('aria-hidden', 'true');

    let count = 0;
    const piece = (content: Node): HTMLElement => {
      const el = document.createElement('span');
      el.className = 'ngwr-blur-reveal__piece';
      el.style.setProperty('--ngwr-blur-reveal-i', String(count++));
      el.append(content);
      this.lastPiece = el;
      return el;
    };

    for (const node of original) {
      if (node.nodeType !== Node.TEXT_NODE) {
        // An inline element (`<code>`, `<a>`) is one piece, moved whole; a comment keeps its place.
        pieces.append(node.nodeType === Node.ELEMENT_NODE ? piece(node) : node);
        continue;
      }
      // `split` on a capturing group alternates: a run of text, then the spaces after it.
      (node.textContent ?? '').split(SPACES).forEach((run, i) => {
        if (run === '') return;
        if (i % 2 === 1) {
          pieces.append(run);
        } else if (!letters) {
          pieces.append(piece(document.createTextNode(run)));
        } else {
          const word = document.createElement('span');
          word.className = 'ngwr-blur-reveal__word';
          for (const grapheme of graphemes(run)) word.append(piece(document.createTextNode(grapheme)));
          pieces.append(word);
        }
      });
    }

    this.original = original;
    if (count === 0) {
      this.restore();
      return;
    }

    const stagger = staggerGap(this.by(), count, this.stagger());
    pieces.style.setProperty('--ngwr-blur-reveal-delay', `${Math.max(0, this.delay())}ms`);
    pieces.style.setProperty('--ngwr-blur-reveal-stagger', `${stagger}ms`);

    const copy = document.createElement('span');
    copy.className = 'ngwr-blur-reveal__sr';
    copy.textContent = text;

    host.replaceChildren(pieces, copy);
    host.classList.add('ngwr-blur-reveal--run');
  }
}

export type { BlurRevealBy, BlurRevealFrom };

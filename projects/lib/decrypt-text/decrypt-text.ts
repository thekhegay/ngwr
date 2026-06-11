/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the DecryptedText effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/decrypted-text
 *
 * The reactbits version uses `motion/react` for the wrapper. This port
 * is dependency-free — vanilla signals + `setInterval` for the tick loop.
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

function computeOrder(len: number, dir: WrDecryptTextRevealDirection): readonly number[] {
  const order: number[] = [];
  if (len <= 0) return order;
  if (dir === 'start') {
    for (let i = 0; i < len; i++) order.push(i);
    return order;
  }
  if (dir === 'end') {
    for (let i = len - 1; i >= 0; i--) order.push(i);
    return order;
  }
  const middle = Math.floor(len / 2);
  let off = 0;
  while (order.length < len) {
    if (off % 2 === 0) {
      const idx = middle + off / 2;
      if (idx >= 0 && idx < len) order.push(idx);
    } else {
      const idx = middle - Math.ceil(off / 2);
      if (idx >= 0 && idx < len) order.push(idx);
    }
    off++;
  }
  return order.slice(0, len);
}

function fillAllIndices(len: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < len; i++) s.add(i);
  return s;
}

function removeRandomIndices(set: ReadonlySet<number>, count: number): Set<number> {
  const arr = Array.from(set);
  for (let i = 0; i < count && arr.length > 0; i++) {
    arr.splice(Math.floor(Math.random() * arr.length), 1);
  }
  return new Set(arr);
}

/**
 * Reveals a string by scrambling characters and progressively replacing
 * scramble glyphs with the originals. Supports sequential reveal in
 * three directions, or non-sequential "settle" after N iterations, and
 * four trigger modes (hover, click, view, in-view + hover).
 *
 * @example
 * ```html
 * <wr-decrypt-text text="Hello, ngwr!" animateOn="hover" />
 * <wr-decrypt-text
 *   text="Reveal from the center"
 *   [sequential]="true"
 *   revealDirection="center"
 *   animateOn="view"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/decrypted-text
 */
@Component({
  selector: 'wr-decrypt-text',
  templateUrl: './decrypt-text.html',
  styleUrl: './decrypt-text.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-decrypt-text',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(click)': 'onClick()',
  },
})
export class WrDecryptText {
  /** Text to reveal. Required. */
  readonly text = input.required<string>();

  /** Tick interval in ms. @default 50 */
  readonly speed = input(50, { transform: num(50) });

  /** Non-sequential mode only — total scramble ticks before snapping to plain. @default 10 */
  readonly maxIterations = input(10, { transform: num(10) });

  /** Reveal one char per tick instead of scrambling all of them. @default false */
  readonly sequential = input(false, { transform: coerceBooleanProperty });

  /** Order in which chars are revealed in sequential mode. @default 'start' */
  readonly revealDirection = input<WrDecryptTextRevealDirection>('start');

  /** Scramble using only the glyphs present in `text` (minus spaces). @default false */
  readonly useOriginalCharsOnly = input(false, { transform: coerceBooleanProperty });

  /** Pool of glyphs to scramble through (used when `useOriginalCharsOnly` is false). */
  readonly characters = input(DEFAULT_CHARS);

  /** When to start the animation. @default 'hover' */
  readonly animateOn = input<WrDecryptTextAnimateOn>('hover');

  /** Click behaviour. `'once'` decrypts then stops; `'toggle'` flips state on each click. @default 'once' */
  readonly clickMode = input<WrDecryptTextClickMode>('once');

  private readonly displayText = signal('');
  private readonly revealedIndices = signal<ReadonlySet<number>>(new Set());
  private readonly isAnimating = signal(false);
  private readonly isDecrypted = signal(true);
  private readonly direction = signal<'forward' | 'reverse'>('forward');

  /** Per-char render data. */
  protected readonly chars = computed(() => {
    const display = this.displayText();
    const revealed = this.revealedIndices();
    const decrypted = this.isDecrypted();
    const animating = this.isAnimating();
    return [...display].map((ch, i) => ({
      ch,
      revealed: revealed.has(i) || (!animating && decrypted),
    }));
  });

  /** Sequential reverse order — captured when reverse starts. */
  private reverseOrder: readonly number[] = [];
  private reversePointer = 0;
  private iterationCount = 0;
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private hasAnimatedOnce = false;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  constructor() {
    if (!this.isBrowser) {
      // SSR: render plain text.
      effect(() => this.displayText.set(this.text()));
      return;
    }

    // Reset state whenever `text` or `animateOn` changes.
    effect(() => {
      const txt = this.text();
      const mode = this.animateOn();
      this.stopInterval();
      if (mode === 'click') {
        this.encryptInstantly(txt);
      } else {
        this.displayText.set(txt);
        this.isDecrypted.set(true);
      }
      this.revealedIndices.set(new Set());
      this.direction.set('forward');
      this.hasAnimatedOnce = false;
    });

    afterNextRender(() => {
      const mode = this.animateOn();
      if (mode === 'view' || mode === 'inViewHover') this.setupIntersectionObserver();
    });

    this.destroyRef.onDestroy(() => this.stopInterval());
  }

  // Trigger handlers

  protected onMouseEnter(): void {
    const mode = this.animateOn();
    if (mode !== 'hover' && mode !== 'inViewHover') return;
    this.triggerHoverDecrypt();
  }

  protected onMouseLeave(): void {
    const mode = this.animateOn();
    if (mode !== 'hover' && mode !== 'inViewHover') return;
    this.resetToPlain();
  }

  protected onClick(): void {
    if (this.animateOn() !== 'click') return;
    if (this.clickMode() === 'once') {
      if (this.isDecrypted()) return;
      this.direction.set('forward');
      this.triggerDecrypt();
      return;
    }
    if (this.isDecrypted()) this.triggerReverse();
    else {
      this.direction.set('forward');
      this.triggerDecrypt();
    }
  }

  // Internals

  private setupIntersectionObserver(): void {
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting && !this.hasAnimatedOnce) {
            obs.disconnect();
            this.hasAnimatedOnce = true;
            this.triggerDecrypt();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px' }
    );
    io.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  private triggerHoverDecrypt(): void {
    if (this.isAnimating()) return;
    this.revealedIndices.set(new Set());
    this.isDecrypted.set(false);
    this.displayText.set(this.text());
    this.direction.set('forward');
    this.startInterval();
  }

  private resetToPlain(): void {
    this.stopInterval();
    this.revealedIndices.set(new Set());
    this.displayText.set(this.text());
    this.isDecrypted.set(true);
    this.direction.set('forward');
  }

  private triggerDecrypt(): void {
    if (this.sequential()) {
      this.revealedIndices.set(new Set());
    } else {
      this.revealedIndices.set(new Set());
    }
    this.direction.set('forward');
    this.startInterval();
  }

  private triggerReverse(): void {
    const txt = this.text();
    if (this.sequential()) {
      this.reverseOrder = computeOrder(txt.length, this.revealDirection()).slice().reverse();
      this.reversePointer = 0;
    }
    const all = fillAllIndices(txt.length);
    this.revealedIndices.set(all);
    this.displayText.set(this.shuffle(txt, all));
    this.direction.set('reverse');
    this.startInterval();
  }

  private encryptInstantly(txt: string): void {
    this.revealedIndices.set(new Set());
    this.displayText.set(this.shuffle(txt, new Set()));
    this.isDecrypted.set(false);
  }

  private startInterval(): void {
    // Reduced motion: every trigger funnels through here — skip the
    // scramble loop and jump straight to the plain, decrypted text.
    if (this.platform.prefersReducedMotion()) {
      this.resetToPlain();
      return;
    }

    this.stopInterval();
    this.isAnimating.set(true);
    this.iterationCount = 0;
    this.intervalId = setInterval(() => this.tick(), this.speed());
  }

  private stopInterval(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isAnimating.set(false);
  }

  private tick(): void {
    const txt = this.text();
    const seq = this.sequential();
    const dir = this.direction();
    const max = this.maxIterations();
    const revealed = this.revealedIndices();

    if (seq && dir === 'forward') {
      if (revealed.size < txt.length) {
        const nextIdx = this.nextSequentialIndex(revealed, txt.length);
        const next = new Set(revealed);
        next.add(nextIdx);
        this.revealedIndices.set(next);
        this.displayText.set(this.shuffle(txt, next));
      } else {
        this.stopInterval();
        this.isDecrypted.set(true);
        this.displayText.set(txt);
      }
      return;
    }

    if (seq && dir === 'reverse') {
      if (this.reversePointer < this.reverseOrder.length) {
        const idx = this.reverseOrder[this.reversePointer++];
        const next = new Set(revealed);
        next.delete(idx);
        this.revealedIndices.set(next);
        this.displayText.set(this.shuffle(txt, next));
        if (next.size === 0) {
          this.stopInterval();
          this.isDecrypted.set(false);
        }
      } else {
        this.stopInterval();
        this.isDecrypted.set(false);
      }
      return;
    }

    if (!seq && dir === 'forward') {
      this.displayText.set(this.shuffle(txt, revealed));
      this.iterationCount++;
      if (this.iterationCount >= max) {
        this.stopInterval();
        this.displayText.set(txt);
        this.isDecrypted.set(true);
      }
      return;
    }

    if (!seq && dir === 'reverse') {
      let current = revealed;
      if (current.size === 0) current = fillAllIndices(txt.length);
      const removeCount = Math.max(1, Math.ceil(txt.length / Math.max(1, max)));
      const next = removeRandomIndices(current, removeCount);
      this.revealedIndices.set(next);
      this.displayText.set(this.shuffle(txt, next));
      this.iterationCount++;
      if (next.size === 0 || this.iterationCount >= max) {
        this.stopInterval();
        this.isDecrypted.set(false);
        this.displayText.set(this.shuffle(txt, new Set()));
        this.revealedIndices.set(new Set());
      }
    }
  }

  private nextSequentialIndex(revealed: ReadonlySet<number>, len: number): number {
    switch (this.revealDirection()) {
      case 'end':
        return len - 1 - revealed.size;
      case 'center': {
        const middle = Math.floor(len / 2);
        const offset = Math.floor(revealed.size / 2);
        const candidate = revealed.size % 2 === 0 ? middle + offset : middle - offset - 1;
        if (candidate >= 0 && candidate < len && !revealed.has(candidate)) return candidate;
        for (let i = 0; i < len; i++) if (!revealed.has(i)) return i;
        return 0;
      }
      case 'start':
      default:
        return revealed.size;
    }
  }

  private shuffle(txt: string, revealed: ReadonlySet<number>): string {
    const pool = this.useOriginalCharsOnly()
      ? Array.from(new Set(txt.split(''))).filter(ch => ch !== ' ')
      : this.characters().split('');
    if (pool.length === 0) return txt;
    return [...txt]
      .map((ch, i) => {
        if (ch === ' ') return ' ';
        if (revealed.has(i)) return txt[i];
        return pool[Math.floor(Math.random() * pool.length)];
      })
      .join('');
  }
}

export type WrDecryptTextAnimateOn = 'hover' | 'click' | 'view' | 'inViewHover';
export type WrDecryptTextRevealDirection = 'start' | 'end' | 'center';
export type WrDecryptTextClickMode = 'once' | 'toggle';

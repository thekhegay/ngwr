/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the TextType effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/text-animations/text-type
 *
 * The reactbits version uses GSAP for the cursor blink. This port is
 * dependency-free — vanilla `setTimeout` loop for typing/deleting,
 * pure-CSS keyframes for the cursor blink.
 */

import { isPlatformBrowser } from '@angular/common';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export interface WrTypewriterVariableSpeed {
  readonly min: number;
  readonly max: number;
}

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Classic typewriter — types out a string char-by-char, optionally
 * deletes it, then types the next string. Cycles through `[texts]` (or
 * a single string) with a blinking cursor.
 *
 * @example
 * ```html
 * <wr-typewriter [texts]="['design.', 'ship.', 'iterate.']" />
 * <wr-typewriter
 *   text="Hello, ngwr."
 *   [loop]="false"
 *   [typingSpeed]="35"
 *   cursorCharacter="▎"
 * />
 * ```
 *
 * @see https://www.reactbits.dev/text-animations/text-type
 */
@Component({
  selector: 'wr-typewriter',
  templateUrl: './typewriter.html',
  styleUrl: './typewriter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-typewriter',
    '[style.color]': 'activeColor()',
    '[style.--wr-typewriter-cursor-blink]': "cursorBlinkDuration() + 's'",
  },
})
export class WrTypewriter {
  /** Single string. Use either `text` or `texts`. */
  readonly text = input<string | undefined>(undefined);

  /** Strings to cycle. Use either `text` or `texts`. */
  readonly texts = input<readonly string[] | undefined>(undefined);

  /** Per-char typing speed in ms. @default 50 */
  readonly typingSpeed = input(50, { transform: num(50) });

  /** Initial delay before typing starts, in ms. @default 0 */
  readonly initialDelay = input(0, { transform: num(0) });

  /** Pause between sentences (after typing complete, before deleting), in ms. @default 2000 */
  readonly pauseDuration = input(2000, { transform: num(2000) });

  /** Per-char deletion speed in ms. @default 30 */
  readonly deletingSpeed = input(30, { transform: num(30) });

  /** Loop back to the first string after the last. @default true */
  readonly loop = input(true, { transform: coerceBooleanProperty });

  /** Show the cursor. @default true */
  readonly showCursor = input(true, { transform: coerceBooleanProperty });

  /** Hide the cursor while typing / deleting. @default false */
  readonly hideCursorWhileTyping = input(false, { transform: coerceBooleanProperty });

  /** Cursor glyph. @default '|' */
  readonly cursorCharacter = input('|');

  /** Cursor blink half-cycle in seconds. @default 0.5 */
  readonly cursorBlinkDuration = input(0.5, { transform: num(0.5) });

  /** Cycle through these colours per string. */
  readonly textColors = input<readonly string[]>([]);

  /** Randomise typing speed per char between `min` and `max`. */
  readonly variableSpeed = input<WrTypewriterVariableSpeed | undefined>(undefined);

  /** Reverse the string (type it backwards). @default false */
  readonly reverseMode = input(false, { transform: coerceBooleanProperty });

  /** Start typing only after the host enters the viewport. @default false */
  readonly startOnVisible = input(false, { transform: coerceBooleanProperty });

  /** Emits with `(text, index)` when a string finishes typing. */
  readonly sentenceComplete = output<{ text: string; index: number }>();

  protected readonly displayed = signal('');
  protected readonly cursorVisible = computed(() => {
    if (!this.showCursor()) return false;
    if (!this.hideCursorWhileTyping()) return true;
    // While typing or deleting, cursor stays hidden.
    return this.phase() === 'idle';
  });
  protected readonly activeColor = computed(() => {
    const colours = this.textColors();
    if (colours.length === 0) return 'inherit';
    return colours[this.currentTextIndex() % colours.length];
  });

  /** Resolved list of strings (either `texts` or wrap `text` in an array). */
  private readonly textArray = computed<readonly string[]>(() => {
    const list = this.texts();
    if (list && list.length > 0) return list;
    const single = this.text();
    return single ? [single] : [];
  });

  private readonly currentTextIndex = signal(0);
  private readonly phase = signal<'idle' | 'typing' | 'deleting'>('idle');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private timer: ReturnType<typeof setTimeout> | undefined;
  private isVisible = false;

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => this.boot());
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  private boot(): void {
    if (this.startOnVisible()) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              obs.disconnect();
              this.isVisible = true;
              this.scheduleNext(this.initialDelay());
              break;
            }
          }
        },
        { threshold: 0.1 }
      );
      io.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => io.disconnect());
    } else {
      this.isVisible = true;
      this.scheduleNext(this.initialDelay());
    }
  }

  private scheduleNext(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), delay);
  }

  private tick(): void {
    if (!this.isVisible) return;
    const arr = this.textArray();
    if (arr.length === 0) return;

    const idx = this.currentTextIndex();
    const raw = arr[idx];
    const target = this.reverseMode() ? raw.split('').reverse().join('') : raw;
    const displayed = this.displayed();

    if (this.phase() === 'deleting') {
      if (displayed.length === 0) {
        // Finished deleting → advance to next text.
        this.phase.set('idle');
        const nextIndex = (idx + 1) % arr.length;
        // Non-loop: stop if we just finished the last sentence.
        if (!this.loop() && idx === arr.length - 1) return;
        this.currentTextIndex.set(nextIndex);
        this.scheduleNext(this.pauseDuration());
        return;
      }
      // Continue deleting.
      this.displayed.set(displayed.slice(0, -1));
      this.scheduleNext(this.deletingSpeed());
      return;
    }

    // Typing or idle.
    if (displayed.length < target.length) {
      this.phase.set('typing');
      this.displayed.set(target.slice(0, displayed.length + 1));
      const delay = this.variableSpeed()
        ? Math.random() * (this.variableSpeed()!.max - this.variableSpeed()!.min) + this.variableSpeed()!.min
        : this.typingSpeed();
      this.scheduleNext(delay);
      return;
    }

    // Typing complete for this sentence.
    this.sentenceComplete.emit({ text: raw, index: idx });

    // Single text + no loop → stop here.
    if (arr.length === 1 && !this.loop()) {
      this.phase.set('idle');
      return;
    }
    // Non-loop on last sentence → stop here.
    if (!this.loop() && idx === arr.length - 1) {
      this.phase.set('idle');
      return;
    }

    // Start deleting after the pause.
    this.phase.set('deleting');
    this.scheduleNext(this.pauseDuration());
  }
}

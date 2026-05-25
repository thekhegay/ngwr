/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  ViewEncapsulation,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

/** Animation style. */
type WrAnimatedTextMode = 'typewriter' | 'scramble' | 'split';

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

/**
 * Animated text — typewriter, scramble, or split-letter reveal. Drives a
 * span / heading with a single text input.
 *
 * @example
 * ```html
 * <h1 wr-animated-text [text]="'Welcome aboard'" mode="typewriter" />
 * <p wr-animated-text [text]="'Decoded'" mode="scramble" />
 * <h2 wr-animated-text [text]="'Hello'" mode="split" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/animated-text
 */
@Component({
  selector: 'wr-animated-text, [wr-animated-text]',
  template: `<ng-container>{{ display() }}</ng-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrAnimatedTextComponent {
  /** Target text. */
  readonly text = input<string>('');

  /** Animation style. @default 'typewriter' */
  readonly mode = input<WrAnimatedTextMode>('typewriter');

  /** Per-character delay (ms). @default 60 */
  readonly speed = input(60, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 60)) });

  /** Initial delay before animation starts (ms). @default 0 */
  readonly startDelay = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Loop the animation forever. @default false */
  readonly loop = input(false, { transform: coerceBooleanProperty });

  protected readonly display = signal<string>('');

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const text = this.text();
      const mode = this.mode();
      this.cancel();
      if (!this.isBrowser) {
        // SSR: render the final text so nothing flashes on hydration.
        this.display.set(text);
        return;
      }
      this.display.set('');
      this.schedule(() => this.run(text, mode), this.startDelay());
    });

    this.destroyRef.onDestroy(() => this.cancel());
  }

  protected readonly classes = (): string => `wr-animated-text wr-animated-text--${this.mode()}`;

  // ──────── Drivers ────────

  private run(text: string, mode: WrAnimatedTextMode): void {
    switch (mode) {
      case 'typewriter':
        this.runTypewriter(text);
        break;
      case 'scramble':
        this.runScramble(text);
        break;
      case 'split':
        this.runSplit(text);
        break;
    }
  }

  private runTypewriter(text: string): void {
    let i = 0;
    const tick = (): void => {
      i++;
      this.display.set(text.slice(0, i));
      if (i < text.length) this.schedule(tick, this.speed());
      else if (this.loop()) this.schedule(() => this.run(text, 'typewriter'), this.speed() * 8);
    };
    tick();
  }

  private runScramble(text: string): void {
    const total = text.length;
    let frame = 0;
    const iterations = 12;
    const tick = (): void => {
      frame++;
      const settled = Math.floor((frame / iterations) * total);
      const out: string[] = [];
      for (let i = 0; i < total; i++) {
        if (i < settled) out.push(text[i]);
        else if (text[i] === ' ') out.push(' ');
        else out.push(SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]);
      }
      this.display.set(out.join(''));
      if (frame < iterations) this.schedule(tick, this.speed());
      else if (this.loop()) this.schedule(() => this.run(text, 'scramble'), this.speed() * 12);
    };
    tick();
  }

  private runSplit(text: string): void {
    // Split mode reveals the whole string at once — the CSS animation on
    // each letter span handles the staggered fade in.
    this.display.set(text);
  }

  // ──────── Helpers ────────

  private schedule(fn: () => void, delay: number): void {
    this.timer = setTimeout(fn, delay);
  }

  private cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

export type { WrAnimatedTextMode };

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, afterEveryRender, effect, inject, input } from '@angular/core';

/**
 * Auto-grow a `<textarea>` to fit its content. Optional `minRows` /
 * `maxRows` bounds the height in rendered rows.
 *
 * @example
 * ```html
 * <textarea wrAutosize minRows="2" maxRows="8" [(ngModel)]="text"></textarea>
 * ```
 */
@Directive({
  selector: 'textarea[wrAutosize]',
  host: { style: 'overflow: hidden; resize: none;', '(input)': 'onInput()' },
})
export class WrAutosize {
  readonly minRows = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });
  readonly maxRows = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private lastValue: string | null = null;

  constructor() {
    // Typing fires `input`, but `[(ngModel)]` / `setValue` write the value
    // without one — a cheap per-render value check catches both, including
    // the initial write that lands after the first render.
    afterEveryRender(() => {
      const value = this.el.nativeElement.value;
      if (value !== this.lastValue) {
        this.lastValue = value;
        this.resize();
      }
    });
    // Resize when `minRows` / `maxRows` change. Read the inputs before the
    // platform check so the effect still tracks them; the measurement itself
    // needs a real layout, which the server has none of (`afterEveryRender`
    // above is browser-only already, so it needs no guard).
    effect(() => {
      this.minRows();
      this.maxRows();
      if (!this.isBrowser) return;
      this.resize();
    });
  }

  /** @internal */
  protected onInput(): void {
    this.lastValue = this.el.nativeElement.value;
    this.resize();
  }

  /** Recompute height from `scrollHeight`, clamped to min/max rows. */
  private resize(): void {
    const node = this.el.nativeElement;
    const styles = getComputedStyle(node);
    // `line-height: normal` computes to the literal string — derive the
    // row height from the font size instead of guessing a fixed 20px.
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.25 || 20;
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const border = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0);

    // Reset to a single row first so `scrollHeight` shrinks as well as grows.
    node.style.height = 'auto';
    const min = this.minRows() * lineHeight + paddingY + border;
    const max = this.maxRows() > 0 ? this.maxRows() * lineHeight + paddingY + border : Infinity;
    const next = Math.min(Math.max(node.scrollHeight + border, min), max);
    node.style.height = `${next}px`;
    node.style.overflowY = node.scrollHeight + border > max ? 'auto' : 'hidden';
  }
}

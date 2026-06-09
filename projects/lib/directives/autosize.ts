/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Directive, ElementRef, afterNextRender, effect, inject, input } from '@angular/core';

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

  constructor() {
    afterNextRender(() => this.resize());
    // Resize when `minRows` / `maxRows` change.
    effect(() => {
      this.minRows();
      this.maxRows();
      this.resize();
    });
  }

  /** @internal */
  protected onInput(): void {
    this.resize();
  }

  /** Recompute height from `scrollHeight`, clamped to min/max rows. */
  private resize(): void {
    const node = this.el.nativeElement;
    const styles = getComputedStyle(node);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
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

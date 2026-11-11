/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DestroyRef, Directive, ElementRef, afterNextRender, effect, inject, input } from '@angular/core';

/**
 * Shrink a block whose text wraps to the width of its longest line.
 *
 * A wrapped block keeps the width it was offered, so a tinted pill with three
 * lines of text carries an empty band of background beside them, and CSS has
 * no way to take it back. The lines are measured and the host's inline `width`
 * is set to the widest one, padding and border included as its `box-sizing`
 * needs. Every line already fits that width, so the line breaks stay where
 * they were. It is measured again when the text changes and when the parent is
 * resized; a block on one line is left alone.
 *
 * The host needs a box that takes a width (block, inline-block, a flex or grid
 * item) and holds text and inline content.
 *
 * @example
 * ```html
 * <wr-tag wrFitText>A label long enough to wrap onto a second line</wr-tag>
 * <p [wrFitText]="fit()">…</p>
 * ```
 */
@Directive({ selector: '[wrFitText]' })
export class WrFitText {
  /** `false` switches the fitting off and removes the width it wrote. Bare `wrFitText` is on. */
  readonly wrFitText = input(true, { transform: coerceBooleanProperty });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private frame = 0;
  private started = false;
  /** The width this directive wrote, so switching off removes that and nothing else. */
  private written = '';

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const host = this.el.nativeElement;
      // The parent's height follows the host's, and in a shrink-to-fit parent so
      // does its width: only a new inline size can move a line break.
      let offered = -1;
      const resize =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(([entry]) => {
              if (entry.contentRect.width === offered) return;
              offered = entry.contentRect.width;
              this.schedule();
            });
      const text = new MutationObserver(() => this.schedule());

      if (host.parentElement) resize?.observe(host.parentElement);
      // No `attributes`: the width written below must not call the measure back.
      text.observe(host, { characterData: true, childList: true, subtree: true });

      this.started = true;
      this.fit();

      destroyRef.onDestroy(() => {
        cancelAnimationFrame(this.frame);
        resize?.disconnect();
        text.disconnect();
      });
    });

    effect(() => {
      this.wrFitText();
      if (this.started) this.schedule();
    });
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.fit());
  }

  private fit(): void {
    const host = this.el.nativeElement;

    if (!this.wrFitText()) {
      if (this.written && host.style.width === this.written) host.style.width = '';
      this.written = '';
      return;
    }

    // Cleared first, so a parent that grew can take words back onto a line.
    host.style.width = '';
    this.written = '';

    const range = host.ownerDocument.createRange();
    range.selectNodeContents(host);
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0);
    if (!rects.length) return;

    // Inline children give several rects to one line, so a count says nothing.
    const firstLineEnd = rects[0].bottom;
    if (!rects.some(rect => rect.top >= firstLineEnd)) return;

    const start = Math.min(...rects.map(rect => rect.left));
    const end = Math.max(...rects.map(rect => rect.right));
    const style = getComputedStyle(host);
    const px = (value: string): number => parseFloat(value) || 0;
    const box =
      style.boxSizing === 'border-box'
        ? px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth)
        : 0;

    // One pixel over: at the exact width, subpixel rounding wraps the longest line again.
    this.written = `${Math.ceil(end - start + box) + 1}px`;
    host.style.width = this.written;
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, effect, inject, input, model } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { wrClamp, wrRound, wrCheckStyles } from 'ngwr/utils';

import { wrBeginSeparatorDrag, wrEndSeparatorDrag, wrSeparatorKeyMove } from './internal';

/**
 * Resizable two-pane splitter. Project two pieces of content via
 * `[wrSplitterStart]` and `[wrSplitterEnd]`; the user drags the divider
 * to reallocate space between them.
 *
 * @example
 * ```html
 * <wr-splitter [(position)]="pos">
 *   <div wrSplitterStart>Files</div>
 *   <div wrSplitterEnd>Editor</div>
 * </wr-splitter>
 *
 * <wr-splitter orientation="vertical" [minPosition]="20" [maxPosition]="80">
 *   <div wrSplitterStart>Preview</div>
 *   <div wrSplitterEnd>Logs</div>
 * </wr-splitter>
 * ```
 *
 * @see https://ngwr.dev/reference/components/splitter
 */
@Component({
  selector: 'wr-splitter',
  templateUrl: './splitter.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-splitter', '[class]': 'classes()' },
})
export class WrSplitter {
  /** Position of the divider as a percentage (0–100). Two-way bindable. @default 50 */
  readonly position = model(50);

  /**
   * Divider direction:
   * - `'horizontal'` — vertical divider, drags L/R (panes side by side).
   * - `'vertical'`   — horizontal divider, drags U/D (panes stacked).
   * @default 'horizontal'
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Minimum allowed position. @default 0 */
  readonly minPosition = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });

  /** Maximum allowed position. @default 100 */
  readonly maxPosition = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  /** Disable dragging. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Accessible name of the divider. A focusable `role="separator"` is an
   * interactive widget, so it needs one — without it a screen reader reaching the
   * divider announces nothing but "separator" and its number. Falls back to
   * `splitter.divider`.
   */
  readonly dividerLabel = input<string | null>(null);

  protected readonly resolvedDividerLabel = useI18nText(this.dividerLabel, 'splitter.divider', 'Resize panes');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Optional on purpose: `Directionality` is root-provided, so a consumer never has to
  // supply it — and a bare `TestBed` does not either.
  private readonly dir = inject(Directionality, { optional: true });
  private dragging = false;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('splitter');
    // `position` is a `model`, so `[(position)]` and a restored layout write into it
    // directly; only the drag and the arrows clamped. Left alone, an out-of-range
    // write reached the DOM as `aria-valuenow="150"` against a `valuemax` of 100 and
    // sized a pane at `150%`.
    effect(() => {
      const clamped = wrClamp(this.position(), this.minPosition(), this.maxPosition());
      if (clamped !== this.position()) this.position.set(clamped);
    });
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-splitter', `wr-splitter--${this.orientation()}`];
    if (this.disabled()) parts.push('wr-splitter--disabled');
    return parts.join(' ');
  });

  protected readonly startStyle = computed(() => `${this.position()}%`);
  protected readonly endStyle = computed(() => `${100 - this.position()}%`);

  // Drag

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled()) return;
    this.dragging = wrBeginSeparatorDrag(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const raw =
      this.orientation() === 'horizontal'
        ? this.inlineFraction(event.clientX, rect) * 100
        : // The vertical split is laid out on the BLOCK axis, which `dir` does not
          // touch — measured from the top in both directions.
          ((event.clientY - rect.top) / rect.height) * 100;
    // To a tenth of a percent — about a pixel on a full-width split. The raw
    // quotient reached `aria-valuenow` and `[(position)]` as `29.99999822054938`,
    // read out digit by digit and handed to the host to persist.
    this.position.set(wrClamp(wrRound(raw, 1), this.minPosition(), this.maxPosition()));
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    wrEndSeparatorDrag(event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const move = wrSeparatorKeyMove(event, this.orientation() === 'horizontal' ? 'inline' : 'block', this.isRtl());
    if (move === null) return;
    event.preventDefault();
    let next: number;
    if (move === 'min') next = this.minPosition();
    else if (move === 'max') next = this.maxPosition();
    // An arrow step lands on a whole number, so the keys after a drag do not
    // carry the drag's fraction along (`30.4` stepped to `31.4`, `32.4`, …).
    // Home and End above are the bounds themselves, whatever they are.
    else next = wrRound(this.position()) + move * (event.shiftKey ? 10 : 1);
    this.position.set(wrClamp(next, this.minPosition(), this.maxPosition()));
  }

  /**
   * Fraction of the host's width measured from the INLINE-START edge — the left edge in
   * LTR, the right edge in RTL, which is where `flex-direction: row` puts the start pane
   * whose size `position` is. Counted from `rect.left` in both, a drag under `dir="rtl"`
   * read 0 where the start pane was widest and inverted the whole gesture.
   */
  private inlineFraction(clientX: number, rect: DOMRect): number {
    return this.isRtl() ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
  }

  /**
   * Read per event rather than cached: nothing this component renders is derived from the
   * direction — `flex-direction: row` mirrors the panes on its own — so there is no stale
   * value for `Directionality.change` to invalidate.
   */
  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }
}

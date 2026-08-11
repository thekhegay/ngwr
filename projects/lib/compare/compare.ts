/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { useI18nText } from 'ngwr/i18n';
import { clamp } from 'ngwr/utils';

/**
 * Before/after comparison slider. Works with any content — project two
 * pieces of markup with `wrCompareBefore` and `wrCompareAfter` attributes;
 * the component stacks them in the same cell and clips the "after" side
 * with a draggable divider.
 *
 * @example
 * ```html
 * <wr-compare [(position)]="pos">
 *   <img wrCompareBefore src="before.jpg" alt="" />
 *   <img wrCompareAfter src="after.jpg" alt="" />
 * </wr-compare>
 *
 * <wr-compare orientation="vertical">
 *   <pre wrCompareBefore>{{ oldCode }}</pre>
 *   <pre wrCompareAfter>{{ newCode }}</pre>
 * </wr-compare>
 * ```
 *
 * Under `dir="rtl"` the horizontal wipe MIRRORS: "before" occupies the inline-start
 * side, which is the right. Before/after is an ordinal pair — the two ends of a
 * progression — and ordinal progressions follow reading order, the same reason a
 * progress bar fills from the right in Arabic. The LTR habit of putting "before" on
 * the left IS reading order, so mirroring preserves that intent rather than breaking
 * it. Nothing is flipped pixel-wise: both layers are the images the consumer passed,
 * unscaled and unmirrored — only the side each is revealed on changes.
 *
 * Pinning the physical arrangement inside an RTL page takes the CDK's `Dir` directive
 * (`[dir]`, from `@angular/cdk/bidi`) on a wrapper, because that is what provides a
 * scoped `Directionality`. A bare `dir="ltr"` attribute does NOT do it: the ambient
 * `Directionality` reads `<html>` / `<body>` once at startup and never looks at the
 * element, and this component's horizontal wipe is painted entirely from TypeScript,
 * so the attribute would change nothing at all while looking like an opt-out.
 *
 * @see https://ngwr.dev/reference/components/compare
 */
@Component({
  selector: 'wr-compare',
  templateUrl: './compare.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrCompare {
  /** Divider position as a percentage (0–100). Two-way bindable. @default 50 */
  readonly position = model(50);

  /** Accessible name of the divider. Falls back to `compare.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'compare.label', 'Comparison divider');

  /**
   * Divider direction:
   * - `'horizontal'` — divider line is vertical, drags left/right.
   * - `'vertical'`   — divider line is horizontal, drags up/down.
   * @default 'horizontal'
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Show the round drag handle on the divider. @default true */
  readonly showHandle = input(true, { transform: coerceBooleanProperty });

  /** Disable interaction (divider stays put). @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Initial position transform — accepts any number / numeric string. */
  readonly minPosition = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });
  readonly maxPosition = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Optional on purpose: `Directionality` is root-provided, so a consumer never has to
  // supply it — and a bare `TestBed` does not either.
  private readonly dir = inject(Directionality, { optional: true });

  /**
   * Reading direction as a signal, because unlike the splitter this component PAINTS
   * from it: the clip and the divider offset are both direction-derived, and
   * `Directionality.value` is an ordinary read. A `dir` flip at runtime would otherwise
   * leave the wipe on the side the page no longer uses until some unrelated position
   * change happened to recompute it.
   */
  private readonly rtl = signal(this.dir?.value === 'rtl');

  private dragging = false;

  constructor() {
    this.dir?.change.pipe(takeUntilDestroyed()).subscribe(value => this.rtl.set(value === 'rtl'));

    // `position` is a `model`, so `[(position)]` and a restored layout write into it
    // directly while only the handlers clamped — an out-of-range write reached the DOM
    // as `aria-valuenow="150"` against a `valuemax` of 100.
    effect(() => {
      const clamped = clamp(this.position(), this.minPosition(), this.maxPosition());
      if (clamped !== this.position()) this.position.set(clamped);
    });
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-compare', `wr-compare--${this.orientation()}`];
    if (this.disabled()) parts.push('wr-compare--disabled');
    return parts.join(' ');
  });

  /**
   * Clip path applied to the "after" layer so the divider reveals it.
   *
   * `inset()` takes PHYSICAL edges and has no logical form, so the mirroring is done
   * here rather than in CSS: `position` counts from the inline-start edge, and under
   * RTL that edge is the right one, so the after layer is clipped from the right by
   * the same percentage.
   */
  protected readonly clipPath = computed(() => {
    const p = clamp(this.position(), 0, 100);
    if (this.orientation() === 'horizontal') {
      // Show from `p%` to the inline-end edge.
      return this.rtl() ? `inset(0 ${p}% 0 0)` : `inset(0 0 0 ${p}%)`;
    }
    // Block axis: `dir` does not touch it.
    return `inset(${p}% 0 0 0)`;
  });

  /**
   * Physical `left` percentage of the divider. Deliberately physical: it pairs with the
   * `translateX(-50%)` that centres the 2px line on its own position, and the two have
   * to agree on which edge they count from. `position` is logical, so RTL flips it here.
   */
  protected readonly dividerLeft = computed(() => (this.rtl() ? 100 - this.position() : this.position()));

  // Pointer handlers

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled()) return;
    // Any pointerdown used to start a drag, so the right button moved the divider; the
    // same guard keeps a second finger out of a drag already in progress.
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.dragging = true;
    const surface = event.currentTarget as HTMLElement;
    surface.setPointerCapture(event.pointerId);
    // `preventDefault` above also suppresses the click's default focus, so the arrows
    // did nothing after a mouse drag until the divider was found again with Tab.
    surface.focus();
    this.updateFromPointer(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.updateFromPointer(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const step = event.shiftKey ? 10 : 1;
    let next: number | null = null;
    if (this.orientation() === 'horizontal') {
      // Arrows follow the VISUAL axis (WAI-ARIA APG). Under `dir="rtl"` the "before"
      // side grows from the right, so the visual right is the low end of this slider's
      // range and ArrowRight has to decrease the value.
      const inline = this.rtl() ? -step : step;
      if (event.key === 'ArrowLeft') next = this.position() - inline;
      else if (event.key === 'ArrowRight') next = this.position() + inline;
    } else {
      // Block axis: unaffected by `dir`.
      if (event.key === 'ArrowUp') next = this.position() - step;
      else if (event.key === 'ArrowDown') next = this.position() + step;
    }
    // Home/End are semantic — first/last, not left/right — so they never mirror.
    if (event.key === 'Home') next = this.minPosition();
    else if (event.key === 'End') next = this.maxPosition();
    if (next === null) return;
    event.preventDefault();
    this.position.set(clamp(next, this.minPosition(), this.maxPosition()));
  }

  private updateFromPointer(event: PointerEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const horizontal = this.orientation() === 'horizontal';
    const extent = horizontal ? rect.width : rect.height;
    // A host that has not been laid out — hidden, detached, or a pane the browser has
    // throttled — measures 0, and dividing by it puts `Infinity` or `NaN` straight into
    // `aria-valuenow`. There is no meaningful position to compute, so keep the current one.
    if (extent <= 0) return;
    const raw = horizontal
      ? this.inlineFraction(event.clientX, rect) * 100
      : ((event.clientY - rect.top) / extent) * 100;
    this.position.set(clamp(raw, this.minPosition(), this.maxPosition()));
  }

  /**
   * Fraction of the host measured from the INLINE-START edge — the left edge in LTR, the
   * right edge in RTL, which is the side "before" is revealed from. Taken from
   * `rect.left` in both, a drag under `dir="rtl"` read 0 at the visual maximum and moved
   * the divider opposite the pointer.
   */
  private inlineFraction(clientX: number, rect: DOMRect): number {
    return this.rtl() ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
  }
}

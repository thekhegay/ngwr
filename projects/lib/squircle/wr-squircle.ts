/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, effect, inject, input, model } from '@angular/core';

import { squirclePath, type WrSquircleCorners } from './compute-squircle-path';

/**
 * Which corners to squircle. `'all'` = standard four-corner squircle;
 * the side-named values squircle the two corners on that side and leave
 * the other two at 90°. Useful for tab-/segment-style controls where
 * only outer corners need smoothing.
 */
function maskToRadii(mask: WrSquircleCornerMask, r: number): WrSquircleCorners {
  switch (mask) {
    case 'left':
      return { topLeft: r, topRight: 0, bottomRight: 0, bottomLeft: r };
    case 'right':
      return { topLeft: 0, topRight: r, bottomRight: r, bottomLeft: 0 };
    case 'top':
      return { topLeft: r, topRight: r, bottomRight: 0, bottomLeft: 0 };
    case 'bottom':
      return { topLeft: 0, topRight: 0, bottomRight: r, bottomLeft: r };
    case 'none':
      return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    case 'all':
    default:
      return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r };
  }
}

/**
 * Apply a Figma-style smooth-corner ("squircle") `clip-path` to the host
 * element. Re-computes the path whenever the element resizes.
 *
 * Borders: pass `[borderWidth]` (px) + `[borderColor]` and the directive
 * paints a `::before` pseudo with an *inset* squircle path on top of the
 * host. The visible border is the host's own background colour, so set
 * `background: <border-color>` on the host (or use the convenience
 * `[borderColor]` input which writes the host background for you).
 *
 * @example
 * ```html
 * <button wrButton wrSquircle [radius]="16">Save</button>
 * <wr-tag wrSquircle>v2.0</wr-tag>
 * <div wrSquircle [radius]="32" [smoothing]="0.8">…</div>
 * <div wrSquircle [borderWidth]="2" borderColor="var(--wr-color-primary)">…</div>
 * ```
 */
@Directive({
  selector: '[wrSquircle]',
  host: { '[class.wr-squircle--bordered]': 'borderWidth() > 0 && enabled()' },
})
export class WrSquircle {
  /** Corner radius in CSS pixels. Falls back to `--wr-border-radius-base` × 16. @default 12 */
  readonly radius = input(12, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 12)) });

  /** Smoothing factor — `0` = plain rounded rect; `1` = full smooth iOS corner. @default 1 */
  readonly smoothing = input(1, {
    transform: (v: unknown): number => Math.min(1, Math.max(0, coerceNumberProperty(v, 1))),
  });

  /**
   * Whether the squircle clip-path is applied. When `false`, the directive
   * stays inert (clip-path cleared).
   *
   * Modelled as `model()` so a parent component composing this directive
   * (`inject(WrSquircle, { self: true }).enabled.set(...)`) can flip the
   * state from outside without exposing an `enabled` input on its own API.
   *
   * @default true
   */
  readonly enabled = model(true);

  /**
   * Border thickness in CSS pixels. `0` disables the border ring entirely.
   * Modelled (not `input()`) so parent components composing this directive
   * can flip it imperatively — e.g. `WrButton` turning on a 1px ring when
   * `shape="squircle" outlined` is active.
   * @default 0
   */
  readonly borderWidth = model(0);

  /**
   * Border colour — any CSS colour. Applied to the host's background so the
   * outer squircle reveals it. Defaults to `currentColor` so the consuming
   * element's text colour drives the ring.
   * @default 'currentColor'
   */
  readonly borderColor = model<string>('currentColor');

  /**
   * Which corners to squircle. `'all'` (default) is the standard four-
   * corner shape; `'left'` / `'right'` / `'top'` / `'bottom'` squircle
   * only the two corners on the named side and leave the other two at
   * 90°. `'none'` is equivalent to disabling the directive.
   *
   * Modelled so parent components composing the directive can flip the
   * value imperatively — used by `WrButtonGroup` to squircle only the
   * outer corners of the first / last child.
   *
   * @default 'all'
   */
  readonly corners = model<WrSquircleCornerMask>('all');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private observer: ResizeObserver | null = null;

  constructor() {
    if (!this.isBrowser) return;
    const host = this.el.nativeElement;
    // Reactively re-apply when inputs change.
    effect(() => {
      this.radius();
      this.smoothing();
      this.enabled();
      this.borderWidth();
      this.borderColor();
      this.corners();
      this.apply();
    });
    // Re-apply on resize.
    this.observer = new ResizeObserver(() => this.apply());
    this.observer.observe(host);
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.clear();
    });
  }

  private apply(): void {
    const host = this.el.nativeElement;
    if (!this.enabled()) {
      this.clear();
      return;
    }
    const rect = host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const r = this.radius();
    const s = this.smoothing();
    const radii = maskToRadii(this.corners(), r);
    const outer = squirclePath(rect.width, rect.height, radii, s);
    const value = `path("${outer}")`;
    host.style.clipPath = value;
    host.style.setProperty('-webkit-clip-path', value);

    // Border mode: paint an INNER squircle in a `::before` pseudo on top of
    // the host so the host's own bg only shows at the border-width perimeter.
    const bw = this.borderWidth();
    if (bw > 0) {
      const innerW = Math.max(0, rect.width - bw * 2);
      const innerH = Math.max(0, rect.height - bw * 2);
      const innerR = Math.max(0, r - bw);
      if (innerW > 0 && innerH > 0) {
        const innerRadii = maskToRadii(this.corners(), innerR);
        const inner = squirclePath(innerW, innerH, innerRadii, s);
        host.style.setProperty('--wr-squircle-inner-path', `path("${inner}")`);
      }
      host.style.setProperty('--wr-squircle-border-width', `${bw}px`);
      // Only set the colour var inline when the consumer asked for a
      // specific colour. Leaving the default `'currentColor'` un-inlined
      // lets host CSS (e.g. WrButton's outlined-squircle rule) override
      // the var via SCSS without losing to inline-style specificity.
      const bc = this.borderColor();
      if (bc && bc !== 'currentColor') {
        host.style.setProperty('--wr-squircle-border-color', bc);
      } else {
        host.style.removeProperty('--wr-squircle-border-color');
      }
    } else {
      host.style.removeProperty('--wr-squircle-inner-path');
      host.style.removeProperty('--wr-squircle-border-width');
      host.style.removeProperty('--wr-squircle-border-color');
    }
  }

  private clear(): void {
    const host = this.el.nativeElement;
    host.style.removeProperty('clip-path');
    host.style.removeProperty('-webkit-clip-path');
    host.style.removeProperty('--wr-squircle-inner-path');
    host.style.removeProperty('--wr-squircle-border-width');
    host.style.removeProperty('--wr-squircle-border-color');
  }
}

/**
 * Which corners to squircle. `'all'` = standard four-corner squircle;
 * the side-named values squircle the two corners on that side and leave
 * the other two at 90°. Useful for tab-/segment-style controls where
 * only outer corners need smoothing.
 */
export type WrSquircleCornerMask = 'all' | 'left' | 'right' | 'top' | 'bottom' | 'none';

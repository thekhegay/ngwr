/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, effect, inject, input } from '@angular/core';

import { squirclePath } from './compute-squircle-path';

/**
 * Apply a Figma-style smooth-corner ("squircle") `clip-path` to the host
 * element. Re-computes the path whenever the element resizes.
 *
 * @example
 * ```html
 * <button wrButton wrSquircle [radius]="16">Save</button>
 * <wr-tag wrSquircle>v2.0</wr-tag>
 * <div wrSquircle [radius]="32" [smoothing]="0.8">…</div>
 * ```
 */
@Directive({ selector: '[wrSquircle]' })
export class WrSquircleDirective {
  /** Corner radius in CSS pixels. Falls back to `--wr-border-radius-base` × 16. @default 12 */
  readonly radius = input(12, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 12)) });

  /** Smoothing factor — `0` = plain rounded rect; `1` = full smooth iOS corner. @default 1 */
  readonly smoothing = input(1, {
    transform: (v: unknown): number => Math.min(1, Math.max(0, coerceNumberProperty(v, 1))),
  });

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
      this.apply();
    });
    // Re-apply on resize.
    this.observer = new ResizeObserver(() => this.apply());
    this.observer.observe(host);
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      host.style.removeProperty('clip-path');
      host.style.removeProperty('-webkit-clip-path');
    });
  }

  private apply(): void {
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const d = squirclePath(rect.width, rect.height, this.radius(), this.smoothing());
    const value = `path("${d}")`;
    host.style.clipPath = value;
    host.style.setProperty('-webkit-clip-path', value);
  }
}

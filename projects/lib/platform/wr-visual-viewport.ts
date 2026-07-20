/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, Service, type Signal, inject, signal } from '@angular/core';

/**
 * SSR-safe view onto `window.visualViewport` — the part of the layout viewport
 * actually visible once the on-screen keyboard (or other browser chrome) is
 * accounted for.
 *
 * - `bottomInset` — px hidden at the bottom of the layout viewport (the
 *   keyboard height); `0` when nothing covers it, on the server, or in browsers
 *   without the API.
 * - `offsetTop` — how far the visual viewport is pushed/scrolled down.
 *
 * While active it also mirrors `bottomInset` onto `--wr-keyboard-inset` on the
 * document root, so purely presentational surfaces (the responsive overlay
 * sheet, the command-palette sheet) can lift above the keyboard with CSS alone.
 *
 * @see https://ngwr.dev/reference/services/platform
 */
@Service()
export class WrVisualViewport {
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _bottomInset = signal(0);
  private readonly _offsetTop = signal(0);

  /** Height (px) the keyboard / browser chrome hides at the viewport bottom. */
  readonly bottomInset: Signal<number> = this._bottomInset.asReadonly();
  /** The visual viewport's top offset (px). */
  readonly offsetTop: Signal<number> = this._offsetTop.asReadonly();

  constructor() {
    const vv = this.isBrowser ? this.doc.defaultView?.visualViewport : null;
    if (!vv) return;

    const root = this.doc.documentElement;
    const update = (): void => {
      // The band below the visual viewport, in layout-viewport coordinates.
      const bottom = Math.max(0, root.clientHeight - (vv.height + vv.offsetTop));
      this._bottomInset.set(bottom);
      this._offsetTop.set(vv.offsetTop);
      root.style.setProperty('--wr-keyboard-inset', `${bottom}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    this.destroyRef.onDestroy(() => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--wr-keyboard-inset');
    });
  }
}

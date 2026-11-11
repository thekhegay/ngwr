/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { Component, PLATFORM_ID, ViewEncapsulation, effect, inject, input, viewChild } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { wrNumAttr, wrResolveCssColor, wrCheckStyles } from 'ngwr/utils';

import { drawQrCode } from './generator';
import type { WrQrErrorLevel } from './types';

/**
 * Renders a QR code on a `<canvas>`.
 *
 * @example
 * ```html
 * <wr-qr value="https://ngwr.dev" [size]="200" level="H" />
 * <wr-qr value="..." iconUrl="/logo.png" [iconSize]="48" level="H" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/qrcode
 */
@Component({
  selector: 'wr-qr',
  templateUrl: './qr.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-qr', '[style.background]': 'bgColor()' },
})
export class WrQr {
  /** Text or URL to encode. Required. */
  readonly value = input.required<string>();

  /** Error correction level. Use `'H'` if you overlay an icon. @default 'M' */
  readonly level = input<WrQrErrorLevel>('M');

  /** Side length of the rendered canvas, in pixels. @default 160 */
  readonly size = input(160, { transform: wrNumAttr(160) });

  /**
   * Outer quiet-zone padding, in BITMAP units — not the CSS pixels `size`
   * is in. The canvas is drawn at ten bitmap units per QR module and then
   * scaled to `size`, so the default 10 is exactly one module, and what it
   * comes to on screen shrinks as the payload grows and the code gains
   * modules. `iconSize` is the other way round, in CSS pixels, and is scaled
   * into the bitmap on the way in.
   *
   * The QR spec asks for a four-module quiet zone, i.e. `40`. One module is
   * enough for a phone decoder reading a screen, where the page around the
   * canvas extends the margin anyway; raise it for a code that will be
   * printed small or sit on a busy background.
   *
   * @default 10
   */
  readonly padding = input(10, { transform: wrNumAttr(10) });

  /**
   * Module (dot) color. Any CSS colour, `var()` and `light-dark()` included: it is
   * resolved against the canvas when the code is drawn, and redrawn only when an
   * input changes, so a colour scheme switched afterwards is not followed. Keep the
   * modules much darker than the background, or phones will not read the code.
   * @default '#000000'
   */
  readonly color = input<string>('#000000');

  /**
   * Background color of the canvas + host. Any CSS colour, resolved the way
   * `color` is. @default '#ffffff'
   */
  readonly bgColor = input<string>('#ffffff');

  /** Optional image URL or data URL to overlay in the center. */
  readonly iconUrl = input<string | null>(null);

  /** Center icon size in logical pixels. @default 42 */
  readonly iconSize = input(42, { transform: wrNumAttr(42) });

  /**
   * Accessible name. A QR code is content — it usually encodes a URL — and a
   * `<canvas>` carries no implicit role and no text alternative, so without a name it
   * is nothing at all to a screen reader. Say what the code is FOR when you can.
   * Falls back to `qr.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'qr.label', 'QR code');

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('qr');
    effect(() => {
      // Read every input to register reactive deps
      const opts = {
        value: this.value(),
        size: this.size(),
        padding: this.padding(),
        color: this.color(),
        bgColor: this.bgColor(),
        level: this.level(),
        iconUrl: this.iconUrl(),
        iconSize: this.iconSize(),
      };
      if (!this.isBrowser) return;
      const el = this.canvas()?.nativeElement;
      if (!el) return;
      // The colour probes sit inside the canvas and inherit this. Under forced colours they
      // would read one forced colour for both the modules and the ground, and draw a
      // solid square nobody can scan. Written here rather than in a stylesheet, because an
      // app may use the class with no `@use`, and rather than bound, because a binding
      // lands after this effect's first draw.
      el.style.setProperty('forced-color-adjust', 'none');
      // A 2D context reads no CSS: it refuses a `var()` or a `light-dark()` and keeps
      // its previous fill, so a token colour drew every module in the background's
      // colour, or the whole code as one black square. Resolved through the cascade
      // the way the other canvas components do.
      drawQrCode(el, {
        ...opts,
        color: wrResolveCssColor(el, opts.color, '#000000'),
        bgColor: wrResolveCssColor(el, opts.bgColor, '#ffffff'),
      });
    });
  }
}

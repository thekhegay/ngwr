/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { Component, PLATFORM_ID, ViewEncapsulation, effect, inject, input, viewChild } from '@angular/core';

import { numAttr } from 'ngwr/utils';

import { drawQrCode } from './generator';
import type { WrQrErrorLevel } from './interfaces';

/**
 * Renders a QR code on a `<canvas>`.
 *
 * @example
 * ```html
 * <wr-qr value="https://ngwr.dev" [size]="200" level="H" />
 * <wr-qr value="..." iconUrl="/logo.png" [iconSize]="48" level="H" />
 * ```
 *
 * @see https://ngwr.dev/components/qrcode
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
  readonly size = input(160, { transform: numAttr(160) });

  /** Outer quiet-zone padding in pixels. @default 10 */
  readonly padding = input(10, { transform: numAttr(10) });

  /** Module (dot) color. @default '#000000' */
  readonly color = input<string>('#000000');

  /** Background color of the canvas + host. @default '#ffffff' */
  readonly bgColor = input<string>('#ffffff');

  /** Optional image URL or data URL to overlay in the center. */
  readonly iconUrl = input<string | null>(null);

  /** Center icon size in logical pixels. @default 42 */
  readonly iconSize = input(42, { transform: numAttr(42) });

  protected readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
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
      drawQrCode(el, opts);
    });
  }
}

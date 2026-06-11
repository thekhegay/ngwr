/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the SplashCursor effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/animations/splash-cursor
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { Component, NgZone, PLATFORM_ID, ViewEncapsulation, effect, inject, input, viewChild } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

import { createFluidSimulation } from './fluid';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Splash cursor — a WebGL fluid simulation that splashes colourful dye
 * wherever the pointer moves or clicks. Renders as a fixed, full-viewport,
 * click-through overlay; mount it once on a page (it follows the pointer
 * everywhere) and it tears down with the component.
 *
 * Renders nothing under `prefers-reduced-motion` or when WebGL is
 * unavailable.
 *
 * @example
 * ```html
 * <wr-splash-cursor />
 * <wr-splash-cursor [rainbow]="false" color="#5227ff" />
 * ```
 *
 * @see https://ngwr.dev/animations/splash-cursor
 */
@Component({
  selector: 'wr-splash-cursor',
  template: '<canvas #canvas class="wr-splash-cursor__canvas"></canvas>',
  styleUrl: './splash-cursor.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-splash-cursor' },
})
export class WrSplashCursor {
  /** Velocity / pressure grid resolution. @default 128 */
  readonly simResolution = input(128, { transform: num(128) });

  /** Dye texture resolution — the visible detail. @default 1440 */
  readonly dyeResolution = input(1440, { transform: num(1440) });

  /** How fast the dye fades, higher = shorter trails. @default 3.5 */
  readonly densityDissipation = input(3.5, { transform: num(3.5) });

  /** How fast motion settles. @default 2 */
  readonly velocityDissipation = input(2, { transform: num(2) });

  /** Pressure retained between frames, 0..1. @default 0.1 */
  readonly pressure = input(0.1, { transform: num(0.1) });

  /** Jacobi iterations for the pressure solve. @default 20 */
  readonly pressureIterations = input(20, { transform: num(20) });

  /** Vorticity confinement — swirliness. @default 3 */
  readonly curl = input(3, { transform: num(3) });

  /** Splat size. @default 0.2 */
  readonly splatRadius = input(0.2, { transform: num(0.2) });

  /** Velocity a pointer move injects. @default 6000 */
  readonly splatForce = input(6000, { transform: num(6000) });

  /** Pseudo-3D shading on the dye. @default true */
  readonly shading = input(true, { transform: coerceBooleanProperty });

  /** How fast the splat colour cycles. @default 10 */
  readonly colorUpdateSpeed = input(10, { transform: num(10) });

  /** Cycle splat colours through the rainbow. @default true */
  readonly rainbow = input(true, { transform: coerceBooleanProperty });

  /** Fixed splat colour when `rainbow` is off. @default '#ff0000' */
  readonly color = input('#ff0000');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly zone = inject(NgZone);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.isBrowser) return;

    // (Re)boot whenever the canvas appears, any input changes, or the OS
    // reduced-motion preference flips. `onCleanup` tears the old sim down.
    effect(onCleanup => {
      const canvas = this.canvasRef()?.nativeElement;
      const config = {
        simResolution: this.simResolution(),
        dyeResolution: this.dyeResolution(),
        densityDissipation: this.densityDissipation(),
        velocityDissipation: this.velocityDissipation(),
        pressure: this.pressure(),
        pressureIterations: this.pressureIterations(),
        curl: this.curl(),
        splatRadius: this.splatRadius(),
        splatForce: this.splatForce(),
        shading: this.shading(),
        colorUpdateSpeed: this.colorUpdateSpeed(),
        rainbow: this.rainbow(),
        color: this.color(),
      };
      if (!canvas || this.platform.prefersReducedMotion()) return;
      const teardown = this.zone.runOutsideAngular(() => createFluidSimulation(canvas, config));
      if (teardown) onCleanup(teardown);
    });
  }
}

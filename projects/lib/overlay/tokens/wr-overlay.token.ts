/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Overlay, OverlayContainer, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { EnvironmentInjector, InjectionToken, Injector, inject } from '@angular/core';

import { WR_OVERLAY_CONTAINER } from './wr-overlay-container.token';

/**
 * Injection token for the CDK `Overlay` service NGWR components should
 * use to open panels.
 *
 * Isolated by default: a fresh `Overlay` bound to `WR_OVERLAY_CONTAINER`
 * rather than CDK's root one, so NGWR overlays never share a DOM root — and
 * with it z-index, styles and lifecycle — with Angular Material, NG-ZORRO or
 * any other CDK consumer. CDK's root `Overlay` and `OverlayContainer` are
 * left untouched, so those libraries keep theirs.
 *
 * @internal — directives/services inside the lib inject this instead of
 * CDK's `Overlay` directly.
 */
export const WR_OVERLAY = new InjectionToken<Overlay>('WR_OVERLAY', {
  providedIn: 'root',
  factory: (): Overlay => {
    const parent = inject(EnvironmentInjector);
    const container = inject(WR_OVERLAY_CONTAINER);

    // `Overlay` reads `OverlayContainer` from its own injector, so a child that
    // answers with ours gets a fresh instance bound to it. Providing either in
    // the root instead would move every other CDK consumer into it as well.
    // The position builder comes along because a connected position strategy
    // measures the container it reads from its builder's injector: left in the
    // root, the first dropdown created CDK's own container just to measure it.
    const child = Injector.create({
      parent,
      providers: [
        { provide: OverlayContainer, useValue: container },
        { provide: OverlayPositionBuilder, useClass: OverlayPositionBuilder },
        { provide: Overlay, useClass: Overlay },
      ],
    });

    return child.get(Overlay);
  },
});

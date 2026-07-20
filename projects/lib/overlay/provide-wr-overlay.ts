/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Overlay, OverlayContainer } from '@angular/cdk/overlay';
import {
  EnvironmentInjector,
  Injector,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

import { WrVisualViewport } from 'ngwr/platform';

import { WR_OVERLAY, WR_OVERLAY_CONTAINER } from './tokens';
import { WrOverlayContainer } from './wr-overlay-container';

/**
 * Isolates NGWR overlays from other CDK consumers in the app.
 *
 * Without this call, NGWR overlays use CDK's root `Overlay` — they
 * render into the same `.cdk-overlay-container` element as Angular
 * Material, NG-ZORRO, etc. With it, NGWR gets its own `OverlayContainer`
 * (marked `.wr-overlay-container`) **and** its own `Overlay` service
 * instance — so styles, z-index, and lifecycle never collide.
 *
 * It does this by replacing two injection tokens:
 * - `WR_OVERLAY_CONTAINER` → custom `WrOverlayContainer` subclass
 * - `WR_OVERLAY` → a fresh `Overlay` instance built in a child injector
 *   that resolves `OverlayContainer` to the custom subclass
 *
 * CDK's own root `Overlay` / `OverlayContainer` are left untouched, so
 * other libraries keep working with their original container.
 *
 * @example
 * ```ts
 * import { provideWrOverlay } from 'ngwr/overlay';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrOverlay(),
 *   ],
 * });
 * ```
 */
export function provideWrOverlay(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // Track the visual viewport app-wide so overlay sheets (and the
    // command-palette) can lift above the on-screen keyboard. No-op on the
    // server / in browsers without the API.
    provideEnvironmentInitializer(() => void inject(WrVisualViewport)),
    { provide: WR_OVERLAY_CONTAINER, useClass: WrOverlayContainer },
    {
      provide: WR_OVERLAY,
      useFactory: (): Overlay => {
        const parent = inject(EnvironmentInjector);
        const container = inject(WR_OVERLAY_CONTAINER);

        // Child injector resolves `OverlayContainer` to our subclass and
        // creates a fresh `Overlay` instance bound to it. CDK's own root
        // `Overlay` and `OverlayContainer` are untouched in the parent.
        const child = Injector.create({
          parent,
          providers: [
            { provide: OverlayContainer, useValue: container },
            { provide: Overlay, useClass: Overlay },
          ],
        });

        return child.get(Overlay);
      },
    },
  ]);
}

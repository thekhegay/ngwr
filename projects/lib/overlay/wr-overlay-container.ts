/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { OverlayContainer } from '@angular/cdk/overlay';
import { _isTestEnvironment } from '@angular/cdk/platform';
import { Service } from '@angular/core';

const CONTAINER_CLASS = 'wr-overlay-container';
const PLATFORM_ATTR = 'data-wr-platform';

/**
 * The overlay container every NGWR overlay renders into — a CDK
 * `OverlayContainer` subclass that tags its element with
 * `.wr-overlay-container` in addition to CDK's own `.cdk-overlay-container`.
 *
 * It is what `WR_OVERLAY_CONTAINER` resolves to by default, and it is never
 * provided as CDK's root `OverlayContainer`: that one stays the element
 * Angular Material, NG-ZORRO and every other CDK consumer share, so NGWR's
 * overlays sit in an element of their own. The class is the stable hook for
 * styling them, e.g.:
 *
 * ```scss
 * .wr-overlay-container .cdk-overlay-pane { font-size: var(--wr-text-sm); }
 * ```
 *
 * Not a z-index: CDK 22 promotes overlays into the top layer, which no
 * z-index reaches.
 */
@Service()
export class WrOverlayContainer extends OverlayContainer {
  // Not `super._createContainer()`: CDK stamps its element `platform="test"`
  // (or `"server"`) and, creating one, removes every `.cdk-overlay-container`
  // carrying either — so under Karma, Jasmine, Jest or Mocha the root container
  // and this one would detach each other. Same conditions, own attribute, and
  // only its own leftovers swept; CDK's class stays for the structural styles.
  protected override _createContainer(): void {
    const testing = _isTestEnvironment();

    if (this._platform.isBrowser || testing) {
      this._document
        .querySelectorAll(`.${CONTAINER_CLASS}[${PLATFORM_ATTR}="server"], .${CONTAINER_CLASS}[${PLATFORM_ATTR}="test"]`)
        .forEach((stale) => stale.remove());
    }

    const container = this._document.createElement('div');
    container.classList.add('cdk-overlay-container', CONTAINER_CLASS);
    if (testing) container.setAttribute(PLATFORM_ATTR, 'test');
    else if (!this._platform.isBrowser) container.setAttribute(PLATFORM_ATTR, 'server');

    this._document.body.appendChild(container);
    this._containerElement = container;
  }
}

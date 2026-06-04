/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { OverlayContainer } from '@angular/cdk/overlay';
import { Service } from '@angular/core';

/**
 * Custom CDK `OverlayContainer` subclass that tags its DOM element with
 * `.wr-overlay-container` in addition to CDK's own `.cdk-overlay-container`.
 *
 * Why: CDK uses a single overlay container per app — every CDK consumer
 * (this lib, Angular Material, NG-ZORRO, etc.) puts its overlays in the
 * same root element. With this class applied you can scope NGWR-specific
 * overlay styles via the tag, e.g.:
 *
 * ```scss
 * .wr-overlay-container .cdk-overlay-pane { z-index: 1100; }
 * ```
 *
 * It does **not** isolate two libraries that both subclass OverlayContainer
 * — the last provider wins. It does give NGWR overlays a stable CSS hook.
 */
@Service()
export class WrOverlayContainer extends OverlayContainer {
  protected override _createContainer(): void {
    super._createContainer();
    this._containerElement?.classList.add('wr-overlay-container');
  }
}

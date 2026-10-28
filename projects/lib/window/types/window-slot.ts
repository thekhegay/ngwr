/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ComponentType } from '@angular/cdk/portal';
import type { TemplateRef } from '@angular/core';

import type { WrWindowRef } from '../window-ref';

/**
 * What a `titleExtra` or `statusBar` template receives: the window's own ref
 * as `$implicit`, so `<ng-template let-ref>` can read its title, state or
 * geometry.
 */
export interface WrWindowSlotContext {
  readonly $implicit: WrWindowRef<unknown, unknown>;
}

/**
 * Content for one of the window's own slots: a template, or a component. A
 * component is created with the window's injector, so it can
 * `inject(WR_WINDOW_REF)` and `inject(WR_WINDOW_DATA)` like the body can.
 */
export type WrWindowSlotContent = TemplateRef<WrWindowSlotContext> | ComponentType<unknown>;

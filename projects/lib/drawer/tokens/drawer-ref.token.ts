/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrDrawerRef } from '../drawer-ref';

/**
 * Token exposing the open drawer's `WrDrawerRef` to components and
 * directives rendered inside it (e.g. `[wrDrawerClose]`).
 *
 * `WrDrawerRef` is provided as its own token too, so `inject(WrDrawerRef)`
 * is the shorter path. Reach for this token when you want the ref typed
 * without a cast, or when the component also renders outside a drawer and
 * needs `{ optional: true }`.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ChatComponent {
 *   private readonly ref = inject<WrDrawerRef<ChatComponent, boolean>>(WR_DRAWER_REF);
 *
 *   dismiss(): void {
 *     this.ref.close(true);
 *   }
 * }
 * ```
 */
export const WR_DRAWER_REF = new InjectionToken<WrDrawerRef<unknown, unknown>>('WR_DRAWER_REF');

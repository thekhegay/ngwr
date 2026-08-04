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
 * **Prefer `inject(WrDrawerRef)`** — the ref is provided under the class token
 * too, and the class path is the documented one. It already covers both cases
 * you might reach for a token for: `inject(WrDrawerRef, { optional: true })`
 * works for content that also renders outside a drawer, and
 * `inject<WrDrawerRef<ChatComponent, boolean>>(WrDrawerRef)` types the generics
 * without a cast.
 *
 * This token is the same object under a second key. It exists for the library's
 * own directives (`[wrDrawerClose]`) and for swapping the provider out — a test
 * stub, say — without touching the class.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ChatComponent {
 *   private readonly ref = inject<WrDrawerRef<ChatComponent, boolean>>(WrDrawerRef);
 *
 *   dismiss(): void {
 *     this.ref.close(true);
 *   }
 * }
 * ```
 */
export const WR_DRAWER_REF = new InjectionToken<WrDrawerRef<unknown, unknown>>('WR_DRAWER_REF');

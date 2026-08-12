/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, Directive, effect, inject, input, untracked } from '@angular/core';

import type { WrMetaConfig, WrMetaHandle } from './interfaces';
import { WrMeta } from './wr-meta';

/**
 * Declarative wrapper around {@link WrMeta}.
 *
 * - Pushes the bound config on init.
 * - Re-pushes (replacing) when the config reference changes.
 * - Pops the layer on destroy — perfect for route-level meta overrides.
 *
 * @example
 * ```html
 * <div [wrMeta]="{ title: 'Pricing', description: 'Plans for every team.' }">
 * ```
 */
@Directive({ selector: '[wrMeta]' })
export class WrMetaBinding {
  readonly wrMeta = input.required<WrMetaConfig>();

  private readonly metaService = inject(WrMeta);
  private handle: WrMetaHandle | null = null;

  constructor() {
    effect(() => {
      const next = this.wrMeta();
      // Only the INPUT is read reactively. `push` / `pop` write the service's
      // layer stack and then re-apply, and applying reads that same stack through
      // `resolved()` — so without this the effect depends on a signal it writes
      // and re-runs forever. `WrMeta.bind()` guards the identical pair the same
      // way; this directive was missing it.
      untracked(() => {
        this.handle?.pop();
        this.handle = this.metaService.push(next);
      });
    });
    inject(DestroyRef).onDestroy(() => this.handle?.pop());
  }
}

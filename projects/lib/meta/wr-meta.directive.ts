/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, Directive, effect, inject, input } from '@angular/core';

import type { WrMetaConfig, WrMetaHandle } from './types';
import { WrMetaService } from './wr-meta.service';

/**
 * Declarative wrapper around {@link WrMetaService}.
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
export class WrMetaDirective {
  readonly wrMeta = input.required<WrMetaConfig>();

  private readonly metaService = inject(WrMetaService);
  private handle: WrMetaHandle | null = null;

  constructor() {
    effect(() => {
      const next = this.wrMeta();
      this.handle?.pop();
      this.handle = this.metaService.push(next);
    });
    inject(DestroyRef).onDestroy(() => this.handle?.pop());
  }
}

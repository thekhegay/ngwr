/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { randomId } from 'ngwr/utils';

import { WR_TABS } from './tokens';

/**
 * Single tab. Two modes, decided by inputs:
 *
 * - **Content tab** — projected children render in the parent's content
 *   panel when this tab is active.
 * - **Router tab** — set `routerLink` and the tab becomes a link; the
 *   parent skips its content panel and the consumer drops a
 *   `<router-outlet>` below the tab strip.
 */
@Component({
  selector: 'wr-tab',
  template: `<ng-template><ng-content /></ng-template>`,
  encapsulation: ViewEncapsulation.None,
  // A BOUND display rather than a static `style` attribute: Angular writes a
  // binding through `style.setProperty`, which no CSP governs, while a real
  // `style="…"` attribute is refused under `style-src 'self'` — and this host
  // would then lay out an empty box in the middle of the content.
  host: { '[style.display]': "'none'" },
})
export class WrTab {
  /** Visible label on the tab strip. */
  readonly title = input.required<string>();

  /**
   * Stable identifier used by the parent to track the active tab.
   * Auto-generated if omitted.
   */
  readonly key = input<string>(randomId('wr-tab'));

  /** Router target — when set, the tab becomes a `[routerLink]` link. */
  readonly routerLink = input<string | readonly string[] | null>(null);

  /** Disable the tab. */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Tab content template; portaled into the parent's panel area. @internal */
  readonly contentTpl = viewChild.required(TemplateRef);

  private readonly parent = inject(WR_TABS, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isRouter = computed(() => this.routerLink() !== null);

  constructor() {
    if (this.parent) {
      // Both calls run with the input signals still on their defaults — a
      // constructor is too early for `key()` to be the consumer's value. The
      // parent tracks tabs through `contentChildren` and seeds `active` from
      // there; these stay as the declared lifecycle contract.
      this.parent.register({ key: this.key(), routerLink: this.routerLink() });
      this.destroyRef.onDestroy(() => this.parent?.unregister(this.key()));
    }
  }
}

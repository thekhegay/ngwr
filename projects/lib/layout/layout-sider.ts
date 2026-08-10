/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, effect, input, model, output, untracked } from '@angular/core';

/**
 * Collapsible side panel. Lives inside a row `<wr-layout>` next to a
 * `<wr-layout-content>`. Two-way `[(collapsed)]` controls width.
 *
 * @example
 * ```html
 * <wr-layout>
 *   <wr-layout-sider [(collapsed)]="collapsed" width="14rem" collapsedWidth="3rem">
 *     …
 *   </wr-layout-sider>
 *   <wr-layout-content>Main</wr-layout-content>
 * </wr-layout>
 * ```
 */
@Component({
  selector: 'wr-layout-sider',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.width]': 'collapsed() ? collapsedWidth() : width()',
    role: 'complementary',
  },
})
export class WrLayoutSider {
  /** Two-way bindable collapsed state. @default false */
  readonly collapsed = model(false);

  /** Width when expanded. Any CSS length. @default '16rem' */
  readonly width = input<string>('16rem');

  /** Width when collapsed. Any CSS length. `0` to fully hide. @default '4rem' */
  readonly collapsedWidth = input<string>('4rem');

  /** Place the sider on the right edge instead of the left. @default false */
  readonly reverse = input(false, { transform: coerceBooleanProperty });

  /** Emits whenever `collapsed` changes (in addition to the two-way `[(collapsed)]`). */
  readonly collapsedChanged = output<boolean>();

  constructor() {
    // The output is documented as firing whenever `collapsed` CHANGES, and it
    // only ever fired from `toggle()` — so a `[(collapsed)]` write, which is the
    // documented way to drive this, was silent. Emitting from an effect covers
    // both, and skipping the first run keeps the initial value from reading as a
    // change.
    let first = true;
    effect(() => {
      const collapsed = this.collapsed();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.collapsedChanged.emit(collapsed));
    });
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-layout-sider'];
    if (this.collapsed()) parts.push('wr-layout-sider--collapsed');
    if (this.reverse()) parts.push('wr-layout-sider--reverse');
    return parts.join(' ');
  });

  /** Imperative toggle helper — `[(collapsed)]` still works alongside this. */
  toggle(): void {
    // No emit here: the effect above owns that, so a toggle and an external
    // write produce exactly one event each rather than two and none.
    this.collapsed.set(!this.collapsed());
  }
}

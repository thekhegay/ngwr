/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, model, output } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  protected readonly classes = computed(() => {
    const parts = ['wr-layout-sider'];
    if (this.collapsed()) parts.push('wr-layout-sider--collapsed');
    if (this.reverse()) parts.push('wr-layout-sider--reverse');
    return parts.join(' ');
  });

  /** Imperative toggle helper — `[(collapsed)]` still works alongside this. */
  toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    this.collapsedChanged.emit(next);
  }
}

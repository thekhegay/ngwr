/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, contentChildren } from '@angular/core';

import { WrLayoutSiderComponent } from './layout-sider.component';

/**
 * App-shell layout container. Lays its children out as a flex column by
 * default; switches to a row when a `<wr-layout-sider>` is among the
 * direct children (so `header → [sider + content] → footer` falls into
 * place automatically — same convention as ng-zorro / antd Layout).
 *
 * @example
 * ```html
 * <wr-layout>
 *   <wr-layout-header>App bar</wr-layout-header>
 *   <wr-layout>
 *     <wr-layout-sider [(collapsed)]="collapsed">Sidebar</wr-layout-sider>
 *     <wr-layout-content>Main</wr-layout-content>
 *   </wr-layout>
 *   <wr-layout-footer>© 2026</wr-layout-footer>
 * </wr-layout>
 * ```
 *
 * @see https://ngwr.dev/docs/components/layout
 */
@Component({
  selector: 'wr-layout',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrLayoutComponent {
  protected readonly siders = contentChildren(WrLayoutSiderComponent);

  protected readonly classes = computed(() => {
    const parts = ['wr-layout'];
    if (this.siders().length > 0) parts.push('wr-layout--has-sider');
    return parts.join(' ');
  });
}

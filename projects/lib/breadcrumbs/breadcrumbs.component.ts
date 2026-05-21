/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, forwardRef, input } from '@angular/core';

import { WR_BREADCRUMBS, type WrBreadcrumbsContext } from './tokens';

/**
 * Navigation trail. Wrap one or more `<wr-breadcrumb-item>` children;
 * a separator is rendered automatically between them.
 *
 * @example
 * ```html
 * <wr-breadcrumbs>
 *   <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
 *   <wr-breadcrumb-item routerLink="/docs">Docs</wr-breadcrumb-item>
 *   <wr-breadcrumb-item>Breadcrumbs</wr-breadcrumb-item>
 * </wr-breadcrumbs>
 * ```
 *
 * @see https://ngwr.dev/docs/components/breadcrumbs
 */
@Component({
  selector: 'wr-breadcrumbs',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-breadcrumbs', role: 'navigation', 'aria-label': 'Breadcrumb' },
  providers: [
    {
      provide: WR_BREADCRUMBS,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrBreadcrumbsComponent),
    },
  ],
})
export class WrBreadcrumbsComponent implements WrBreadcrumbsContext {
  /** Separator rendered between items. @default '/' */
  readonly separator = input<string>('/');
}

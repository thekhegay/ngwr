/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, forwardRef, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';

import { EMPTY, filter, map, startWith } from 'rxjs';

import { WrBreadcrumbItemComponent } from './breadcrumb-item.component';
import { WR_BREADCRUMBS, type WrBreadcrumbsContext } from './tokens';

/** One auto-built item. */
type AutoItem = { readonly label: string; readonly url: string };

function buildAuto(root: ActivatedRoute, homeLabel: string, homeUrl: string): readonly AutoItem[] {
  const items: AutoItem[] = [{ label: homeLabel, url: homeUrl }];
  const segments: string[] = [];
  let cursor: ActivatedRoute | null = root;
  // Walk down the active path collecting URL segments + breadcrumb labels.
  while (cursor) {
    const path = cursor.snapshot.url.map(s => s.path).join('/');
    if (path) segments.push(path);
    const data = cursor.snapshot.data;
    const label = (data['breadcrumb'] ?? data['title']) as string | undefined;
    if (label && path) {
      items.push({ label, url: `/${segments.join('/')}` });
    }
    cursor = cursor.firstChild;
  }
  return items;
}

/**
 * Navigation trail. Two modes:
 *
 * - **Manual**: project `<wr-breadcrumb-item>` children.
 * - **Auto**: set `[auto]="true"` to render items from the active route
 *   tree — each `route.data.breadcrumb` (or `data.title`) becomes an item,
 *   prefixed by a home link.
 *
 * @example
 * ```html
 * <wr-breadcrumbs>
 *   <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
 *   <wr-breadcrumb-item routerLink="/docs">Docs</wr-breadcrumb-item>
 *   <wr-breadcrumb-item>Breadcrumbs</wr-breadcrumb-item>
 * </wr-breadcrumbs>
 *
 * <wr-breadcrumbs auto homeLabel="Home" homeUrl="/" />
 * ```
 *
 * For auto mode, declare labels in route data:
 * ```ts
 * { path: 'settings', data: { breadcrumb: 'Settings' }, ... }
 * ```
 *
 * @see https://ngwr.dev/docs/components/breadcrumbs
 */
@Component({
  selector: 'wr-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-breadcrumbs', role: 'navigation', 'aria-label': 'Breadcrumb' },
  imports: [WrBreadcrumbItemComponent, RouterLink],
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

  /** Build items from the active router tree instead of projected children. @default false */
  readonly auto = input(false, { transform: coerceBooleanProperty });

  /** Label for the auto-prepended home crumb. @default 'Home' */
  readonly homeLabel = input<string>('Home');

  /** URL for the auto-prepended home crumb. @default '/' */
  readonly homeUrl = input<string>('/');

  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });

  /** Items derived from the active router tree (only meaningful when `auto` is true). */
  protected readonly autoItems = toSignal(
    this.router
      ? this.router.events.pipe(
          filter(e => e instanceof NavigationEnd),
          startWith(null),
          map(() => (this.route ? buildAuto(this.route.root, this.homeLabel(), this.homeUrl()) : ([] as readonly AutoItem[])))
        )
      : (EMPTY as unknown as import('rxjs').Observable<readonly AutoItem[]>),
    { initialValue: [] as readonly AutoItem[] }
  );

  protected readonly resolved = computed(() => (this.auto() ? this.autoItems() : []));
}

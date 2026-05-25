/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  ViewEncapsulation,
  computed,
  contentChildren,
  forwardRef,
  input,
  model,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { WrTabComponent } from './tab.component';
import { WR_TABS, type WrTabsContext } from './tokens';

/**
 * Tabbed container. Two modes depending on the child `<wr-tab>`
 * definitions:
 *
 * - **Content** — children project body content; the parent renders an
 *   active-tab panel automatically.
 * - **Router** — any child with `routerLink` switches the whole strip
 *   into router mode; the parent skips its panel so the consumer can
 *   drop a `<router-outlet>` after it.
 *
 * @example
 * ```html
 * <!-- content tabs -->
 * <wr-tabs [(active)]="key">
 *   <wr-tab key="one" title="One">First panel</wr-tab>
 *   <wr-tab key="two" title="Two">Second panel</wr-tab>
 * </wr-tabs>
 *
 * <!-- router tabs -->
 * <wr-tabs>
 *   <wr-tab title="Overview" routerLink="overview" />
 *   <wr-tab title="Details" routerLink="details" />
 * </wr-tabs>
 * <router-outlet />
 * ```
 *
 * @see https://ngwr.dev/docs/components/tabs
 */
@Component({
  selector: 'wr-tabs',
  templateUrl: './tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-tabs' },
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  providers: [
    {
      provide: WR_TABS,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTabsComponent),
    },
  ],
})
export class WrTabsComponent implements WrTabsContext {
  /** Two-way bindable active tab key (content mode). */
  readonly active = model<string | null>(null);

  /** Visual size variant. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly tabs = contentChildren(WrTabComponent);

  /** When any child has a routerLink, the whole strip switches to router mode. */
  protected readonly isRouter = computed(() => this.tabs().some(t => t.routerLink() !== null));

  /** Content-mode: the tab whose key matches `active()` (or the first tab if none yet). */
  protected readonly activeTab = computed(() => {
    const key = this.active();
    const tabs = this.tabs();
    if (tabs.length === 0) return null;
    return tabs.find(t => t.key() === key) ?? tabs[0];
  });

  // ──────── WrTabsContext ────────

  activate(key: string): void {
    this.active.set(key);
  }

  register({ key }: { key: string; routerLink: unknown }): void {
    if (this.active() === null) this.active.set(key);
  }

  unregister(): void {
    // No-op: contentChildren handles removal.
  }

  // ──────── Template handlers ────────

  protected readonly stripRef = viewChild<ElementRef<HTMLElement>>('strip');

  protected onTabClick(tab: WrTabComponent): void {
    if (tab.disabled()) return;
    if (!this.isRouter()) this.activate(tab.key());
  }

  /** Header id for `aria-labelledby` on the panel. @internal */
  headerId(key: string): string {
    return `wr-tab-${key}-header`;
  }

  /** Panel id for `aria-controls` on the tab header. @internal */
  panelId(key: string): string {
    return `wr-tab-${key}-panel`;
  }

  /** ArrowLeft/Right/Home/End keyboard navigation on the tab strip. */
  protected onStripKeydown(event: KeyboardEvent): void {
    const tabs = this.tabs().filter(t => !t.disabled());
    if (tabs.length === 0) return;
    const active = this.activeTab();
    const idx = active ? tabs.indexOf(active) : -1;
    let nextIdx: number;

    switch (event.key) {
      case 'ArrowRight':
        nextIdx = idx < tabs.length - 1 ? idx + 1 : 0;
        break;
      case 'ArrowLeft':
        nextIdx = idx > 0 ? idx - 1 : tabs.length - 1;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = tabs[nextIdx];
    if (!this.isRouter()) this.activate(next.key());
    // Move focus to the corresponding header element.
    const headerEl = this.stripRef()?.nativeElement.querySelector<HTMLElement>(
      `#${CSS.escape(this.headerId(next.key()))}`
    );
    headerEl?.focus();
  }
}

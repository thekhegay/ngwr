/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { WrIconComponent, caretForward, chevronDown, folder, provideWrIcons } from 'ngwr/icon';

import type { WrSidebarEntry, WrSidebarGroup, WrSidebarItem } from './types';

function isGroup(entry: WrSidebarEntry): entry is WrSidebarGroup {
  return 'children' in entry;
}

/**
 * Data-driven sidebar nav. Pass `[entries]` — either flat
 * `WrSidebarItem`s (direct links) or `WrSidebarGroup`s (expand to reveal
 * child items). Active route auto-expands its containing group.
 *
 * @example
 * ```html
 * <wr-sidebar [entries]="[
 *   { title: 'Dashboard', icon: 'home', url: ['/dashboard'] },
 *   {
 *     title: 'Settings',
 *     icon: 'cog',
 *     children: [
 *       { title: 'Profile', url: ['/settings', 'profile'] },
 *       { title: 'Billing', url: ['/settings', 'billing'] }
 *     ]
 *   }
 * ]" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/sidebar
 */
@Component({
  selector: 'wr-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-sidebar', role: 'navigation' },
  imports: [RouterLink, RouterLinkActive, WrIconComponent],
  providers: [provideWrIcons([folder, chevronDown, caretForward])],
})
export class WrSidebarComponent {
  readonly entries = input<readonly WrSidebarEntry[]>([]);

  /** Default icon for entries without one. @default 'folder' */
  readonly defaultGroupIcon = input<string>('folder');

  /** Default icon for items without one. @default 'caret-forward' */
  readonly defaultItemIcon = input<string>('caret-forward');

  /** Auto-expand the group containing the active route. @default true */
  readonly autoExpand = input(true, { transform: coerceBooleanProperty });

  protected readonly isGroup = isGroup;

  private readonly opened = signal<ReadonlySet<string>>(new Set());

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Last URL we auto-expanded — prevents re-opening a group the user collapsed. */
  private lastAutoUrl: string | null = null;

  constructor() {
    // Seed defaultOpen groups.
    effect(
      () => {
        const seeded = new Set<string>();
        for (const entry of this.entries()) {
          if (isGroup(entry) && entry.defaultOpen) seeded.add(entry.title);
        }
        if (seeded.size > 0) {
          this.opened.update(prev => new Set([...prev, ...seeded]));
        }
      },
      { allowSignalWrites: true }
    );

    // Auto-expand the group containing the current URL.
    effect(
      () => {
        if (!this.autoExpand()) return;
        const url = this.currentUrl();
        if (url === this.lastAutoUrl) return;
        this.lastAutoUrl = url;
        const match = this.findGroupForUrl(url);
        if (!match || this.opened().has(match)) return;
        this.opened.update(prev => {
          const next = new Set(prev);
          next.add(match);
          return next;
        });
      },
      { allowSignalWrites: true }
    );
  }

  protected isOpen(title: string): boolean {
    return this.opened().has(title);
  }

  /** Stable id for the group body, referenced by the toggle's `aria-controls`. */
  protected groupBodyId(title: string): string {
    return `wr-sidebar-group-${title.replace(/\s+/g, '-').toLowerCase()}`;
  }

  protected toggleGroup(title: string): void {
    this.opened.update(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  protected asItem(entry: WrSidebarEntry): WrSidebarItem {
    return entry as WrSidebarItem;
  }

  protected asGroup(entry: WrSidebarEntry): WrSidebarGroup {
    return entry as WrSidebarGroup;
  }

  private findGroupForUrl(url: string): string | null {
    for (const entry of this.entries()) {
      if (!isGroup(entry)) continue;
      const hit = entry.children.some(child => url.startsWith(`/${child.url.join('/')}`));
      if (hit) return entry.title;
    }
    return null;
  }
}

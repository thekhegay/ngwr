/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';
import { type Params, RouterLink } from '@angular/router';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * One row inside `<wr-breadcrumbs>`. The host itself is the row — a
 * `<wr-breadcrumbs-item role="listitem" class="wr-breadcrumbs__item">`
 * inside the parent's `<ol>` — and it contains either a real
 * `<a class="wr-breadcrumbs__link">` (when `[href]` or `[routerLink]` is
 * set) or, for the current crumb, a non-interactive
 * `<a class="wr-breadcrumbs__current" role="text" tabindex="-1"
 * aria-current="page">` (when neither is set — typically the last crumb).
 *
 * The text sits in a `<span class="wr-breadcrumbs__label">`, which has no box of
 * its own until the trail is `truncate`. A label that is cut then takes its full
 * text as a `title` while the pointer is over the crumb. The accessible name is
 * the text itself, cut or not.
 *
 * @example
 * ```html
 * <wr-breadcrumbs-item icon="home" routerLink="/">Home</wr-breadcrumbs-item>
 * <wr-breadcrumbs-item routerLink="/debts" [queryParams]="{ date: day }">Debts</wr-breadcrumbs-item>
 * <wr-breadcrumbs-item href="https://ngwr.dev">External</wr-breadcrumbs-item>
 * <wr-breadcrumbs-item>Current page</wr-breadcrumbs-item>
 * ```
 */
@Component({
  selector: 'wr-breadcrumbs-item',
  templateUrl: './breadcrumbs-item.html',
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, RouterLink, WrIcon],
  host: { class: 'wr-breadcrumbs__item', role: 'listitem', '(pointerenter)': 'markCut()' },
})
export class WrBreadcrumbsItem {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('breadcrumbs');
  }

  /** Plain anchor href. Overridden by `routerLink` when both are set. */
  readonly href = input<string | null>(null);

  /** Angular router target. Anything `RouterLink` accepts (string or `any[]`). */
  readonly routerLink = input<string | readonly unknown[] | null>(null);

  /**
   * Query parameters for a `routerLink` crumb, the way `RouterLink` takes them.
   * A `?` written into `routerLink` is part of the path, and the router escapes
   * it: `/debts?date=1` became `/debts%3Fdate%3D1`. Ignored without `routerLink`.
   *
   * @default null
   */
  readonly queryParams = input<Params | null>(null);

  /** Open external `href` in a new tab. Ignored when `routerLink` is set. @default false */
  readonly external = input(false);

  /** Optional leading icon rendered inline before the label. @default null */
  readonly icon = input<WrIconName | null>(null);

  protected readonly isLink = computed(() => this.href() != null || this.routerLink() != null);
  protected readonly isRouter = computed(() => this.routerLink() != null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly cutTitle = signal<string | null>(null);

  protected markCut(): void {
    const label = this.host.nativeElement.querySelector<HTMLElement>('.wr-breadcrumbs__label');
    // A pixel of slack: a fractional width rounds the two reads apart.
    const cut = !!label && label.scrollWidth > label.clientWidth + 1;
    this.cutTitle.set(cut ? label.textContent.trim() : null);
  }

  protected readonly rootClass = computed(() => (this.isLink() ? 'wr-breadcrumbs__link' : 'wr-breadcrumbs__current'));
}

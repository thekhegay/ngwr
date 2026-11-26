/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, Renderer2, ViewEncapsulation, computed, effect, inject, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { WR_LIST } from './list-context';

/**
 * Row inside `<wr-list>`. Three projection slots:
 *
 *  - `[wrListItemLeading]` — icon, avatar, status dot, etc.
 *  - default — main label / body
 *  - `[wrListItemTrailing]` — meta value, action button, chevron
 *
 * Set `interactive` to get hover and cursor styles, a tab stop, and Enter /
 * Space activation. The role stays `listitem`: the row lives inside a
 * `<ul role="list">`, where a `button` or `option` child role would break the
 * structure the container promises. That means an interactive row ANNOUNCES as
 * a list item rather than as a control — deliberate, but worth knowing when the
 * whole row is the only way to reach an action. Where the action needs to be
 * announced as one, project a real button into `[wrListItemTrailing]`.
 *
 * Inside a `<wr-list selection>` the row is a `role="option"` instead: it
 * carries a `value`, reports `aria-selected`, and the list moves the focus.
 *
 * @example
 * ```html
 * <wr-list-item>Plain row</wr-list-item>
 *
 * <wr-list-item interactive (click)="onPick(item)">
 *   <wr-icon ngProjectAs="[wrListItemLeading]" name="folder" />
 *   Reports
 *   <span ngProjectAs="[wrListItemTrailing]">12</span>
 * </wr-list-item>
 * ```
 */
@Component({
  selector: 'wr-list-item',
  templateUrl: './list-item.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-list__item',
    '[class]': 'classes()',
    role: 'listitem',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-disabled]': 'unavailable() || null',
    '(click)': 'list?.pick(this)',
    '(focus)': 'list?.activate(this)',
    '(keydown.enter)': 'onActivate($event)',
    '(keydown.space)': 'onActivate($event)',
  },
})
export class WrListItem {
  /** @internal The list this row belongs to. */
  readonly list = inject(WR_LIST, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('list');

    // From an effect and only in the mode: a host `[attr.role]` binding would
    // strip a `role` the consumer bound on a plain row.
    const renderer = inject(Renderer2);
    let previousRole: string | null = null;
    let applied = false;
    effect(() => {
      const el = this.host.nativeElement;
      if (this.selectable()) {
        if (!applied) previousRole = el.getAttribute('role');
        applied = true;
        renderer.setAttribute(el, 'role', 'option');
        renderer.setAttribute(el, 'aria-selected', String(this.selected()));
      } else if (applied) {
        applied = false;
        if (previousRole === null) renderer.removeAttribute(el, 'role');
        else renderer.setAttribute(el, 'role', previousRole);
        renderer.removeAttribute(el, 'aria-selected');
      }
    });
  }

  /** Adds hover / cursor styles + keyboard activation. @default false */
  readonly interactive = input(false, { transform: coerceBooleanProperty });

  /** Visual disabled state. Suppresses hover + keyboard activation. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * What the row stands for in a `<wr-list selection>`: the list's `value` is
   * this, or an array of these. Unused in a plain list.
   */
  readonly value = input<unknown>(undefined);

  private readonly selectable = computed(() => !!this.list?.selection());
  private readonly selected = computed(() => this.selectable() && this.list!.isSelected(this.value()));
  protected readonly unavailable = computed(() => this.disabled() || (this.selectable() && this.list!.disabled()));

  protected readonly tabindex = computed(() => {
    if (!this.selectable()) return this.interactive() ? '0' : null;
    if (this.unavailable()) return null;
    return this.list!.isTabStop(this) ? '0' : '-1';
  });

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.interactive()) parts.push('wr-list__item--interactive');
    if (this.unavailable()) parts.push('wr-list__item--disabled');
    if (this.selectable()) parts.push('wr-list__item--selectable');
    if (this.selected()) parts.push('wr-list__item--selected');
    return parts.join(' ');
  });

  /** @internal */
  get element(): HTMLElement {
    return this.host.nativeElement;
  }

  /** @internal The row's own text, which type-ahead matches. */
  text(): string {
    return this.host.nativeElement.querySelector(':scope > .wr-list__body')?.textContent ?? '';
  }

  /** Focus the row. */
  focus(options?: FocusOptions): void {
    this.host.nativeElement.focus(options);
  }

  protected onActivate(event: Event): void {
    // A selectable list handles the keys itself, type-ahead's Space included.
    if (this.selectable()) return;
    if (event.target !== event.currentTarget || !this.interactive() || this.disabled()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }
}

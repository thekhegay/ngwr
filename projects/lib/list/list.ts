/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useFormFieldAria } from 'ngwr/form';
import { WR_KEYS, WR_LIVE_LOCALE, wrTypeahead } from 'ngwr/utils';

import { WR_LIST, type WrListContext } from './list-context';
import { WrListItem } from './list-item';
import type { WrListSelection } from './types';

/**
 * Generic list container. Renders `<ul role="list">` with optional
 * borders, dividers between items, and dense (compact) padding. Project
 * `<wr-list-item>` children — they pick up the container's settings
 * through CSS cascade, no DI needed.
 *
 * `selection` turns the whole list into a listbox: the `<ul>` is
 * `role="listbox"`, every row a `role="option"` with `aria-selected`, and the
 * list is one tab stop with a roving focus. It is then a signal-forms native
 * control: it implements `FormValueControl`, so `[formField]` binds straight to
 * its `value` model, and `[(value)]` works standalone.
 *
 * @example
 * ```html
 * <wr-list bordered dividers>
 *   <wr-list-item>
 *     <wr-icon ngProjectAs="[wrListItemLeading]" name="folder" />
 *     Reports
 *     <span ngProjectAs="[wrListItemTrailing]">12</span>
 *   </wr-list-item>
 *   <wr-list-item interactive (click)="open(item)">
 *     Click anywhere on this row
 *   </wr-list-item>
 * </wr-list>
 *
 * <wr-list selection="single" [(value)]="folder" ariaLabel="Folder">
 *   <wr-list-item value="inbox">Inbox</wr-list-item>
 *   <wr-list-item value="sent">Sent</wr-list-item>
 * </wr-list>
 * ```
 *
 * @see https://ngwr.dev/reference/components/list
 */
@Component({
  selector: 'wr-list',
  templateUrl: './list.html',
  styleUrl: './list.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-list',
    '[class]': 'classes()',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: WR_LIST, useExisting: WrList }],
})
export class WrList implements FormValueControl<unknown>, WrListContext {
  /** Wrap the list in a card-style border + radius. @default false */
  readonly bordered = input(false, { transform: coerceBooleanProperty });

  /** Draw a thin divider between items. @default false */
  readonly dividers = input(false, { transform: coerceBooleanProperty });

  /** Use compact padding on every item. @default false */
  readonly dense = input(false, { transform: coerceBooleanProperty });

  /** Optional accessible label for the list. */
  readonly ariaLabel = input<string>('');

  /**
   * Make the list a listbox the user picks rows from. `null` keeps the plain
   * `role="list"`. Set, each row is an option carrying its own `value`: Up,
   * Down, Home and End move the focus, typing jumps to a row by its text, and
   * Space, Enter or a click selects. `'single'` keeps one row, `'multiple'`
   * toggles each. A row is one option, so it holds no control of its own in
   * this mode.
   *
   * @default null
   */
  readonly selection = input<WrListSelection | null>(null);

  // `unknown` because the shape follows `selection`, as it does in `wr-tree`
  // and `wr-cascader`: no one type is true of both modes.
  /**
   * The selection: the picked row's `value` or `null` under
   * `selection="single"`, an array of them under `'multiple'`. Bound by
   * `[formField]`, or two-way via `[(value)]`. Unused while `selection` is
   * `null`.
   *
   * @default null
   */
  readonly value = model<unknown>(null);

  /** Emitted when focus leaves a selectable list, so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /**
   * Disable a selectable list: no row takes focus or a click. Bound
   * automatically from the field's disabled state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse changes to a selectable list while its rows stay focusable and the
   * value still submits. Mirrored as `aria-readonly` on the listbox. Bound
   * automatically from the field's readonly state when used with `[formField]`.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly liveLocale = inject(WR_LIVE_LOCALE, { optional: true });
  private readonly typeahead = wrTypeahead({ locale: () => this.liveLocale?.() });
  private readonly fieldAria = useFormFieldAria();

  protected readonly labelledBy = this.fieldAria.labelledBy;
  protected readonly describedBy = this.fieldAria.describedBy;
  protected readonly ariaInvalid = this.fieldAria.ariaInvalid;
  protected readonly ariaRequired = this.fieldAria.ariaRequired;

  private readonly items = contentChildren(WrListItem);
  private readonly enabledItems = computed(() =>
    this.disabled() ? [] : this.items().filter(item => !item.disabled())
  );

  /** The row focus was last on. */
  private readonly active = signal<object | null>(null);

  /** The one row in the tab order: the last focused, else the first selected, else the first. */
  private readonly tabStop = computed(() => {
    if (!this.selection()) return null;
    const items = this.enabledItems();
    const active = items.find(item => item === this.active());
    return active ?? items.find(item => this.isSelected(item.value())) ?? items[0] ?? null;
  });

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.bordered()) parts.push('wr-list--bordered');
    if (this.dividers()) parts.push('wr-list--dividers');
    if (this.dense()) parts.push('wr-list--dense');
    if (this.selection()) {
      parts.push('wr-list--selectable');
      if (this.disabled()) parts.push('wr-list--disabled');
      else if (this.readonly()) parts.push('wr-list--readonly');
    }
    return parts.join(' ');
  });

  /**
   * Focus a selectable list: what Signal Forms calls to focus this control. The
   * row holding the tab stop takes it.
   */
  focus(options?: FocusOptions): void {
    this.tabStop()?.focus(options);
  }

  /** @internal */
  isSelected(value: unknown): boolean {
    const current = this.value();
    return this.selection() === 'multiple' ? Array.isArray(current) && current.includes(value) : current === value;
  }

  /** @internal */
  isTabStop(item: object): boolean {
    return this.tabStop() === item;
  }

  /** @internal */
  activate(item: object): void {
    this.active.set(item);
  }

  /** @internal */
  pick(item: object): void {
    const row = this.enabledItems().find(candidate => candidate === item);
    if (!row || !this.selection() || this.readonly()) return;
    const value = row.value();
    if (this.selection() === 'single') {
      if (this.value() !== value) this.value.set(value);
      return;
    }
    const current = this.value();
    const picked: readonly unknown[] = Array.isArray(current) ? current : [];
    this.value.set(picked.includes(value) ? picked.filter(v => v !== value) : [...picked, value]);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.selection()) return;
    const items = this.enabledItems();
    // A key pressed in a control inside a row is that control's.
    const current = items.findIndex(item => item.element === event.target);
    if (current < 0) return;

    const match = this.typeahead.handleKey(
      event,
      items.map(item => item.text()),
      current
    );
    if (match !== null) {
      event.preventDefault();
      if (match >= 0) items[match].focus({ focusVisible: true });
      return;
    }

    let next: number;
    switch (event.key) {
      case WR_KEYS.ARROW_DOWN:
        next = Math.min(current + 1, items.length - 1);
        break;
      case WR_KEYS.ARROW_UP:
        next = Math.max(current - 1, 0);
        break;
      case WR_KEYS.HOME:
        next = 0;
        break;
      case WR_KEYS.END:
        next = items.length - 1;
        break;
      case WR_KEYS.ENTER:
      case WR_KEYS.SPACE:
        event.preventDefault();
        items[current].element.click();
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next !== current) items[next].focus({ focusVisible: true });
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.selection() || this.host.nativeElement.contains(event.relatedTarget as Node | null)) return;
    this.touch.emit();
  }
}

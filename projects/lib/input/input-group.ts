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
  Renderer2,
  ViewEncapsulation,
  afterEveryRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrSpinner } from 'ngwr/spinner';
import { wrCheckStyles } from 'ngwr/utils';

import { WrInput } from './directives';

/**
 * Container for `<input wrInput>` + `[wrInputPrefix]` / `[wrInputSuffix]` /
 * `<wr-password-toggle>` siblings. Renders the border and focus ring; the
 * inner native input drops its own border so it visually melts into the
 * group.
 *
 * Focus styling is driven entirely by `:focus-within`, so any focusable child
 * counts.
 *
 * `clearable` and `loading` draw a clear (×) button and a spinner after the
 * field, before any `[wrInputSuffix]` or `<wr-password-toggle>`. Both act on the
 * first `wrInput` the group wraps.
 *
 * @example
 * ```html
 * <wr-input-group>
 *   <span wrInputPrefix>$</span>
 *   <input wrInput [(ngModel)]="amount" type="number" />
 *   <span wrInputSuffix>USD</span>
 * </wr-input-group>
 *
 * <!-- a search box: a clear button, and a spinner while the lookup runs -->
 * <wr-input-group clearable [loading]="pending()">
 *   <input wrInput [(ngModel)]="query" placeholder="Search" />
 * </wr-input-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/input
 */
@Component({
  selector: 'wr-input-group',
  templateUrl: './input-group.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-input-group', '[class]': 'classes()', '(input)': 'syncClear()' },
  imports: [WrSpinner],
})
export class WrInputGroup {
  private readonly renderer = inject(Renderer2);

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('input');

    // A native field's value is not a signal, and a model write (`ngModel`,
    // `[formField]`, a bound `[value]`) reaches it with no event. So the field
    // is read after every render, and on its own `input` events in between.
    afterEveryRender({ read: () => this.syncClear() });

    effect(() => {
      const field = this.field()?.nativeElement;
      if (!field) return;
      if (this.loading()) this.renderer.setAttribute(field, 'aria-busy', 'true');
      else this.renderer.removeAttribute(field, 'aria-busy');
    });
  }

  /** Pill-shaped corners. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Show a clear (×) button while the field holds text and is neither disabled
   * nor read-only. Clearing empties the field through an `input` event, so
   * whatever is bound to it (`ngModel`, `[formField]`, an `(input)` listener)
   * hears it as an edit, and puts focus back in the field. It is a pointer
   * control: from the keyboard, emptying the field clears it. @default false
   */
  readonly clearable = input(false, { transform: coerceBooleanProperty });

  /** Clear (×) button aria-label. Falls back to `common.clear`. */
  readonly clearLabel = input<string | null>(null);

  /**
   * Show a spinner after the field and mark the field `aria-busy`. The field
   * stays editable. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /** Emitted after the clear (×) button emptied the field. */
  readonly cleared = output<void>();

  protected readonly resolvedClear = useI18nText(this.clearLabel, 'common.clear', 'Clear');

  private readonly field = contentChild<WrInput, ElementRef<HTMLInputElement | HTMLTextAreaElement>>(WrInput, {
    read: ElementRef,
  });

  /** Whether the field has text a user could clear right now. */
  private readonly fieldClearable = signal(false);

  protected readonly clearShown = computed(() => this.clearable() && this.fieldClearable());

  protected syncClear(): void {
    if (!this.clearable()) return;
    const field = this.field()?.nativeElement;
    this.fieldClearable.set(!!field && field.value !== '' && !field.disabled && !field.readOnly);
  }

  protected clear(): void {
    const field = this.field()?.nativeElement;
    if (!field || field.disabled || field.readOnly) return;
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
    this.cleared.emit();
  }

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.rounded()) parts.push('wr-input-group--rounded');
    return parts.join(' ');
  });
}

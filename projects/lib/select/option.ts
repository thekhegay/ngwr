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
  type Signal,
  ViewEncapsulation,
  afterEveryRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { WR_SELECT } from './tokens';

let uid = 0;

/**
 * Single option inside a `<wr-select>`.
 *
 * The option's display label is taken from its projected text content;
 * the form value is its `value` input.
 *
 * @example
 * ```html
 * <wr-option value="sm">Small</wr-option>
 * <wr-option [value]="42">Forty-two</wr-option>
 * ```
 */
@Component({
  selector: 'wr-option',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'option',
    '[attr.id]': 'id',
    '[class]': 'classes()',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(click)': 'onClick()',
  },
})
export class WrOption {
  /** The value contributed when this option is chosen. Required. */
  readonly value = input.required<unknown>();

  /** Disable this option. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Stable id used for `aria-activedescendant`. */
  readonly id = `wr-option-${++uid}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly parent = inject(WR_SELECT, { optional: true });

  /**
   * The option's own text, as a signal — the parent's trigger label and the
   * client-side filter both read it from here.
   *
   * It has to be a signal, and a plain `textContent` read cannot be one. The
   * label is PROJECTED content: the host template decides it, and the ordinary
   * way it changes is that a `WrI18n` catalog lands a microtask after the first
   * change-detection pass (`i18n/i18n.ts` writes every loader-backed catalog
   * from `firstValueFrom(...).then(...)`). Read once and cached, a trigger sat
   * on the English fallback while the open panel beside it showed the
   * translation — visible in `wr-pagination`'s size changer, which prints
   * `pagination.perPage` into each `<wr-option>`.
   *
   * Kept in step the way `wr-divider` keeps its own projected label: an
   * `effect` and an `afterEveryRender`, and both are needed. The render hook is
   * a hard no-op under SSR, so on its own the server would emit a trigger with
   * no label at all; the effect is not gated that way and runs after the
   * content has been projected. The effect on its own cannot follow text that
   * moves later, because it reads nothing reactive to be re-run by.
   *
   * @internal
   */
  private readonly labelText = signal('');
  private readonly label: Signal<string> = this.labelText.asReadonly();

  /**
   * @internal — true when this option is currently selected. Works for
   * both single and multi-select parents via `WrSelectContext.isSelected`.
   */
  protected readonly selected = computed(() => {
    const parent = this.parent;
    if (!parent) return false;
    // Re-read parent's value signal so the computed recomputes on change.
    parent.value();
    return parent.isSelected(this.value());
  });

  /** @internal — true when this option is the keyboard cursor target. */
  protected readonly active = computed(() => this.parent?.activeOptionId() === this.id);

  /**
   * @internal — searchable selects only. True when the parent has a query that
   * the option's text content does not match (case-insensitive substring).
   * Hidden options stay in the DOM so registration order survives but
   * collapse via CSS.
   */
  protected readonly hidden = computed(() => {
    const parent = this.parent;
    if (!parent?.isSearchable() || !parent.clientFilter()) return false;
    const q = parent.searchQuery().trim().toLowerCase();
    if (!q) return false;
    return !this.label().toLowerCase().includes(q);
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-option'];
    if (this.selected()) parts.push('wr-option--selected');
    if (this.active()) parts.push('wr-option--active');
    if (this.disabled()) parts.push('wr-option--disabled');
    if (this.hidden()) parts.push('wr-option--hidden');
    return parts.join(' ');
  });

  constructor() {
    if (this.parent) {
      const parent = this.parent;
      // Re-register when disabled or value changes so the parent has fresh metadata.
      // The label is seeded here as well, which is the read the server takes.
      effect(onCleanup => {
        this.syncLabel();
        const unreg = parent.registerOption({
          id: this.id,
          value: this.value(),
          disabled: this.disabled(),
          label: this.label,
          host: this.host.nativeElement,
        });
        onCleanup(() => unreg());
      });

      afterEveryRender(() => this.syncLabel());
    }
  }

  /**
   * Read the projected text back off the DOM. Setting the same string again is
   * a signal no-op, so the render hook costs a `textContent` read and nothing
   * else on the passes where nothing moved.
   */
  private syncLabel(): void {
    this.labelText.set(this.host.nativeElement.textContent?.trim() ?? '');
  }

  protected onClick(): void {
    if (this.disabled() || !this.parent) return;
    this.parent.selectOption(this.value());
  }
}

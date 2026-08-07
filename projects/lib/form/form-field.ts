/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';

import { EMPTY, type Subscription } from 'rxjs';

import { WR_FORM_FIELD, type WrFormFieldContext } from './tokens';

let uid = 0;

/**
 * Wraps a label + control + hint + error messages into a single block —
 * the layout primitive every form ends up reinventing.
 *
 * - Auto-binds `label[for]` to the projected control via a generated id
 *   (or use the form-control's `[id]` if you set one).
 * - Reads the projected control's `NgControl` to surface validation
 *   errors only when the control has been touched / submitted.
 * - Optional `[required]` / `[optional]` markers next to the label.
 *
 * @example
 * ```html
 * <wr-form-field label="Email" hint="We'll never share it.">
 *   <input wrInput [formControl]="email" type="email" />
 *   <wr-form-error key="required">Email is required.</wr-form-error>
 *   <wr-form-error key="email">Not a valid email.</wr-form-error>
 * </wr-form-field>
 * ```
 *
 * @see https://ngwr.dev/reference/components/form-field
 */
@Component({
  selector: 'wr-form-field',
  templateUrl: './form-field.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: WR_FORM_FIELD,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrFormField),
    },
  ],
})
export class WrFormField implements WrFormFieldContext {
  /** Label text shown above the control. */
  readonly label = input<string>('');

  /** Hint text shown below the control. Hidden when an error is visible. */
  readonly hint = input<string>('');

  /** Show a `*` next to the label. @default false */
  readonly required = input(false, { transform: coerceBooleanProperty });

  /** Show `(optional)` next to the label. Mutually exclusive with `required`. @default false */
  readonly optional = input(false, { transform: coerceBooleanProperty });

  /**
   * Force a specific id on the label's `for` attribute. Auto-generated
   * otherwise, and adopted by the projected `wrInput` unless that element
   * already carries an `id` of its own.
   */
  readonly controlId = input<string>(`wr-form-field-${++uid}`);

  /**
   * Projected `NgControl` — used to read touched / dirty / errors.
   *
   * This catches `[formField]` too: Angular's Signal Forms directive provides
   * `NgControl` via its interop shim, so both forms flavours land here.
   */
  protected readonly ngControl = contentChild(NgControl);

  /**
   * Bumped on every event the projected control emits.
   *
   * `AbstractControl`'s `touched` / `dirty` / `errors` accessors are NOT
   * reactive under classic forms — Angular reads them inside `untracked()`, and
   * `errors` is a plain assigned field. A `computed` over them therefore caches
   * its first value and never recomputes, which in a zoneless app means the
   * error block never appears at all. `control.events` is the reactive source
   * Angular does expose, so the computed depends on this counter instead.
   * Signal Forms needs none of this — its interop getters read live signals —
   * and harmlessly contributes no events.
   */
  private readonly revision = signal(0);

  constructor() {
    let sub: Subscription | null = null;
    effect(() => {
      const control = this.ngControl()?.control;
      sub?.unsubscribe();
      sub = (control?.events ?? EMPTY).subscribe(() => this.revision.update(n => n + 1));
    });
    inject(DestroyRef).onDestroy(() => sub?.unsubscribe());
  }

  protected readonly errors = computed(() => {
    this.revision();
    const c = this.ngControl();
    if (!c) return null;
    if (!c.touched && !c.dirty) return null;
    return c.errors;
  });

  protected readonly hasError = computed(() => {
    const errs = this.errors();
    return !!errs && Object.keys(errs).length > 0;
  });

  /** @internal Read by the projected `<wr-form-error>` children to decide which of them renders. */
  readonly errorKeys = computed<readonly string[]>(() => Object.keys(this.errors() ?? {}));

  /** @internal Read by the projected control so a screen reader is pointed at the message. */
  readonly describedBy = computed(() => (this.hasError() ? `${this.controlId()}-errors` : null));

  protected readonly classes = computed(() => {
    const parts = ['wr-form-field'];
    if (this.hasError()) parts.push('wr-form-field--invalid');
    if (this.required()) parts.push('wr-form-field--required');
    return parts.join(' ');
  });
}

/**
 * One error message tied to a validator key. Renders only when the parent
 * form-field has a matching error in `control.errors`, and only once the
 * control is touched or dirty.
 *
 * @example
 * ```html
 * <wr-form-error key="required">This field is required.</wr-form-error>
 * <wr-form-error key="email">That doesn't look right.</wr-form-error>
 * ```
 */
@Component({
  selector: 'wr-form-error',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-form-error wr-form-field__error',
    role: 'alert',
    '[attr.data-key]': 'key() ?? null',
    '[class.wr-form-field__error--hidden]': '!visible()',
  },
})
export class WrFormError {
  /**
   * Validator key this message corresponds to (e.g. `'required'`).
   * Optional — without a key the message always renders, which is the
   * plain inline-error usage inside `<wr-form-item>`.
   */
  readonly key = input<string>();

  private readonly field = inject(WR_FORM_FIELD, { optional: true });

  /**
   * Whether this message is the one the current error calls for.
   *
   * The parent projects every `<wr-form-error>` through a single
   * `<ng-content select>`, which cannot filter — so each message decides for
   * itself. Without this, one invalid control rendered "Email is required."
   * and "That isn't a valid email." side by side, which is what the docs have
   * always described as gated behaviour.
   *
   * A keyless message always shows: that is the plain inline-error usage inside
   * `<wr-form-item>`, which has no error discovery at all.
   */
  protected readonly visible = computed(() => {
    const key = this.key();
    if (!key || !this.field) return true;
    return this.field.errorKeys().includes(key);
  });
}

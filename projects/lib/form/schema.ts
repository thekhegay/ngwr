/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { createMetadataKey } from '@angular/forms/signals';

/**
 * How a field is DRAWN, attached to the same Signal Forms schema that already
 * says how it is validated.
 *
 * The alternative was a second schema — one for rules, one for presentation —
 * and it was rejected before it was written: two descriptions of one form drift
 * the moment someone renames a field in one of them, and nothing would report
 * it. Angular's `metadata()` takes a typed key and a `LogicFn`, so the
 * presentation rides on the schema the validators are already in, and it is
 * REACTIVE for free: a label, a set of options or a placeholder may depend on
 * the value of another field.
 *
 * What this deliberately does NOT carry: `required`, `disabled`, `readonly`,
 * `hidden`, `min`, `max`, and every validation rule. Those are Angular's own
 * schema functions, they already drive the control through `[formField]`, and
 * duplicating them here would create a second source of truth for state the form
 * already owns. That is not only a judgement call — Angular REFUSES a `[min]` or
 * `[required]` binding on a field-bound control (NG8022), so the second source
 * of truth is a compile error rather than a drift.
 */
export type WrFieldKind =
  'input' | 'textarea' | 'number' | 'select' | 'checkbox' | 'switch' | 'radio' | 'date' | 'slider';

/** One choice, for the kinds that offer a list. */
export interface WrFieldOption {
  readonly value: unknown;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * The presentation of one field.
 *
 * `kind` is the only required member: everything else has a sane default, and a
 * schema that says no more than `{ kind: 'input' }` still renders a labelled,
 * error-bound control — the label falls back to the field's own name.
 */
export interface WrFieldSpec {
  readonly kind: WrFieldKind;
  /** Defaults to the field's key, de-camel-cased — `workEmail` becomes "Work email". */
  readonly label?: string;
  readonly placeholder?: string;
  /** Help text under the control. Errors replace it while the field is invalid. */
  readonly hint?: string;
  /** For `select` and `radio`. Ignored by every other kind. */
  readonly options?: readonly WrFieldOption[];
  /** Native `type` for `kind: 'input'` — `email`, `password`, `url`, `tel`. */
  readonly type?: string;
  /**
   * Granularity for `number` and `slider`. The BOUNDS are deliberately absent:
   * Angular refuses a `[min]` or `[max]` binding on a `[formField]`-bound
   * control outright (NG8022), because the field owns them — write `min(path.x,
   * 18)` in the schema and the control picks it up. `step` is presentation, has
   * no schema function, and stays here.
   */
  readonly step?: number;
  /**
   * Columns this field spans in `<wr-schema-form>`'s grid. Clamped to the form's
   * own `columns`, and 1 by default — a field is one cell unless it asks to be
   * wider.
   */
  readonly span?: number;
}

/**
 * The metadata key `<wr-schema-form>` reads.
 *
 * ```ts
 * const userSchema = schema<User>(path => {
 *   required(path.email);
 *   email(path.email);
 *   metadata(path.email, WR_FIELD, () => ({ kind: 'input', type: 'email', label: 'Work email' }));
 *   metadata(path.role, WR_FIELD, () => ({ kind: 'select', options: ROLES }));
 * });
 * ```
 *
 * A field with no `WR_FIELD` metadata is not an error and is not guessed at —
 * `<wr-schema-form>` skips it, so a schema can describe more than one screen shows.
 */
export const WR_FIELD = createMetadataKey<WrFieldSpec>();

/** `workEmail` -> `Work email`. The fallback label, and only ever a fallback. */
export function wrFieldLabel(key: string): string {
  const spaced = key.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { createMetadataKey } from '@angular/forms/signals';

import type { WrColor } from 'ngwr/theme';

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
 * `hidden`, and every validation rule. Those are Angular's own schema functions,
 * they already drive the control through `[field]`, and duplicating them here
 * would create a second source of truth for state the form already owns.
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
  /** For `number` and `slider`. */
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Intent colour, where the control takes one. */
  readonly color?: WrColor;
  /**
   * Columns this field spans in `<wr-form>`'s grid, 1–12. Defaults to the full
   * width the form was configured with.
   */
  readonly span?: number;
}

/**
 * The metadata key `<wr-form>` reads.
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
 * `<wr-form>` skips it, so a schema can describe more than one screen shows.
 */
export const WR_FIELD = createMetadataKey<WrFieldSpec>();

/** `workEmail` -> `Work email`. The fallback label, and only ever a fallback. */
export function wrFieldLabel(key: string): string {
  const spaced = key.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

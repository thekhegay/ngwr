/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrFieldKind } from 'ngwr/form';

/** Narrows which `<wr-schema-form>` a harness query matches. */
export interface WrSchemaFormHarnessFilters extends BaseHarnessFilters {
  /** Match a form that draws a field with this label: a string is an exact match, a RegExp is tested. */
  readonly fieldLabel?: string | RegExp;
}

/** Narrows which field of a `<wr-schema-form>` a harness query matches. */
export interface WrSchemaFormFieldHarnessFilters extends BaseHarnessFilters {
  /** Match the field's label: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match the kind of control the field draws. */
  readonly kind?: WrFieldKind;
  /** Match only fields showing an error (`true`) or only fields showing none (`false`). */
  readonly invalid?: boolean;
}

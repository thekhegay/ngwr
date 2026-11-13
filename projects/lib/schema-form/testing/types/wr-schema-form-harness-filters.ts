/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrSchemaFormControlKind } from './wr-schema-form-control-harness';

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
  readonly kind?: WrSchemaFormControlKind;
  /** Match only fields showing an error (`true`) or only fields showing none (`false`). */
  readonly invalid?: boolean;
}

/** Narrows which section of a `<wr-schema-form>` a harness query matches. */
export interface WrSchemaFormSectionHarnessFilters extends BaseHarnessFilters {
  /** Match the section's title: a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
}

/** Narrows which repeating group of a `<wr-schema-form>` a harness query matches. */
export interface WrSchemaFormArrayHarnessFilters extends BaseHarnessFilters {
  /** Match the group's label: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
}

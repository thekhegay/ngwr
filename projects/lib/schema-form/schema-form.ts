/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input, isDevMode } from '@angular/core';
import { FormField, type Field, type FieldTree, isFieldTree } from '@angular/forms/signals';

import { WrCheckbox } from 'ngwr/checkbox';
import { WrDatePicker } from 'ngwr/date-picker';
import { WR_FIELD, WrFormField, wrFieldLabel, type WrFieldSpec } from 'ngwr/form';
import { WrInput } from 'ngwr/input';
import { WrInputNumber } from 'ngwr/input-number';
import { WrRadio, WrRadioGroup } from 'ngwr/radio';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrSlider } from 'ngwr/slider';
import { WrSwitch } from 'ngwr/switch';
import { WrTextarea } from 'ngwr/textarea';
import { numAttr } from 'ngwr/utils';

/** One field the template draws, resolved once per schema change. */
interface WrRenderedField {
  readonly key: string;
  readonly field: Field<never>;
  readonly spec: WrFieldSpec;
  /** `spec.label`, or the key de-camel-cased. */
  readonly label: string;
  /**
   * The same text, or `''` for the two kinds that carry their own label inside
   * the control. Resolved here rather than in the template: a method call in a
   * template is re-run on every pass, and this is decided once per schema.
   */
  readonly labelAbove: string;
  /** `grid-column`, already clamped to the form's own `columns`. */
  readonly column: string;
}

/**
 * The two kinds that carry their own label. Everything else gets one above the
 * control, from `<wr-form-field>`.
 */
const SELF_LABELLING = new Set<WrFieldSpec['kind']>(['checkbox', 'switch']);

/** What each kind writes into the model, for the dev-mode mismatch warning. */
const EXPECTED_TYPE: Partial<Record<WrFieldSpec['kind'], string>> = {
  input: 'string',
  textarea: 'string',
  number: 'number',
  checkbox: 'boolean',
  switch: 'boolean',
  slider: 'number',
};

/**
 * Warn when a `kind` contradicts what the field actually holds.
 *
 * This is the one failure mode of the whole component that nothing else
 * reports: `kind` is a string on a metadata value, so TypeScript cannot hold it
 * against the field's own type, and a `kind: 'number'` on a `string` field
 * renders a `<wr-input-number>` that writes numbers into it forever. The runtime
 * value is the only evidence available, so an empty or nullish one says nothing
 * and is left alone.
 */
function warnOnKindMismatch(f: WrRenderedField): void {
  const expected = EXPECTED_TYPE[f.spec.kind];
  const value = f.field().value();
  if (!expected || value === null || value === undefined || value === '') return;
  if (typeof value === expected) return;

  // eslint-disable-next-line no-console -- dev-mode validation
  console.warn(
    `[NGWR] <wr-schema-form>: field "${f.key}" is described as kind '${f.spec.kind}', ` +
      `which writes a ${expected}, but the field holds a ${typeof value}. ` +
      `The control will overwrite the model with the wrong type.`
  );
}

/**
 * A form drawn from a Signal Forms schema — one `<wr-form-field>`, one control
 * and one set of error messages per described field, laid out on a grid.
 *
 * The presentation rides on the SAME schema as the validation, through the
 * `WR_FIELD` metadata key from `ngwr/form`:
 *
 * ```ts
 * const profile = form(model, path => {
 *   required(path.email);
 *   email(path.email);
 *   metadata(path.email, WR_FIELD, () => ({ kind: 'input', type: 'email' }));
 *   metadata(path.role, WR_FIELD, () => ({ kind: 'select', options: ROLES }));
 * });
 * ```
 * ```html
 * <wr-schema-form [field]="profile" [columns]="2" />
 * ```
 *
 * **A field with no `WR_FIELD` metadata is skipped**, silently and on purpose: a
 * schema may describe more than one screen renders, and guessing a control from
 * a field's type would draw a `wr-switch` for every boolean flag in the model.
 * Order is the model's own key order.
 *
 * **`required`, `disabled`, `readonly` and `hidden` are NOT in the spec.** They
 * are Angular's own schema functions, `[formField]` already applies the first
 * three to the control, and this component reads `hidden()` to decide whether to
 * draw the field at all — which Angular's docs say a template has to do itself.
 * Re-declaring any of them here would be a second source of truth for state the
 * form already owns.
 *
 * **Why its own entry point rather than `ngwr/form`.** Drawing nine kinds means
 * depending on nine controls, and `ngwr/form` is the layout primitive every
 * form imports — folding this in would put a date picker and a slider into the
 * bundle of an app that only wanted `<wr-form-field>`.
 *
 * @see https://ngwr.dev/reference/components/schema-form
 */
@Component({
  selector: 'wr-schema-form',
  templateUrl: './schema-form.html',
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormField,
    WrCheckbox,
    WrDatePicker,
    WrFormField,
    WrInput,
    WrInputNumber,
    WrOption,
    WrRadio,
    WrRadioGroup,
    WrSelect,
    WrSlider,
    WrSwitch,
    WrTextarea,
  ],
  host: {
    class: 'wr-schema-form',
    '[style.grid-template-columns]': 'template()',
  },
})
export class WrSchemaForm<T extends object> {
  // Generic, rather than `FieldTree<Record<string, unknown>>`, because a model
  // declared as an `interface` has no index signature and is not assignable to
  // that: every consumer would have had to declare their model as a type alias
  // just to bind it. `T extends object` still refuses a field tree over a
  // primitive, which has no subfields and would draw nothing.
  /**
   * The form to draw — the value `form()` returned, or any object-valued field
   * inside one.
   */
  readonly field = input.required<FieldTree<T>>();

  /**
   * Grid columns. A field spans one of them unless its spec says otherwise.
   * @default 1
   */
  readonly columns = input(1, { transform: numAttr(1) });

  /**
   * The track list, written as a style rather than published as a
   * `--wr-schema-form-columns` hook: `columns` always has a value, so the
   * inline style would win over any declaration a consumer wrote and the hook
   * would be one nobody could use.
   */
  protected readonly template = computed(() => `repeat(${Math.max(1, this.columns())}, minmax(0, 1fr))`);

  /**
   * The described fields, in the model's key order.
   *
   * A field tree over an object is iterable as `[key, field]` pairs, which is
   * the whole reason this component needs no field list of its own. `isFieldTree`
   * guards the pair: a model carrying a method or a non-field property would
   * otherwise be read as a field and answer `undefined` to everything.
   */
  protected readonly fields = computed<readonly WrRenderedField[]>(() => {
    const columns = this.columns();
    const out: WrRenderedField[] = [];

    for (const [key, child] of this.field() as unknown as Iterable<[string, unknown]>) {
      if (!isFieldTree(child)) continue;

      const field = child as Field<never>;
      const spec = field().metadata(WR_FIELD)?.();
      if (!spec) continue;

      const label = spec.label ?? wrFieldLabel(key);
      const span = Math.min(Math.max(Math.round(spec.span ?? 1), 1), columns);
      out.push({
        key,
        field,
        spec,
        label,
        labelAbove: SELF_LABELLING.has(spec.kind) ? '' : label,
        column: `span ${span}`,
      });
    }

    if (isDevMode()) out.forEach(f => warnOnKindMismatch(f));
    return out;
  });
}

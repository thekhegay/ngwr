/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  Injector,
  type Signal,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { FormField, type Field, type FieldState, type FieldTree, isFieldTree } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrDatePicker, WrDateRangePicker } from 'ngwr/date-picker';
import { WrFileUpload } from 'ngwr/file-upload';
import { WR_FIELD, WrFormField, wrFieldLabel, type WrFieldSpec } from 'ngwr/form';
import { useI18nText } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';
import { WrInputNumber } from 'ngwr/input-number';
import { WrRadio, WrRadioGroup } from 'ngwr/radio';
import { WrRating } from 'ngwr/rating';
import { WrSegmented } from 'ngwr/segmented';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrSlider } from 'ngwr/slider';
import { WrSwitch } from 'ngwr/switch';
import { WrTextarea } from 'ngwr/textarea';
import { wrNumAttr, wrCheckStyles } from 'ngwr/utils';

import { WrSchemaFormArrayState } from './array-state';

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
  /** `grid-column`, already clamped to the columns of the grid the field sits on. */
  readonly column: string;
  /** DOM id prefix for the parts of an `array` field. */
  readonly id: string;
  /** The item fields of an `array`, in order. Empty for every other kind. */
  readonly items: Signal<readonly FieldTree<object>[]>;
}

/** A run of fields drawn inside one `<fieldset>`. */
interface WrRenderedSection {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** `grid-template-columns` of the section's own grid. */
  readonly template: string;
  readonly fields: WrRenderedField[];
  /** False while the schema hides every field in it: an empty fieldset announces a group of nothing. */
  readonly visible: Signal<boolean>;
}

/** One child of the form's grid: a field, or a section holding several. */
interface WrRenderedCell {
  readonly key: string;
  readonly field?: WrRenderedField;
  readonly section?: WrRenderedSection;
}

const NO_ITEMS: Signal<readonly FieldTree<object>[]> = computed(() => []);

let uid = 0;

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
  multiselect: 'array',
  tags: 'array',
  checkbox: 'boolean',
  switch: 'boolean',
  slider: 'number',
  rating: 'number',
  array: 'array',
};

/** `typeof`, with the one distinction it does not make and three kinds depend on. */
function typeOf(value: unknown): string {
  return Array.isArray(value) ? 'array' : typeof value;
}

/** The track list of a grid of `columns` equal columns. */
function tracks(columns: number): string {
  return `repeat(${Math.max(1, Math.round(columns))}, minmax(0, 1fr))`;
}

/**
 * The first field of a group a keyboard can land on: described, not hidden and
 * not disabled, in the model's key order. A nested `array` is passed over, since
 * it has no control of its own to focus.
 */
function firstControl(group: FieldTree<object>): Field<never> | null {
  for (const [, child] of group as unknown as Iterable<[string, unknown]>) {
    if (!isFieldTree(child)) continue;
    const state = (child as Field<never>)();
    const spec = state.metadata(WR_FIELD)?.();
    if (spec && spec.kind !== 'array' && !state.hidden() && !state.disabled()) return child as Field<never>;
  }
  return null;
}

/**
 * Warn when a group's described fields are about to be drawn by nothing.
 *
 * A field tree is iterated one level deep, so an object-valued field with no
 * `WR_FIELD` of its own is skipped exactly like an undescribed leaf — and its
 * children go with it. That is the right default (a model nests for reasons
 * that have nothing to do with a screen), but it is indistinguishable from a
 * half-drawn form: nothing is missing from the DOM, so nothing looks wrong.
 *
 * Describing the children and getting none of them is never intentional, so
 * that exact shape is what this reports. A group whose children carry no spec
 * either is silent, because it is a model detail this screen does not render.
 */
function warnOnUndrawnGroup(key: string, group: unknown): void {
  // A field tree over a primitive is not iterable, and every undescribed leaf
  // arrives here — so the guard is what keeps this from throwing on the common
  // case rather than a defence against an exotic one.
  const subfields = (group as Partial<Iterable<[string, unknown]>>)[Symbol.iterator];
  if (typeof subfields !== 'function') return;
  // An array iterates its items, not `[key, field]` pairs.
  if (Array.isArray((group as Field<never>)().value())) return;

  let described = 0;
  for (const [, child] of group as Iterable<[string, unknown]>) {
    if (isFieldTree(child) && (child as Field<never>)().metadata(WR_FIELD)?.()) described++;
  }
  if (described === 0) return;

  // eslint-disable-next-line no-console -- dev-mode validation
  console.warn(
    `[NGWR] <wr-schema-form>: "${key}" is a group holding ${described} described ` +
      `field(s), and none of them are drawn — a field tree is walked one level deep. ` +
      `Draw the group with a second <wr-schema-form [field]="form.${key}" />, or give ` +
      `"${key}" a WR_FIELD of its own if this screen is meant to skip it.`
  );
}

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
  if (typeOf(value) === expected) return;

  // eslint-disable-next-line no-console -- dev-mode validation
  console.warn(
    `[NGWR] <wr-schema-form>: field "${f.key}" is described as kind '${f.spec.kind}', ` +
      `which writes a ${expected}, but the field holds a ${typeOf(value)}. ` +
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
 *   required(path.email, { message: 'Enter your email.' });
 *   email(path.email, { message: 'That is not an email address.' });
 *   metadata(path.email, WR_FIELD, () => ({ kind: 'input', type: 'email' }));
 *   metadata(path.role, WR_FIELD, () => ({ kind: 'select', options: ROLES }));
 * });
 * ```
 * ```html
 * <wr-schema-form [field]="profile" [columns]="2" />
 * ```
 *
 * The error messages are the rules' own: each field's `<wr-form-field>` shows a
 * validator's `message`, else `validation.<key>` from the app's i18n catalog.
 * ngwr ships no error texts, so a rule with neither renders no message.
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
 * **A section is a spec key, a repeating group is a kind.** Fields naming the
 * same `section` are drawn in one `<fieldset>` under its title. A field of
 * `kind: 'array'` over an array of objects draws one group per item, each a
 * `<wr-schema-form>` of its own, so the items' fields are described once with
 * `applyEach`. Add and Remove write the array, and `minLength` and `maxLength`
 * on it are the bounds they stop at.
 *
 * **Why its own entry point rather than `ngwr/form`.** Drawing every kind means
 * depending on every control, and `ngwr/form` is the layout primitive every
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
    NgTemplateOutlet,
    WrButton,
    WrCheckbox,
    WrDatePicker,
    WrDateRangePicker,
    WrFileUpload,
    WrFormField,
    WrInput,
    WrInputNumber,
    WrOption,
    WrRadio,
    WrRadioGroup,
    WrRating,
    WrSchemaFormArrayState,
    WrSegmented,
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
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('schema-form');
  }

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
  readonly columns = input(1, { transform: wrNumAttr(1) });

  /** Text of the button that adds an item to a repeating group. Falls back to `common.add`. */
  readonly addLabel = input<string | null>(null);

  /** Text of the button that removes one item of a repeating group. Falls back to `common.remove`. */
  readonly removeLabel = input<string | null>(null);

  protected readonly resolvedAdd = useI18nText(this.addLabel, 'common.add', 'Add');
  protected readonly resolvedRemove = useI18nText(this.removeLabel, 'common.remove', 'Remove');

  private readonly injector = inject(Injector);
  private readonly uid = `wr-schema-form-${++uid}`;

  /**
   * The track list, written as a style rather than published as a
   * `--wr-schema-form-columns` hook: `columns` always has a value, so the
   * inline style would win over any declaration a consumer wrote and the hook
   * would be one nobody could use.
   */
  protected readonly template = computed(() => tracks(this.columns()));

  /**
   * The described fields, in the model's key order, with the fields of a
   * section gathered where its first field stands.
   *
   * A field tree over an object is iterable as `[key, field]` pairs, which is
   * the whole reason this component needs no field list of its own. `isFieldTree`
   * guards the pair: a model carrying a method or a non-field property would
   * otherwise be read as a field and answer `undefined` to everything.
   */
  protected readonly cells = computed<readonly WrRenderedCell[]>(() => {
    const columns = this.columns();
    const described: { key: string; field: Field<never>; spec: WrFieldSpec; title: string | null }[] = [];
    // What each section says about itself: the first field to state a member wins.
    const stated = new Map<string, { description?: string; columns?: number }>();

    for (const [key, child] of this.field() as unknown as Iterable<[string, unknown]>) {
      if (!isFieldTree(child)) continue;

      const field = child as Field<never>;
      const spec = field().metadata(WR_FIELD)?.();
      if (!spec) {
        if (isDevMode()) warnOnUndrawnGroup(key, child);
        continue;
      }

      const section = typeof spec.section === 'string' ? { title: spec.section } : spec.section;
      if (section) {
        const known = stated.get(section.title) ?? {};
        stated.set(section.title, {
          description: known.description ?? section.description,
          columns: known.columns ?? section.columns,
        });
      }
      described.push({ key, field, spec, title: section?.title ?? null });
    }

    const out: WrRenderedCell[] = [];
    const sections = new Map<string, WrRenderedSection>();
    const all: WrRenderedField[] = [];

    for (const { key, field, spec, title } of described) {
      const grid = title === null ? columns : Math.max(1, Math.round(stated.get(title)?.columns ?? columns));
      const label = spec.label ?? wrFieldLabel(key);
      const span = Math.min(Math.max(Math.round(spec.span ?? 1), 1), grid);
      const rendered: WrRenderedField = {
        key,
        field,
        spec,
        label,
        labelAbove: SELF_LABELLING.has(spec.kind) ? '' : label,
        column: `span ${span}`,
        id: `${this.uid}-${key}`,
        items:
          spec.kind === 'array'
            ? computed(() => {
                const value: unknown = field().value();
                const list = field as unknown as ArrayLike<FieldTree<object>>;
                return Array.isArray(value) ? value.map((_, index) => list[index]) : [];
              })
            : NO_ITEMS,
      };
      all.push(rendered);

      if (title === null) {
        out.push({ key, field: rendered });
        continue;
      }

      let section = sections.get(title);
      if (!section) {
        const fields: WrRenderedField[] = [];
        section = {
          id: `${this.uid}-section-${sections.size}`,
          title,
          description: stated.get(title)?.description ?? '',
          template: tracks(grid),
          fields,
          visible: computed(() => fields.some(each => !each.field().hidden())),
        };
        sections.set(title, section);
        out.push({ key: `section:${title}`, section });
      }
      section.fields.push(rendered);
    }

    if (isDevMode()) all.forEach(f => warnOnKindMismatch(f));
    return out;
  });

  /** Types the context of the cell template, which an outlet hands over untyped. */
  protected rendered(field: unknown): WrRenderedField {
    return field as WrRenderedField;
  }

  /** Whether a repeating group may take one more item: not past `maxLength`, and not disabled or read-only. */
  protected canAdd(f: WrRenderedField): boolean {
    const state = f.field();
    return !state.disabled() && !state.readonly() && f.items().length < (state.maxLength?.() ?? Infinity);
  }

  /** Whether a repeating group may lose an item: not under `minLength`, and not disabled or read-only. */
  protected canRemove(f: WrRenderedField): boolean {
    const state = f.field();
    return !state.disabled() && !state.readonly() && f.items().length > (state.minLength?.() ?? 0);
  }

  /**
   * What describes a repeating group: its own errors while it shows any, else
   * its hint. The ids are the ones `<wr-form-field>` derives from `controlId`,
   * and the condition is the one it shows errors on, so the reference never
   * names an element that is not drawn.
   */
  protected describedBy(f: WrRenderedField): string | null {
    const state = f.field();
    if ((state.touched() || state.dirty()) && state.errors().length) return `${f.id}-errors`;
    return f.spec.hint ? `${f.id}-hint` : null;
  }

  /** Append a new item and move focus into it. */
  protected add(f: WrRenderedField): void {
    const make = f.spec.item;
    if (!make || !this.canAdd(f)) return;

    const index = f.items().length;
    this.write(f, list => [...list, make()]);
    afterNextRender(() => this.focusItem(f, index), { injector: this.injector });
  }

  /**
   * Remove one item. Focus goes to the item that took its place, and from the
   * last one to the Add button, so it never falls back to the page.
   */
  protected remove(f: WrRenderedField, index: number, list: HTMLElement): void {
    if (!this.canRemove(f)) return;

    this.write(f, items => items.filter((_, each) => each !== index));
    afterNextRender(
      () => {
        const length = f.items().length;
        if (index < length) return this.focusItem(f, index);
        const add = list.querySelector<HTMLElement>(':scope > .wr-schema-form__add:not([disabled])');
        if (add) add.focus();
        else if (length) this.focusItem(f, length - 1);
      },
      { injector: this.injector }
    );
  }

  private write(f: WrRenderedField, change: (items: readonly unknown[]) => readonly unknown[]): void {
    const state = f.field() as unknown as FieldState<readonly unknown[]>;
    state.value.update(change);
    state.markAsDirty();
    // The array alone: a new item's fields are not touched because the list was.
    state.markAsTouched({ skipDescendants: true });
  }

  private focusItem(f: WrRenderedField, index: number): void {
    const item = f.items()[index];
    if (item) firstControl(item)?.().focusBoundControl();
  }
}

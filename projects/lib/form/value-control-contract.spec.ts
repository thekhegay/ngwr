import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, readonly, requiredError, validate } from '@angular/forms/signals';

import { WrCascader, type WrCascaderOption } from 'ngwr/cascader';
import { WrCheckbox, WrCheckboxGroup } from 'ngwr/checkbox';
import { WrColorPicker } from 'ngwr/color-picker';
import { provideWrDateAdapter } from 'ngwr/date';
import { WrDatePicker, WrDateRangePicker, type WrDateRange } from 'ngwr/date-picker';
import { WrFileUpload } from 'ngwr/file-upload';
import { WrInputNumber } from 'ngwr/input-number';
import { WrInputOtp } from 'ngwr/input-otp';
import { WrKnob } from 'ngwr/knob';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrRadio, WrRadioGroup } from 'ngwr/radio';
import { WrRating } from 'ngwr/rating';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrSlider, type WrSliderValue } from 'ngwr/slider';
import { WrSwitch } from 'ngwr/switch';
import { WrTextarea } from 'ngwr/textarea';
import { WrTransfer, type WrTransferItem } from 'ngwr/transfer';
import { WrTree, type WrTreeNode } from 'ngwr/tree';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFormField } from './form-field';

/**
 * One host holding EVERY value control the library ships, each in its own
 * `<wr-form-field>`, each bound to its own field. Two schema rules ride on all
 * of them at once, both switchable from the host:
 *
 * - `readonly()` — the rule Angular declares OPTIONAL on `FormUiControl`, so the
 *   `Field` directive writes it only to a control that declares the input. A
 *   control that does not simply never hears about it, nothing warns, and the
 *   form reports itself read-only while a plain click still rewrites the model.
 * - a validator that always fails — so the field paints its `role="alert"`
 *   message and the control has something to point at.
 *
 * Both tables below are a CATALOG check rather than a per-component one, and
 * that is the point: the failure mode is a control being forgotten, which a
 * spec living next to one component cannot see.
 */
interface Model {
  cascader: string[];
  checkbox: boolean;
  checkboxGroup: string[];
  colorPicker: string;
  datePicker: Date | null;
  dateRangePicker: WrDateRange | null;
  fileUpload: File | readonly File[] | null;
  inputNumber: number | null;
  inputOtp: string;
  knob: number;
  radioGroup: string | null;
  rating: number | null;
  segmented: string | null;
  select: string | null;
  slider: WrSliderValue;
  switch: boolean;
  textarea: string;
  transfer: string[];
  tree: string | null;
}

@Component({
  imports: [
    FormField,
    WrCascader,
    WrCheckbox,
    WrCheckboxGroup,
    WrColorPicker,
    WrDatePicker,
    WrDateRangePicker,
    WrFileUpload,
    WrFormField,
    WrInputNumber,
    WrInputOtp,
    WrKnob,
    WrOption,
    WrRadio,
    WrRadioGroup,
    WrRating,
    WrSegmented,
    WrSelect,
    WrSlider,
    WrSwitch,
    WrTextarea,
    WrTransfer,
    WrTree,
  ],
  template: `
    <wr-form-field data-k="cascader" label="Cascader">
      <wr-cascader [options]="cascaderOptions" [formField]="f.cascader" />
    </wr-form-field>

    <wr-form-field data-k="checkbox" label="Checkbox">
      <wr-checkbox [formField]="f.checkbox">Agree</wr-checkbox>
    </wr-form-field>

    <wr-form-field data-k="checkbox-group" label="Checkbox group">
      <wr-checkbox-group [formField]="f.checkboxGroup">
        <wr-checkbox checkboxValue="a">A</wr-checkbox>
        <wr-checkbox checkboxValue="b">B</wr-checkbox>
      </wr-checkbox-group>
    </wr-form-field>

    <wr-form-field data-k="color-picker" label="Colour">
      <wr-color-picker [formField]="f.colorPicker" />
    </wr-form-field>

    <wr-form-field data-k="date-picker" label="Date">
      <wr-date-picker [formField]="f.datePicker" />
    </wr-form-field>

    <wr-form-field data-k="date-range-picker" label="Range">
      <wr-date-range-picker [formField]="f.dateRangePicker" />
    </wr-form-field>

    <wr-form-field data-k="file-upload" label="Files">
      <wr-file-upload [formField]="f.fileUpload" />
    </wr-form-field>

    <wr-form-field data-k="input-number" label="Amount">
      <wr-input-number [formField]="f.inputNumber" />
    </wr-form-field>

    <wr-form-field data-k="input-otp" label="Code">
      <wr-input-otp [formField]="f.inputOtp" />
    </wr-form-field>

    <wr-form-field data-k="knob" label="Knob">
      <wr-knob [formField]="f.knob" />
    </wr-form-field>

    <wr-form-field data-k="radio-group" label="Radio group">
      <wr-radio-group [formField]="f.radioGroup">
        <wr-radio value="a">A</wr-radio>
        <wr-radio value="b">B</wr-radio>
      </wr-radio-group>
    </wr-form-field>

    <wr-form-field data-k="rating" label="Rating">
      <wr-rating [formField]="f.rating" />
    </wr-form-field>

    <wr-form-field data-k="segmented" label="Segmented">
      <wr-segmented [options]="segmentedOptions" [formField]="f.segmented" />
    </wr-form-field>

    <wr-form-field data-k="select" label="Select">
      <wr-select [formField]="f.select">
        <wr-option value="a">A</wr-option>
        <wr-option value="b">B</wr-option>
      </wr-select>
    </wr-form-field>

    <wr-form-field data-k="slider" label="Slider">
      <wr-slider [formField]="f.slider" />
    </wr-form-field>

    <wr-form-field data-k="switch" label="Switch">
      <wr-switch [formField]="f.switch">On</wr-switch>
    </wr-form-field>

    <wr-form-field data-k="textarea" label="Notes">
      <wr-textarea [formField]="f.textarea" />
    </wr-form-field>

    <wr-form-field data-k="transfer" label="Transfer">
      <wr-transfer [items]="transferItems" [formField]="f.transfer" />
    </wr-form-field>

    <wr-form-field data-k="tree" label="Tree">
      <wr-tree [nodes]="treeNodes" [formField]="f.tree" />
    </wr-form-field>
  `,
})
class Host {
  readonly cascaderOptions: readonly WrCascaderOption<string>[] = [
    { value: 'a', label: 'A', children: [{ value: 'a1', label: 'A1' }] },
  ];
  readonly segmentedOptions: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];
  readonly transferItems: readonly WrTransferItem[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];
  readonly treeNodes: readonly WrTreeNode<string>[] = [{ id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] }];

  readonly locked = signal(false);
  readonly failing = signal(false);

  readonly model = signal<Model>({
    cascader: [],
    checkbox: false,
    checkboxGroup: [],
    colorPicker: '#336699',
    datePicker: null,
    dateRangePicker: null,
    fileUpload: null,
    inputNumber: null,
    inputOtp: '',
    knob: 0,
    radioGroup: null,
    rating: null,
    segmented: null,
    select: null,
    slider: 0,
    switch: false,
    textarea: '',
    transfer: [],
    tree: null,
  });

  // Spelled out rather than looped: a dynamic `path[key]` widens every leaf to a
  // union and the schema rules stop type-checking, which is exactly the safety
  // that makes this table worth having.
  //
  // The failing rule is a bare `validate()` and NOT `required()`, deliberately:
  // Angular's own `isEmpty` reports `0` and `[]` as present, so a `required()`
  // rule can never fail on a control whose empty state is a number or an array —
  // which is why `checkbox-group`, `knob`, `slider` and `transfer` looked immune
  // to invalidity. That is Angular's semantics, not a property of these
  // controls, and every one of them can still be failed by another validator.
  readonly f = form(this.model, path => {
    const fails = (): ReturnType<typeof requiredError> | undefined => (this.failing() ? requiredError() : undefined);
    const locked = (): boolean => this.locked();

    readonly(path.cascader, locked);
    readonly(path.checkbox, locked);
    readonly(path.checkboxGroup, locked);
    readonly(path.colorPicker, locked);
    readonly(path.datePicker, locked);
    readonly(path.dateRangePicker, locked);
    readonly(path.fileUpload, locked);
    readonly(path.inputNumber, locked);
    readonly(path.inputOtp, locked);
    readonly(path.knob, locked);
    readonly(path.radioGroup, locked);
    readonly(path.rating, locked);
    readonly(path.segmented, locked);
    readonly(path.select, locked);
    readonly(path.slider, locked);
    readonly(path.switch, locked);
    readonly(path.textarea, locked);
    readonly(path.transfer, locked);
    readonly(path.tree, locked);

    validate(path.cascader, fails);
    validate(path.checkbox, fails);
    validate(path.checkboxGroup, fails);
    validate(path.colorPicker, fails);
    validate(path.datePicker, fails);
    validate(path.dateRangePicker, fails);
    validate(path.fileUpload, fails);
    validate(path.inputNumber, fails);
    validate(path.inputOtp, fails);
    validate(path.knob, fails);
    validate(path.radioGroup, fails);
    validate(path.rating, fails);
    validate(path.segmented, fails);
    validate(path.select, fails);
    validate(path.slider, fails);
    validate(path.switch, fails);
    validate(path.textarea, fails);
    validate(path.transfer, fails);
    validate(path.tree, fails);
  });
}

/** How one control reports "read-only" in the DOM, and where its error must land. */
interface Probe {
  /** `data-k` on the wrapping `<wr-form-field>`. */
  readonly key: string;
  /** Element carrying the control's role — where `aria-invalid` belongs. */
  readonly aria: string;
  /** Reads the control's rendered read-only state. */
  readonly isReadonly: (field: HTMLElement) => boolean;
}

const nativeReadonly =
  (selector: string) =>
  (field: HTMLElement): boolean =>
    !!field.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)?.readOnly;

const ariaReadonly =
  (selector: string) =>
  (field: HTMLElement): boolean =>
    field.querySelector(selector)?.getAttribute('aria-readonly') === 'true';

const hasClass =
  (selector: string, klass: string) =>
  (field: HTMLElement): boolean =>
    !!field.querySelector(selector)?.classList.contains(klass);

const PROBES: readonly Probe[] = [
  { key: 'cascader', aria: '.wr-cascader__trigger', isReadonly: ariaReadonly('.wr-cascader__trigger') },
  { key: 'checkbox', aria: 'input.wr-checkbox__input', isReadonly: ariaReadonly('input.wr-checkbox__input') },
  {
    key: 'checkbox-group',
    aria: 'wr-checkbox-group',
    // `role="group"` does not support `aria-readonly`, so the boxes carry it.
    isReadonly: ariaReadonly('input.wr-checkbox__input'),
  },
  {
    key: 'color-picker',
    aria: '.wr-color-picker__sv',
    isReadonly: ariaReadonly('.wr-color-picker__slider--hue'),
  },
  { key: 'date-picker', aria: 'input.wr-input', isReadonly: nativeReadonly('input.wr-input') },
  { key: 'date-range-picker', aria: 'input.wr-input', isReadonly: nativeReadonly('input.wr-input') },
  {
    key: 'file-upload',
    aria: '.wr-file-upload__zone',
    // A `role="button"` has no `aria-readonly` in ARIA, so the class is the state.
    isReadonly: hasClass('wr-file-upload', 'wr-file-upload--readonly'),
  },
  { key: 'input-number', aria: 'input.wr-input', isReadonly: nativeReadonly('input.wr-input') },
  { key: 'input-otp', aria: 'input.wr-input-otp__cell', isReadonly: nativeReadonly('input.wr-input-otp__cell') },
  { key: 'knob', aria: '.wr-knob__surface', isReadonly: ariaReadonly('.wr-knob__surface') },
  { key: 'radio-group', aria: 'wr-radio-group', isReadonly: ariaReadonly('wr-radio-group') },
  { key: 'rating', aria: '.wr-rating__row', isReadonly: ariaReadonly('.wr-rating__row') },
  {
    key: 'segmented',
    aria: 'wr-segmented',
    // ARIA defines `aria-readonly` for neither `group` nor `button`; see the
    // input's own docs for why nothing is mirrored rather than something wrong.
    isReadonly: hasClass('wr-segmented', 'wr-segmented--readonly'),
  },
  { key: 'select', aria: '.wr-select__trigger', isReadonly: ariaReadonly('.wr-select__trigger') },
  { key: 'slider', aria: '.wr-slider__thumb--low', isReadonly: ariaReadonly('.wr-slider__thumb--low') },
  { key: 'switch', aria: 'input.wr-switch__input', isReadonly: ariaReadonly('input.wr-switch__input') },
  { key: 'textarea', aria: 'textarea.wr-textarea__native', isReadonly: nativeReadonly('textarea') },
  {
    key: 'transfer',
    aria: 'wr-transfer',
    // Same as the checkbox group: the host is a `role="group"`, the rows mirror.
    isReadonly: ariaReadonly('input.wr-checkbox__input'),
  },
  {
    key: 'tree',
    aria: 'ul.wr-tree__list',
    // `role="tree"` does not support `aria-readonly` either.
    isReadonly: hasClass('wr-tree', 'wr-tree--readonly'),
  },
];

describe('every value control, as a form control', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (key: string): HTMLElement => root().querySelector<HTMLElement>(`wr-form-field[data-k="${key}"]`)!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-GB' })],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders one field per control, and the table covers all of them', () => {
    // A probe table that quietly stopped growing looks exactly like one that
    // covers the catalog, so the count is asserted rather than assumed.
    expect(PROBES).toHaveLength(19);
    for (const probe of PROBES) expect(field(probe.key), probe.key).toBeTruthy();
  });

  describe('readonly()', () => {
    it('reaches nothing while the rule is off', () => {
      const on = PROBES.filter(p => p.isReadonly(field(p.key))).map(p => p.key);

      expect(on).toEqual([]);
    });

    it('reaches the DOM of every control the schema marks read-only', () => {
      fixture.componentInstance.locked.set(true);
      fixture.detectChanges();

      const missing = PROBES.filter(p => !p.isReadonly(field(p.key))).map(p => p.key);

      // Thirteen of the nineteen used to be here: `FormUiControl.readonly` is
      // optional, so a control that does not declare the input is simply never
      // told, and the schema reads correct while the control is fully editable.
      expect(missing).toEqual([]);
    });

    it('is a state of the CONTROL, not of the field wrapper', () => {
      fixture.componentInstance.locked.set(true);
      fixture.detectChanges();

      // Not disabled: a read-only control still submits its value and still
      // takes focus, which is the whole reason the two rules are separate.
      for (const probe of PROBES) {
        const el = field(probe.key).querySelector(probe.aria);
        expect(el?.getAttribute('aria-disabled'), probe.key).not.toBe('true');
      }
    });

    it('never costs a control its tab stop', () => {
      const stops = (): string[] =>
        PROBES.flatMap(probe =>
          [...field(probe.key).querySelectorAll<HTMLElement>('[tabindex]')]
            .filter(el => el.getAttribute('tabindex') === '-1')
            .map(el => `${probe.key}:${el.className || el.tagName.toLowerCase()}`)
        );

      // Focusability is the line between the two rules: `disabled` leaves the
      // tab order, `readonly` stays in it, because a keyboard user still has to
      // reach a value they cannot change — and an `aria-describedby` on an
      // unreachable element announces an error nobody can navigate to.
      //
      // This is the assertion that was missing when the contract first landed.
      // `knob` and `rating` drove `tabindex` off the same `interactive()` that
      // guards their gestures, so a `readonly()` rule pulled both out of the tab
      // order — readonly behaving as disabled, which is the defect this whole
      // file exists to pin.
      const before = stops();
      fixture.componentInstance.locked.set(true);
      fixture.detectChanges();

      expect(stops()).toEqual(before);
    });
  });

  describe('a visible validation error', () => {
    const messageId = (key: string): string | null =>
      field(key).querySelector('.wr-form-field__errors')?.getAttribute('id') ?? null;

    beforeEach(() => {
      fixture.componentInstance.failing.set(true);
      // The field only paints once the control has been interacted with.
      fixture.componentInstance.f().markAsTouched();
      fixture.detectChanges();
    });

    it('paints a message for every control', () => {
      const silent = PROBES.filter(p => !field(p.key).querySelector('[role="alert"]')).map(p => p.key);

      expect(silent).toEqual([]);
    });

    it('is announced by every control, not only drawn beside it', () => {
      // The finding this pins: nine controls rendered the red message and
      // exposed zero `aria-invalid` and zero `aria-describedby`, so a screen
      // reader could not find out why the form would not submit. axe has no rule
      // for it — a visible error that is not programmatically associated is
      // invisible to the automated gate, which makes this spec the only one.
      const silent = PROBES.filter(
        p => field(p.key).querySelector(p.aria)?.getAttribute('aria-invalid') !== 'true'
      ).map(p => p.key);

      expect(silent).toEqual([]);
    });

    it('points every control at the element holding its own message', () => {
      for (const probe of PROBES) {
        const described = field(probe.key).querySelector(probe.aria)?.getAttribute('aria-describedby');
        expect(described, probe.key).toBe(messageId(probe.key));
        expect(described, probe.key).toBeTruthy();
      }
    });

    it('says nothing while the control is valid', () => {
      fixture.componentInstance.failing.set(false);
      fixture.detectChanges();

      // Keyed on the message EXISTING, not on the error list: announcing
      // "invalid" while `aria-describedby` points at nothing is worse than quiet.
      for (const probe of PROBES) {
        const el = field(probe.key).querySelector(probe.aria);
        expect(el?.getAttribute('aria-invalid'), probe.key).toBeNull();
        expect(el?.getAttribute('aria-describedby'), probe.key).toBeNull();
      }
    });

    it('never lets a composite control hand its error to a part of itself', () => {
      // `wr-color-picker` renders a `<wr-segmented>` tab strip and `wr-transfer`
      // renders checkboxes and a search input — all of which read `WR_FORM_FIELD`
      // themselves. Unshielded, the colour field's error was announced by the
      // HEX / RGB / HSL switcher, which is not the control and is never invalid.
      // A `<wr-checkbox-group>`'s boxes are the same shape of part, and there the
      // symptom is louder: one error announced once per box.
      const inner = [
        ...field('color-picker').querySelectorAll('wr-segmented[aria-invalid="true"]'),
        ...field('transfer').querySelectorAll('input[aria-invalid="true"]'),
        ...field('checkbox-group').querySelectorAll('input[aria-invalid="true"]'),
      ];

      expect(inner).toHaveLength(0);
    });
  });

  describe('readonly() refuses the edit, and not only the attribute', () => {
    // The attribute half is above; this is the half the finding was actually
    // about — "a plain user click mutates the model". Gestures only, no poking
    // at component internals, and one per interaction shape the catalog has.
    const q = <T extends Element>(key: string, selector: string): T => field(key).querySelector<T>(selector)!;
    const model = (): Model => fixture.componentInstance.model();

    const press = (el: Element, key: string): void => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };

    beforeEach(() => {
      fixture.componentInstance.locked.set(true);
      fixture.detectChanges();
    });

    it('drives every one of those gestures for real when the rule is off', () => {
      // The guard against a vacuous suite: without this, a gesture jsdom quietly
      // ignores would make every assertion below pass on a broken component.
      fixture.componentInstance.locked.set(false);
      fixture.detectChanges();

      q('checkbox', 'input.wr-checkbox__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      q('switch', 'input.wr-switch__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      q('checkbox-group', 'input.wr-checkbox__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      q('radio-group', 'input.wr-radio__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      q<HTMLElement>('segmented', '.wr-segmented__option').click();
      q<HTMLElement>('select', '.wr-select__trigger').click();
      q<HTMLElement>('cascader', '.wr-cascader__trigger').click();
      q<HTMLElement>('tree', '.wr-tree__row').click();
      fixture.detectChanges();
      press(q('slider', '.wr-slider__thumb--low'), 'ArrowRight');
      press(q('knob', '.wr-knob__surface'), 'ArrowRight');
      press(q('rating', '.wr-rating__row'), 'ArrowRight');
      press(q('color-picker', '.wr-color-picker__slider--hue'), 'ArrowRight');
      const cell = q<HTMLInputElement>('input-otp', 'input.wr-input-otp__cell');
      cell.value = '7';
      cell.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      expect(model().checkbox).toBe(true);
      expect(model().switch).toBe(true);
      expect(model().checkboxGroup).toEqual(['a']);
      expect(model().radioGroup).toBe('a');
      expect(model().segmented).toBe('day');
      // An INLINE tree's selection is `[(selected)]`, not `value` — a documented
      // contract, so the row's own ARIA state is what says the click landed.
      expect(q('tree', '.wr-tree__row').getAttribute('aria-selected')).toBe('true');
      expect(model().slider).not.toBe(0);
      expect(model().knob).not.toBe(0);
      expect(model().rating).not.toBeNull();
      expect(model().colorPicker).not.toBe('#336699');
      expect(model().inputOtp).toBe('7');
      expect(q('select', '.wr-select__trigger').getAttribute('aria-expanded')).toBe('true');
      expect(q('cascader', '.wr-cascader__trigger').getAttribute('aria-expanded')).toBe('true');
      expect(q<HTMLInputElement>('file-upload', 'input.wr-file-upload__picker').disabled).toBe(false);
    });

    it('leaves a checkbox and a switch alone when clicked', () => {
      q('checkbox', 'input.wr-checkbox__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      q('switch', 'input.wr-switch__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(model().checkbox).toBe(false);
      expect(model().switch).toBe(false);
    });

    it('leaves a checkbox group alone when one of its boxes is clicked', () => {
      q('checkbox-group', 'input.wr-checkbox__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(model().checkboxGroup).toEqual([]);
    });

    it('leaves a radio group alone when an option is clicked', () => {
      q('radio-group', 'input.wr-radio__input').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(model().radioGroup).toBeNull();
    });

    it('leaves a segmented strip alone when a segment is clicked', () => {
      q<HTMLElement>('segmented', '.wr-segmented__option').click();
      fixture.detectChanges();

      expect(model().segmented).toBeNull();
    });

    it('does not open the select or the cascader', () => {
      q<HTMLElement>('select', '.wr-select__trigger').click();
      q<HTMLElement>('cascader', '.wr-cascader__trigger').click();
      fixture.detectChanges();

      expect(q('select', '.wr-select__trigger').getAttribute('aria-expanded')).toBe('false');
      expect(q('cascader', '.wr-cascader__trigger').getAttribute('aria-expanded')).toBe('false');
    });

    it('refuses a tree selection while still letting the branch open', () => {
      const row = q<HTMLElement>('tree', '.wr-tree__row');
      row.click();
      fixture.detectChanges();
      expect(row.getAttribute('aria-selected')).toBe('false');

      q<HTMLElement>('tree', '.wr-tree__toggle').click();
      fixture.detectChanges();

      // Expanding is NAVIGATION, not a value — a read-only tree stays browsable.
      expect(q('tree', '.wr-tree__row').getAttribute('aria-expanded')).toBe('true');
    });

    it('does not move a slider, a knob or a rating from the keyboard', () => {
      press(q('slider', '.wr-slider__thumb--low'), 'ArrowRight');
      press(q('knob', '.wr-knob__surface'), 'ArrowRight');
      press(q('rating', '.wr-rating__row'), 'ArrowRight');

      expect(model().slider).toBe(0);
      expect(model().knob).toBe(0);
      expect(model().rating).toBeNull();
    });

    it('does not move the colour picker from the keyboard', () => {
      press(q('color-picker', '.wr-color-picker__slider--hue'), 'ArrowRight');
      press(q('color-picker', '.wr-color-picker__sv'), 'ArrowRight');

      expect(model().colorPicker).toBe('#336699');
    });

    it('refuses a character typed into an OTP box', () => {
      const cell = q<HTMLInputElement>('input-otp', 'input.wr-input-otp__cell');
      cell.value = '7';
      cell.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      expect(model().inputOtp).toBe('');
      expect(cell.value).toBe('');
    });

    it('takes the file picker and the transfer buttons out of service', () => {
      expect(q<HTMLInputElement>('file-upload', 'input.wr-file-upload__picker').disabled).toBe(true);
      const moves = [...field('transfer').querySelectorAll<HTMLButtonElement>('.wr-transfer__move')];
      expect(moves).toHaveLength(2);
      expect(moves.every(b => b.disabled)).toBe(true);
    });
  });
});

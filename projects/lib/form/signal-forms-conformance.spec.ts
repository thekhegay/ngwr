import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Component, input, inputBinding, model, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';

import { assertSignalFormsControl } from 'ngtrue/testing';
import { provideWr } from 'ngwr';
import { WrCascader, type WrCascaderOption } from 'ngwr/cascader';
import { WrCheckbox, WrCheckboxGroup } from 'ngwr/checkbox';
import { WrColorPicker } from 'ngwr/color-picker';
import { withDates } from 'ngwr/date';
import { WrDatePicker, WrDateRangePicker, type WrDateRange } from 'ngwr/date-picker';
import { WrEditor, type WrEditorJson } from 'ngwr/editor';
import { WrFileUpload } from 'ngwr/file-upload';
import { WrInputNumber } from 'ngwr/input-number';
import { WrInputOtp } from 'ngwr/input-otp';
import { WrKnob } from 'ngwr/knob';
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

/**
 * Every public Signal Forms control, held to ngtrue's conformance suite.
 *
 * `assertSignalFormsControl` checks ten rules and fails naming the one that
 * broke: a `value` or `checked` model and only one, no value accessor, a
 * `touch` output, `disabled` and `readonly` inputs, a form-side write that
 * leaves the field pristine, a value that crosses the binding both ways, a
 * `touch` that marks the field touched, and a `focusBoundControl()` that lands
 * focus inside the control.
 *
 * One host renders one control at a time, picked by `kind`, so each case gets a
 * fresh fixture with a single `[formField]` — the suite spends its fixture.
 * `values` are two values each control keeps unchanged; a control that
 * normalises would rightly refuse ngtrue's default anonymous objects.
 */
type Kind =
  | 'cascader'
  | 'checkbox'
  | 'checkbox-group'
  | 'color-picker'
  | 'date-picker'
  | 'date-range-picker'
  | 'editor'
  | 'file-upload'
  | 'input-number'
  | 'input-otp'
  | 'knob'
  | 'radio-group'
  | 'rating'
  | 'segmented'
  | 'select'
  | 'slider'
  | 'switch'
  | 'textarea'
  | 'transfer'
  | 'tree';

interface Model {
  cascader: string[];
  checkbox: boolean;
  checkboxGroup: string[];
  colorPicker: string;
  datePicker: Date | null;
  dateRangePicker: WrDateRange | null;
  editor: WrEditorJson | null;
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
    WrEditor,
    WrFileUpload,
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
    @switch (kind()) {
      @case ('cascader') {
        <wr-cascader [options]="cascaderOptions" [formField]="f.cascader" />
      }
      @case ('checkbox') {
        <wr-checkbox [formField]="f.checkbox">Agree</wr-checkbox>
      }
      @case ('checkbox-group') {
        <wr-checkbox-group [formField]="f.checkboxGroup">
          <wr-checkbox checkboxValue="a">A</wr-checkbox>
          <wr-checkbox checkboxValue="b">B</wr-checkbox>
        </wr-checkbox-group>
      }
      @case ('color-picker') {
        <wr-color-picker [formField]="f.colorPicker" />
      }
      @case ('date-picker') {
        <wr-date-picker [formField]="f.datePicker" />
      }
      @case ('date-range-picker') {
        <wr-date-range-picker [formField]="f.dateRangePicker" />
      }
      @case ('editor') {
        <wr-editor [formField]="f.editor" />
      }
      @case ('file-upload') {
        <wr-file-upload [formField]="f.fileUpload" />
      }
      @case ('input-number') {
        <wr-input-number [formField]="f.inputNumber" />
      }
      @case ('input-otp') {
        <wr-input-otp [formField]="f.inputOtp" />
      }
      @case ('knob') {
        <wr-knob [formField]="f.knob" />
      }
      @case ('radio-group') {
        <wr-radio-group [formField]="f.radioGroup">
          <wr-radio value="a">A</wr-radio>
          <wr-radio value="b">B</wr-radio>
        </wr-radio-group>
      }
      @case ('rating') {
        <wr-rating [formField]="f.rating" />
      }
      @case ('segmented') {
        <wr-segmented [options]="segmentedOptions" [formField]="f.segmented" />
      }
      @case ('select') {
        <wr-select [formField]="f.select">
          <wr-option value="a">A</wr-option>
          <wr-option value="b">B</wr-option>
        </wr-select>
      }
      @case ('slider') {
        <wr-slider [formField]="f.slider" />
      }
      @case ('switch') {
        <wr-switch [formField]="f.switch">On</wr-switch>
      }
      @case ('textarea') {
        <wr-textarea [formField]="f.textarea" />
      }
      @case ('transfer') {
        <wr-transfer [items]="transferItems" [formField]="f.transfer" />
      }
      @case ('tree') {
        <wr-tree [nodes]="treeNodes" [formField]="f.tree" />
      }
    }
  `,
})
class Host {
  readonly kind = input.required<Kind>();

  readonly cascaderOptions: readonly WrCascaderOption<string>[] = [
    { value: 'a', label: 'A', children: [{ value: 'a1', label: 'A1' }] },
    { value: 'b', label: 'B', children: [{ value: 'b1', label: 'B1' }] },
  ];
  readonly segmentedOptions: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];
  readonly transferItems: readonly WrTransferItem[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];
  readonly treeNodes: readonly WrTreeNode<string>[] = [
    { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
    { id: 'b', label: 'B' },
  ];

  readonly model = signal<Model>({
    cascader: [],
    checkbox: false,
    checkboxGroup: [],
    colorPicker: '#336699',
    datePicker: null,
    dateRangePicker: null,
    editor: null,
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

  readonly f = form(this.model);
}

/** A control with no `readonly` input: the one the guard case below must see fail. */
@Component({ selector: 'wr-spec-no-readonly', template: '' })
class NoReadonly {
  readonly value = model('');
  readonly disabled = input(false);
  readonly touch = output<void>();
}

@Component({
  imports: [FormField, NoReadonly],
  template: `<wr-spec-no-readonly [formField]="f.text" />`,
})
class NoReadonlyHost {
  readonly f = form(signal({ text: '' }));
}

const doc = (text: string): WrEditorJson => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

interface Case {
  readonly kind: Kind;
  /** The class the catalog scan below finds, so the table cannot fall behind it. */
  readonly control: string;
  /** Two values the control keeps as written. A `checked` model needs none. */
  readonly values?: readonly [unknown, unknown];
}

const CASES: readonly Case[] = [
  {
    kind: 'cascader',
    control: 'WrCascader',
    values: [
      ['a', 'a1'],
      ['b', 'b1'],
    ],
  },
  { kind: 'checkbox', control: 'WrCheckbox' },
  { kind: 'checkbox-group', control: 'WrCheckboxGroup', values: [['a'], ['b']] },
  { kind: 'color-picker', control: 'WrColorPicker', values: ['#336699', '#993366'] },
  { kind: 'date-picker', control: 'WrDatePicker', values: [new Date(2026, 2, 15), new Date(2026, 3, 20)] },
  {
    kind: 'date-range-picker',
    control: 'WrDateRangePicker',
    values: [
      [new Date(2026, 2, 1), new Date(2026, 2, 15)],
      [new Date(2026, 3, 1), new Date(2026, 3, 20)],
    ],
  },
  { kind: 'editor', control: 'WrEditor', values: [doc('One'), doc('Two')] },
  {
    kind: 'file-upload',
    control: 'WrFileUpload',
    values: [new File(['a'], 'a.txt', { type: 'text/plain' }), new File(['b'], 'b.txt', { type: 'text/plain' })],
  },
  { kind: 'input-number', control: 'WrInputNumber', values: [3, 7] },
  { kind: 'input-otp', control: 'WrInputOtp', values: ['123456', '654321'] },
  // 150 is past the default max of 100: a control that clamps into the model
  // would hand the form back a different value than it was given.
  { kind: 'knob', control: 'WrKnob', values: [150, 20] },
  { kind: 'radio-group', control: 'WrRadioGroup', values: ['a', 'b'] },
  { kind: 'rating', control: 'WrRating', values: [2, 4] },
  { kind: 'segmented', control: 'WrSegmented', values: ['day', 'week'] },
  { kind: 'select', control: 'WrSelect', values: ['a', 'b'] },
  { kind: 'slider', control: 'WrSlider', values: [20, 60] },
  { kind: 'switch', control: 'WrSwitch' },
  { kind: 'textarea', control: 'WrTextarea', values: ['One', 'Two'] },
  { kind: 'transfer', control: 'WrTransfer', values: [['a'], ['b']] },
  { kind: 'tree', control: 'WrTree', values: ['a1', 'b'] },
];

const LIB = join(process.cwd(), 'projects/lib');

/**
 * Every exported class implementing `FormValueControl` or
 * `FormCheckboxControl`, read off the source. `internal/` folders are not
 * public, which leaves out the date picker's time panel.
 */
function publicControls(dir = LIB, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['internal', 'node_modules', 'schematics', 'mcp'].includes(entry.name)) publicControls(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      const src = readFileSync(full, 'utf8');
      for (const match of src.matchAll(
        /export class (\w+)[^{]*?\bimplements\b[^{]*\bForm(?:Value|Checkbox)Control\b/g
      )) {
        out.push(match[1]);
      }
    }
  }
  return out;
}

/**
 * jsdom lays nothing out, and ProseMirror measures when the editor takes focus.
 * The same stubs the editor's own spec installs, removed after each case.
 */
function installLayoutStubs(): () => void {
  const range = Range.prototype as Partial<Range>;
  range.getClientRects = (): DOMRectList => [] as unknown as DOMRectList;
  range.getBoundingClientRect = (): DOMRect => new DOMRect();
  document.elementFromPoint = (): Element | null => null;
  return () => {
    delete range.getClientRects;
    delete range.getBoundingClientRect;
    delete (document as Partial<Document>).elementFromPoint;
  };
}

describe('every public Signal Forms control, against ngtrue', () => {
  let removeStubs: () => void;

  beforeEach(() => {
    removeStubs = installLayoutStubs();
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
  });

  afterEach(() => removeStubs());

  it('covers every control the library exports', () => {
    expect(publicControls().sort()).toEqual(CASES.map(c => c.control).sort());
  });

  it('fails a control that leaves a rule out, so a pass below means something', async () => {
    await expect(assertSignalFormsControl(() => TestBed.createComponent(NoReadonlyHost))).rejects.toMatchObject({
      rule: 'readonly-input',
    });
  });

  for (const { kind, control, values } of CASES) {
    it(`${control} conforms`, async () => {
      await assertSignalFormsControl(
        () => TestBed.createComponent(Host, { bindings: [inputBinding('kind', () => kind)] }),
        values ? { values } : {}
      );
    });
  }
});

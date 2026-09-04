import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { WrFormError, WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrTable, WrTableCell, type WrTableColumns } from 'ngwr/table';
import { WrTypography } from 'ngwr/typography';

import {
  DocCodeComponent,
  DocPageComponent,
  DocRichPipe,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

/** One row of "does this `FormControl` state reach the control". */
interface BridgeRow {
  readonly state: string;
  readonly reaches: string;
  readonly note: string;
}

/** One row of "what a control shows for a value it cannot represent". */
interface RangeRow {
  readonly control: string;
  readonly outOfRange: string;
  readonly empty: string;
}

/**
 * The reactive-forms guide.
 *
 * It exists because six pages say "reactive forms keep working through
 * Angular's bridge" and none of them said what the bridge is, what it carries,
 * or what it drops. Every claim on this page is read out of
 * `@angular/forms` and `projects/lib` rather than assumed — the two headline
 * sections (`updateOn`, and the silent write) describe behaviour nobody can
 * change from inside ngwr, so the only useful thing docs can do is name it and
 * say what a host does about it.
 */
@Component({
  selector: 'ngwr-gs-forms-page',
  templateUrl: './forms.html',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    WrAlert,
    WrButton,
    WrFormError,
    WrFormField,
    WrInput,
    WrOption,
    WrSelect,
    WrTable,
    WrTableCell,
    WrTypography,
    DocPageComponent,
    DocRichPipe,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocSeeAlsoComponent,
  ],
})
export default class FormsGuidePage {
  // Bound so the lint rule's unbound-method check stays satisfied.
  private readonly emailValidator = Validators.email.bind(Validators);

  /**
   * The live demo for the silent-write section.
   *
   * Three rules make it demonstrate the thing rather than hide it, and each one
   * is a way an earlier draft lied:
   *
   * 1. **Both writes land from a timer**, well after the click that scheduled
   *    them. A write made straight from a template handler repaints either way,
   *    because the click has already marked the view dirty — which is exactly
   *    why the bug is so hard to reproduce with a button.
   * 2. **The delay is 300 ms, not 0.** Zoneless change detection is itself
   *    scheduled as a macrotask, so a `setTimeout(…, 0)` can land inside the
   *    click's own pass and be picked up by it.
   * 3. **Nothing in the timer touches a signal.** `lastWrite` is set
   *    synchronously in the handler, because setting a signal notifies the
   *    scheduler — a status line written after the silent write would schedule
   *    the very pass whose absence is the point.
   */
  protected readonly form = new FormGroup({
    email: new FormControl('ada@example.com', { nonNullable: true, validators: [this.emailValidator] }),
    plan: new FormControl<string | null>('pro'),
  });

  protected readonly plans = ['free', 'pro', 'team'] as const;

  protected readonly lastWrite = signal<string>('Nothing written yet.');

  protected readonly modelReadout = signal<string>('—');

  /** Write asynchronously, the way an HTTP response arrives. */
  protected loudWrite(): void {
    this.lastWrite.set('patchValue({ email: "grace@example.com", plan: "team" }) lands in 300 ms…');
    setTimeout(() => this.form.patchValue({ email: 'grace@example.com', plan: 'team' }), 300);
  }

  /** The same write, silenced. The model moves; the fields do not. */
  protected silentWrite(): void {
    this.lastWrite.set(
      'patchValue({ email: "alan@example.com", plan: "free" }, { emitEvent: false }) lands in 300 ms — watch the fields not move.'
    );
    setTimeout(() => this.form.patchValue({ email: 'alan@example.com', plan: 'free' }, { emitEvent: false }), 300);
  }

  /**
   * Read the model back. The click itself runs change detection, so this also
   * catches the fields up — which is the whole mechanism, seen from the other
   * side: the write was never lost, only unpainted.
   */
  protected readModel(): void {
    this.modelReadout.set(JSON.stringify(this.form.value));
  }

  protected readonly bridgeColumns: WrTableColumns = {
    state: { title: 'FormControl state', width: 200 },
    reaches: { title: 'Reaches the control?', width: 200 },
    note: { title: 'What that means for you' },
  };

  protected readonly bridgeRows: readonly BridgeRow[] = [
    {
      state: 'value',
      reaches: 'Yes, both ways',
      note: 'The control’s `value` (or `checked`) model **is** the form value. The two sections below are the cases where the model-to-view half does not run.',
    },
    {
      state: 'disabled',
      reaches: 'Yes',
      note: '`disable()` / `enable()` land on the `disabled` input every ngwr control declares. The control greys out and leaves the tab order.',
    },
    {
      state: 'touched',
      reaches: 'Reported, not received',
      note: 'Each control emits a `touch` output when focus leaves it, and the bridge turns that into `markAsTouched()`. Nothing comes back down, so a control cannot style itself from `touched` — `<wr-form-field>` reads it off the projected `NgControl` instead.',
    },
    {
      state: 'dirty',
      reaches: 'Set, not received',
      note: 'The bridge calls `markAsDirty()` on every edit the control makes. Nothing comes back down.',
    },
    {
      state: 'errors, valid, invalid, pending',
      reaches: 'No',
      note: 'Error presentation is `<wr-form-field>`’s job: it reads the projected `NgControl` and owns the message, the `wr-form-field--invalid` class and the `aria-invalid` / `aria-describedby` pair.',
    },
    {
      state: 'required',
      reaches: 'No',
      note: '`Validators.required` puts neither `required` nor `aria-required` on the control. `<wr-form-field required>` is the `*` beside the label and nothing more — you write the validator and the marker separately.',
    },
    {
      state: 'readonly',
      reaches: 'Not a reactive-forms state at all',
      note: 'Reactive forms have no read-only concept; only signal forms’ `readonly()` does. Bind `[readonly]` in the template.',
    },
  ];

  protected readonly rangeColumns: WrTableColumns = {
    control: { title: 'Control', width: 180 },
    outOfRange: { title: 'A value outside its bounds' },
    empty: { title: 'null', width: 260 },
  };

  protected readonly rangeRows: readonly RangeRow[] = [
    {
      control: 'wr-input-number',
      outOfRange:
        'Shown as written. `[min]` / `[max]` bound what typing and the steppers produce; a value written in is displayed as it stands.',
      empty: 'Empty field. Clearing the field writes `null` back, never `0`.',
    },
    {
      control: 'wr-slider',
      outOfRange:
        'The thumb clamps to `[min, max]` — it cannot render off its own track — and the model keeps the number it was given.',
      empty:
        '`WrSliderValue` is `number | [number, number]`, so a non-number is ignored and the thumb stays put. Reset to a number, not to `null`.',
    },
    {
      control: 'wr-rating',
      outOfRange: 'Drawn and announced clamped to `[0, count]`; the model keeps the number.',
      empty: 'No stars filled.',
    },
    {
      control: 'wr-select',
      outOfRange:
        'A value no option matches shows the placeholder — see the next section. In search mode the trigger falls back to `displayWith(value)` instead.',
      empty: 'Placeholder.',
    },
    {
      control: 'wr-date-picker',
      outOfRange: 'Text the adapter cannot parse leaves the committed date alone rather than guessing at one.',
      empty: 'Empty field.',
    },
  ];

  protected readonly snippets = {
    bridge: `<!-- Signal forms — the native path. [formField] binds the value model directly. -->
<wr-select [formField]="f.plan">…</wr-select>

<!-- Reactive forms — the same model, reached through the bridge. -->
<form [formGroup]="form">
  <wr-select formControlName="plan">…</wr-select>
</form>

<!-- Template-driven — the same bridge again. -->
<wr-select [(ngModel)]="plan" name="plan">…</wr-select>`,

    updateOn: `// Angular honours updateOn for a native <input>. An ngwr control ignores it:
// the bridge calls control.setValue() the moment the control's own model
// changes, so the value commits — and every validator runs — on each keystroke
// or selection. A native <input wrInput> in the same group still defers.
const form = new FormGroup({
  email: new FormControl('', { updateOn: 'blur', validators: [Validators.email] }),
});

// What does still happen on blur: touched. Every ngwr control emits a \`touch\`
// output when focus leaves, and the bridge turns it into markAsTouched().`,

    silent: `import { ChangeDetectorRef, Component, inject } from '@angular/core';

@Component({ /* … */ })
export class ProfileEditPage {
  private readonly cdr = inject(ChangeDetectorRef);

  load(id: string): void {
    this.profiles.get(id).subscribe(profile => {
      // A silent write moves the model without emitting on valueChanges or
      // statusChanges — the two streams the bridge subscribes to. Nothing asks
      // for a change-detection pass, so the fields keep the old value on screen.
      this.form.patchValue(profile, { emitEvent: false });

      // This is the whole fix. It schedules the pass that re-runs the
      // model-to-view half of the bridge for every control in this template.
      this.cdr.markForCheck();
    });
  }
}`,

    silentAlt: `// The other answer is to not silence the write. The default emits, the
// bridge's own subscription marks the view for check, and a zoneless app
// schedules the pass on its own. Reach for { emitEvent: false } when a
// valueChanges listener would otherwise loop — not as a habit.
this.form.patchValue(profile);`,

    identity: `// <wr-select> matches the bound value against each option with ===, and there
// is no compareWith input. A structurally equal object from a second request is
// a different reference, so nothing matches and the trigger falls back to the
// placeholder — while the form value stays exactly what you set, and valid.

// Don't bind the object:
const category = new FormControl<Category | null>(null);
category.setValue({ id: 2, name: 'Laptops' }); // never matches <wr-option [value]="cat">

// Bind the key, and resolve the object where you need the rest of it:
const categoryId = new FormControl<number | null>(null);
categoryId.setValue(2);`,

    identityTemplate: `<wr-select formControlName="categoryId" placeholder="Pick a category">
  @for (cat of categories(); track cat.id) {
    <wr-option [value]="cat.id">{{ cat.name }}</wr-option>
  }
</wr-select>`,

    array: `<!-- FormArray, formGroupName, and a control resolved through ControlContainer
     inside a child component all work: the bridge is per-control and does not
     care how the directive found its FormControl. -->
<form [formGroup]="form">
  <div formArrayName="lines">
    @for (line of lines.controls; track line) {
      <div [formGroupName]="$index">
        <wr-input-number formControlName="qty" />
        <wr-select formControlName="sku">…</wr-select>
      </div>
    }
  </div>
</form>`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'WrFormField',
      url: ['/reference/components', 'form-field'],
      description: 'Label, hint and the error message — the half of form state the bridge does not carry.',
    },
    {
      kind: 'Component',
      title: 'WrSelect',
      url: ['/reference/components', 'select'],
      description: 'Value identity is `===`. Its page says what to bind when the options are objects.',
    },
    {
      kind: 'Component',
      title: 'WrInputNumber',
      url: ['/reference/components', 'input-number'],
      description: 'Where `[min]` / `[max]` apply, and where they deliberately do not.',
    },
    {
      kind: 'Validator',
      title: 'WrValidators',
      url: ['/reference', 'validators'],
      description: 'The extra validators, and the error keys `<wr-form-field>` already has copy for.',
    },
    {
      kind: 'Guide',
      title: 'Testing',
      url: ['/guides', 'testing'],
      description: 'The CDK harnesses — and where the specs that pin this bridge for your app belong.',
    },
  ];
}

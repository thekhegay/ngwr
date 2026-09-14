import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, NgModel, ReactiveFormsModule, RequiredValidator, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrOption, WrSelect } from 'ngwr/select';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCheckbox } from './checkbox';

/**
 * `[(ngModel)]`, `[formControl]` and `formControlName` on an ngwr control, and
 * what that binding does NOT do.
 *
 * No `ControlValueAccessor` exists anywhere in the library, and none is created
 * for these bindings either. The compiler emits a control instruction for any
 * element carrying one of them; core marks the element a custom control when a
 * directive on it has a model named `value` or `checked` (an input plus its
 * `…Change` output — found by NAME); and `NgControl.ngControlCreate` in
 * `@angular/forms` then subscribes to that model and writes `control.value`
 * back onto it. One control of each shape is pinned here: `wr-checkbox` for
 * `checked`, `wr-select` for `value`. Rename either model and every sync spec
 * below fails with `NG01203`.
 *
 * The third describe is the reason this file exists. The accessor path runs
 * `setUpValidators`, which merges the validator DIRECTIVES on the element into
 * the `FormControl`; the custom-control path (`setupCustomControl`) never does.
 * So a template `required` on an ngwr control matches its directive and is then
 * silently ignored — no error, and the form submits — while the same attribute
 * on a native `<input>` in the same template works. Validators have to live on
 * the `FormControl`.
 *
 * That is ANGULAR's current behaviour, pinned rather than endorsed. If a spec in
 * that block starts failing after an Angular bump, the bridge moved — in either
 * direction — and the docs that describe it must move with it: AGENTS.md
 * (Forms), README.md, `scripts/lib/ai/skill.ts`, `/guides/forms`,
 * `/start/quality` and `/start/comparison`.
 */

@Component({
  imports: [FormsModule, ReactiveFormsModule, WrCheckbox],
  template: `
    <wr-checkbox [(ngModel)]="agreed">Template-driven</wr-checkbox>
    <wr-checkbox [formControl]="reactive">Reactive</wr-checkbox>
  `,
})
class CheckboxHost {
  readonly agreed = signal(false);
  readonly reactive = new FormControl(false, { nonNullable: true });
}

@Component({
  imports: [FormsModule, ReactiveFormsModule, WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Template-driven" placeholder="Pick a plan" [(ngModel)]="plan">
      <wr-option value="free">Free</wr-option>
      <wr-option value="team">Team</wr-option>
    </wr-select>
    <wr-select ariaLabel="Reactive" placeholder="Pick a plan" [formControl]="reactive">
      <wr-option value="free">Free</wr-option>
      <wr-option value="team">Team</wr-option>
    </wr-select>
  `,
})
class SelectHost {
  readonly plan = signal<string | null>(null);
  readonly reactive = new FormControl<string | null>(null);
}

/**
 * Every value starts `null` on purpose: `required` treats `false` as a value, so
 * a checkbox starting unchecked would report no error whether or not the
 * directive had been wired, and the spec would pass for the wrong reason.
 */
@Component({
  imports: [FormsModule, ReactiveFormsModule, WrCheckbox, WrSelect, WrOption],
  template: `
    <wr-checkbox required [formControl]="checkboxDirective">Directive</wr-checkbox>
    <wr-checkbox [formControl]="checkboxValidator">Validator</wr-checkbox>
    <wr-checkbox #checkboxModel="ngModel" required [(ngModel)]="checkboxModelValue">ngModel</wr-checkbox>

    <wr-select ariaLabel="Directive" required [formControl]="selectDirective">
      <wr-option value="free">Free</wr-option>
    </wr-select>
    <wr-select ariaLabel="Validator" [formControl]="selectValidator">
      <wr-option value="free">Free</wr-option>
    </wr-select>
    <wr-select #selectModel="ngModel" ariaLabel="ngModel" required [(ngModel)]="selectModelValue">
      <wr-option value="free">Free</wr-option>
    </wr-select>

    <input aria-label="Native" required [formControl]="nativeDirective" />
  `,
})
class ValidatorsHost {
  // Bound so the lint rule's unbound-method check stays satisfied.
  private readonly required = Validators.required.bind(Validators);

  readonly checkboxDirective = new FormControl<boolean | null>(null);
  readonly checkboxValidator = new FormControl<boolean | null>(null, this.required);
  readonly checkboxModelValue = signal<boolean | null>(null);
  readonly checkboxModel = viewChild.required('checkboxModel', { read: NgModel });

  readonly selectDirective = new FormControl<string | null>(null);
  readonly selectValidator = new FormControl<string | null>(null, this.required);
  readonly selectModelValue = signal<string | null>(null);
  readonly selectModel = viewChild.required('selectModel', { read: NgModel });

  readonly nativeDirective = new FormControl<string | null>(null);
}

describe('WrCheckbox under the classic forms bridge (a `checked` model)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CheckboxHost>>;

  const boxes = (): HTMLInputElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.wr-checkbox__input'),
  ];

  beforeEach(async () => {
    fixture = TestBed.createComponent(CheckboxHost);
    // `[(ngModel)]` writes its initial value a microtask after the first pass.
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('syncs both ways through [(ngModel)]', async () => {
    const host = fixture.componentInstance;
    expect(boxes()[0].checked).toBe(false);

    host.agreed.set(true);
    await fixture.whenStable();
    expect(boxes()[0].checked).toBe(true);

    boxes()[0].click();
    await fixture.whenStable();
    expect(host.agreed()).toBe(false);
    expect(boxes()[0].checked).toBe(false);
  });

  it('syncs both ways through [formControl], and marks the control dirty on an edit', async () => {
    const control = fixture.componentInstance.reactive;
    expect(boxes()[1].checked).toBe(false);

    control.setValue(true);
    await fixture.whenStable();
    expect(boxes()[1].checked).toBe(true);
    expect(control.dirty).toBe(false);

    boxes()[1].click();
    await fixture.whenStable();
    expect(control.value).toBe(false);
    expect(control.dirty).toBe(true);
    expect(boxes()[1].checked).toBe(false);
  });
});

describe('WrSelect under the classic forms bridge (a `value` model)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SelectHost>>;

  const selects = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-select'),
  ];
  const trigger = (index: number): HTMLElement => selects()[index].querySelector<HTMLElement>('.wr-select__trigger')!;
  const label = (index: number): string | undefined =>
    selects()[index].querySelector('.wr-select__value')?.textContent?.trim();

  /** Scoped by the id the trigger publishes — never by the panel's class. */
  const pick = async (index: number, text: string): Promise<void> => {
    trigger(index).click();
    await fixture.whenStable();
    const listbox = document.getElementById(trigger(index).getAttribute('aria-controls')!)!;
    const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      o => o.textContent?.trim() === text
    )!;
    option.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SelectHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('syncs both ways through [(ngModel)]', async () => {
    const host = fixture.componentInstance;
    expect(label(0)).toBeUndefined();

    host.plan.set('team');
    await fixture.whenStable();
    expect(label(0)).toBe('Team');

    await pick(0, 'Free');
    expect(host.plan()).toBe('free');
    expect(label(0)).toBe('Free');
  });

  it('syncs both ways through [formControl], and marks the control dirty on an edit', async () => {
    const control = fixture.componentInstance.reactive;
    expect(label(1)).toBeUndefined();

    control.setValue('team');
    await fixture.whenStable();
    expect(label(1)).toBe('Team');
    expect(control.dirty).toBe(false);

    await pick(1, 'Free');
    expect(control.value).toBe('free');
    expect(control.dirty).toBe(true);
    expect(label(1)).toBe('Free');
  });
});

describe('template validator directives under the classic forms bridge', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ValidatorsHost>>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(ValidatorsHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('matches the `required` directive on the ngwr controls — so what follows is not a selector miss', () => {
    const hosts = fixture.debugElement.queryAll(By.directive(RequiredValidator)).map(d => d.name);
    expect(hosts).toEqual(['wr-checkbox', 'wr-checkbox', 'wr-select', 'wr-select', 'input']);
  });

  it('applies the same directive to a native <input>, which has a real accessor', () => {
    expect(fixture.componentInstance.nativeDirective.errors).toEqual({ required: true });
  });

  it('does NOT apply a template `required` to an ngwr control bound through [formControl]', () => {
    const host = fixture.componentInstance;
    expect(host.checkboxDirective.errors).toBeNull();
    expect(host.checkboxDirective.valid).toBe(true);
    expect(host.selectDirective.errors).toBeNull();
    expect(host.selectDirective.valid).toBe(true);
  });

  it('does NOT apply a template `required` to an ngwr control bound through [(ngModel)]', () => {
    const host = fixture.componentInstance;
    expect(host.checkboxModel().errors).toBeNull();
    expect(host.checkboxModel().valid).toBe(true);
    expect(host.selectModel().errors).toBeNull();
    expect(host.selectModel().valid).toBe(true);
  });

  it('does apply `Validators.required` set on the FormControl itself', () => {
    const host = fixture.componentInstance;
    expect(host.checkboxValidator.errors).toEqual({ required: true });
    expect(host.selectValidator.errors).toEqual({ required: true });
  });
});

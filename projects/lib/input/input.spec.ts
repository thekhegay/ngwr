import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrFormField } from 'ngwr/form';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInput, WrInputPrefix, WrInputSuffix } from './directives';
import { WrInputGroup } from './input-group';
import type { WrInputSize } from './interfaces';
import { WrPasswordToggle } from './password-toggle';

@Component({
  imports: [WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix, WrPasswordToggle],
  template: `
    <wr-input-group [rounded]="rounded()">
      <span wrInputPrefix>@</span>
      <input wrInput [wrSize]="size()" [rounded]="rounded()" placeholder="Handle" />
      <span wrInputSuffix>.dev</span>
    </wr-input-group>

    <wr-input-group>
      <input #pw wrInput type="password" value="hunter2" />
      <wr-password-toggle [for]="pw" />
    </wr-input-group>
  `,
})
class Host {
  readonly size = signal<WrInputSize>('md');
  readonly rounded = signal(false);
  readonly pw = viewChild.required<unknown>('pw');
}

/**
 * `wrInput` is an attribute directive on the real `<input>` rather than a wrapper,
 * which is the point — `[(ngModel)]`, validators and third-party mask libraries
 * compose on the same element. The consequence worth pinning is what it does to
 * that element's own attributes: it writes `id`, `aria-invalid` and
 * `aria-describedby`, so whose value wins is a contract, not an implementation
 * detail.
 */
describe('WrInput', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input[placeholder="Handle"]')!;
  const group = (): HTMLElement => root().querySelector<HTMLElement>('wr-input-group')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('styles the native input without replacing it', () => {
    expect(field().tagName).toBe('INPUT');
    expect(field().classList.contains('wr-input')).toBe(true);
    expect(field().placeholder).toBe('Handle');
  });

  it('keeps the default size out of the class list', () => {
    expect(field().className).toBe('wr-input');

    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(field().classList.contains('wr-input--lg')).toBe(true);
  });

  it('rounds both the input and its group on request', () => {
    fixture.componentInstance.rounded.set(true);
    fixture.detectChanges();
    expect(field().classList.contains('wr-input--rounded')).toBe(true);
    expect(group().classList.contains('wr-input-group--rounded')).toBe(true);
  });

  it('leaves an unattached input free of ARIA it has nothing to say about', () => {
    // Outside a `<wr-form-field>` there is no id to adopt and no message to point
    // at, and an empty `aria-describedby` is worse than none — it references
    // nothing, which is invalid.
    expect(field().hasAttribute('id')).toBe(false);
    expect(field().hasAttribute('aria-invalid')).toBe(false);
    expect(field().hasAttribute('aria-describedby')).toBe(false);
  });

  it('marks the prefix and suffix as the group affixes', () => {
    const prefix = root().querySelector('[wrInputPrefix]')!;
    const suffix = root().querySelector('[wrInputSuffix]')!;
    expect(prefix.classList.contains('wr-input-group__affix--prefix')).toBe(true);
    expect(suffix.classList.contains('wr-input-group__affix--suffix')).toBe(true);
    expect(prefix.classList.contains('wr-input-group__affix')).toBe(true);
  });
});

@Component({
  imports: [WrFormField, WrInput],
  template: `
    <wr-form-field label="Email">
      <input wrInput />
    </wr-form-field>
  `,
})
class FieldHost {}

/**
 * A STATIC `id`, which is the only kind that can win: `WrInput` reads the attribute
 * once at construction, and a bound `[id]` is not applied until the first change
 * detection — after the directive exists. Two bindings writing the same attribute
 * would be ambiguous anyway.
 */
@Component({
  imports: [WrFormField, WrInput],
  template: `
    <wr-form-field label="Email">
      <input wrInput id="email-field" />
    </wr-form-field>
  `,
})
class OwnIdHost {}

/**
 * The label the field renders points at `controlId`, and the field cannot reach the
 * control it projects — so the control has to adopt that id or the `for` references
 * an element that does not exist and the input has no label at all.
 */
describe('WrInput inside a form field', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FieldHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const control = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const label = (): HTMLLabelElement => root().querySelector<HTMLLabelElement>('label')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('adopts the id the field already told its label about', () => {
    expect(label().getAttribute('for')).toBe(control().getAttribute('id'));
    expect(control().getAttribute('id')).toMatch(/^wr-form-field-\d+$/);
  });

  it("yields to the consumer's own static id, and keeps the label pointing at it", () => {
    // A static `id` is on the element before any directive is instantiated, so it is
    // the one the author meant — the generated one is only a fallback. The label has
    // to follow it, or naming the field breaks in the other direction.
    const withOwn = TestBed.createComponent(OwnIdHost);
    withOwn.detectChanges();

    const el = withOwn.nativeElement as HTMLElement;
    const input = el.querySelector('input')!;
    expect(input.getAttribute('id')).toBe('email-field');
    // The half that matters: a `for` still pointing at the field's generated id
    // references an element that does not exist, so the input has no label at all.
    expect(el.querySelector('label')!.getAttribute('for')).toBe('email-field');
    withOwn.destroy();
  });
});

describe('WrPasswordToggle', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const secret = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input[type], input')!;
  const password = (): HTMLInputElement =>
    [...root().querySelectorAll<HTMLInputElement>('input')].find(el => el.value === 'hunter2')!;
  const toggle = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-input-group__toggle')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is a real button, so Enter and Space work without any handler', () => {
    // `type="button"` also keeps it from submitting the form it sits in.
    expect(toggle().tagName).toBe('BUTTON');
    expect(toggle().getAttribute('type')).toBe('button');
  });

  it('starts as an unpressed toggle that offers to show the password', () => {
    expect(password().type).toBe('password');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().getAttribute('aria-label')).toBe('Show password');
  });

  it('flips the linked input and re-announces itself', () => {
    toggle().click();
    fixture.detectChanges();

    expect(password().type).toBe('text');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().getAttribute('aria-label')).toBe('Hide password');

    toggle().click();
    fixture.detectChanges();
    expect(password().type).toBe('password');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('hides its glyph from assistive tech, which reads the button instead', () => {
    expect(toggle().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(secret()).not.toBeNull();
  });
});

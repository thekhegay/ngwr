/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { disabled, form, hidden, max, metadata, min, required, schema } from '@angular/forms/signals';

import { WR_FIELD } from 'ngwr/form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSchemaForm } from './schema-form';

interface Profile {
  readonly workEmail: string;
  readonly bio: string;
  readonly age: number;
  readonly role: string;
  readonly plan: string;
  readonly agree: boolean;
  readonly notify: boolean;
  readonly volume: number;
  readonly internalId: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User', disabled: true },
];

const profileSchema = schema<Profile>(path => {
  required(path.workEmail);
  metadata(path.workEmail, WR_FIELD, () => ({ kind: 'input', type: 'email', hint: 'Work address only.' }));
  metadata(path.bio, WR_FIELD, () => ({ kind: 'textarea', placeholder: 'A sentence or two', span: 2 }));
  min(path.age, 18);
  max(path.age, 120);
  metadata(path.age, WR_FIELD, () => ({ kind: 'number' }));
  metadata(path.role, WR_FIELD, () => ({ kind: 'select', options: ROLES }));
  metadata(path.plan, WR_FIELD, () => ({ kind: 'radio', options: ROLES }));
  metadata(path.agree, WR_FIELD, () => ({ kind: 'checkbox', label: 'I agree to the terms' }));
  metadata(path.notify, WR_FIELD, () => ({ kind: 'switch' }));
  metadata(path.volume, WR_FIELD, () => ({ kind: 'slider', min: 0, max: 10, step: 2 }));
  // `internalId` is deliberately undescribed.
});

@Component({
  imports: [WrSchemaForm],
  template: `<wr-schema-form [field]="profile" [columns]="columns()" />`,
})
class Host {
  readonly model = signal<Profile>({
    workEmail: '',
    bio: '',
    age: 30,
    role: 'user',
    plan: 'user',
    agree: false,
    notify: false,
    volume: 4,
    internalId: 'x-1',
  });
  readonly columns = signal(2);
  readonly profile = form(this.model, profileSchema);
}

function mount(): { fixture: ReturnType<typeof TestBed.createComponent<Host>>; el: HTMLElement } {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

/**
 * The assertions read the RENDERED DOM — roles, ARIA state and the `.wr-*`
 * classes, which are public API here — rather than the component's own fields. A
 * spec that reaches into internals passes straight through the change that
 * actually breaks a consumer, and for this component the interesting question is
 * always "what did it draw", never "what did it compute".
 */
describe('WrSchemaForm', () => {
  it('draws one field per described entry, in the model key order, and skips the rest', () => {
    const { el } = mount();

    const labels = [...el.querySelectorAll('.wr-form-field__label')].map(l => l.textContent?.trim());
    // `workEmail` falls back to the de-camel-cased key; `bio`, `age`, `role` and
    // `plan` likewise. `agree` and `notify` carry their own label INSIDE the
    // control, so they contribute no label above it.
    // `workEmail` is `required()` in the schema, so its label carries the marker.
    expect(labels).toEqual(['Work email *', 'Bio', 'Age', 'Role', 'Plan', 'Volume']);
    expect(el.querySelectorAll('.wr-schema-form__field')).toHaveLength(8);
    // The undescribed field is drawn by nothing at all.
    expect(el.textContent).not.toContain('Internal id');
  });

  /**
   * The bounds are NOT in the spec, and this is why: Angular refuses a `[min]`
   * binding on a field-bound control (NG8022), so a schema-driven form could not
   * have carried them there even if it wanted two sources of truth. They travel
   * with the field instead, and land on the control on their own.
   */
  it('takes the bounds from the schema, which is the only place they can live', () => {
    const { fixture, el } = mount();

    fixture.componentInstance.model.update(m => ({ ...m, age: 200 }));
    fixture.componentInstance.profile.age().markAsTouched();
    fixture.detectChanges();

    // The whole chain in one assertion: a schema rule raised an error on the
    // field, `[formField]` carried it to the control, and `<wr-form-field>`
    // resolved the copy with no `<wr-form-error>` written anywhere.
    expect(el.querySelector('.wr-form-field--invalid')).toBeTruthy();
    expect(el.querySelector('[data-key="max"]')?.textContent?.trim()).toBeTruthy();
  });

  it('renders the control each kind names', () => {
    const { el } = mount();

    expect(el.querySelector('input.wr-input[type="email"]')).toBeTruthy();
    expect(el.querySelector('wr-textarea')).toBeTruthy();
    expect(el.querySelector('wr-input-number')).toBeTruthy();
    expect(el.querySelector('wr-select')).toBeTruthy();
    expect(el.querySelector('[role="radiogroup"]')).toBeTruthy();
    expect(el.querySelector('wr-checkbox')).toBeTruthy();
    expect(el.querySelector('wr-switch')).toBeTruthy();
    expect(el.querySelector('wr-slider')).toBeTruthy();
  });

  it('names every control that a <label for> cannot reach', () => {
    const { el } = mount();

    // `<wr-form-field>` renders a `<label for>`, and `for` can only point at a
    // native labelable element — which of these controls only `wrInput` is. The
    // rest would show a label and announce nothing, so each takes the same text
    // through its own `ariaLabel`, and the radio group through `aria-label` on
    // the `role="radiogroup"` host that supports it.
    expect(el.querySelector('wr-textarea textarea')?.getAttribute('aria-label')).toBe('Bio');
    expect(el.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Plan');
    expect(el.querySelector('wr-slider [role="slider"]')?.getAttribute('aria-label')).toBe('Volume');
  });

  it('puts the checkbox and switch label inside the control, not above it', () => {
    const { el } = mount();

    expect(el.querySelector('wr-checkbox')?.textContent?.trim()).toBe('I agree to the terms');
    // No spec label, so the key fallback applies inside the control too.
    expect(el.querySelector('wr-switch')?.textContent?.trim()).toBe('Notify');
  });

  it('lays a field out across the columns it asked for, clamped to the form', () => {
    const { fixture, el } = mount();
    const cells = [...el.querySelectorAll<HTMLElement>('.wr-schema-form__field')];

    expect(cells[0].style.gridColumn).toBe('span 1');
    expect(cells[1].style.gridColumn).toBe('span 2');

    // A span wider than the grid is clamped rather than overflowing it.
    fixture.componentInstance.columns.set(1);
    fixture.detectChanges();
    expect(el.querySelector<HTMLElement>('.wr-schema-form__field:nth-child(2)')!.style.gridColumn).toBe('span 1');
  });

  it('carries the options a spec lists, disabled state included', () => {
    const { el } = mount();

    const radios = [...el.querySelectorAll('wr-radio')];
    expect(radios.map(r => r.textContent?.trim())).toEqual(['Admin', 'User']);
    expect(radios[1].querySelector('input')?.disabled).toBe(true);
  });

  it('leaves required, disabled and hidden to the schema rather than to the spec', () => {
    TestBed.resetTestingModule();

    interface Small {
      readonly a: string;
      readonly b: string;
    }
    const smallSchema = schema<Small>(path => {
      required(path.a);
      metadata(path.a, WR_FIELD, () => ({ kind: 'input' }));
      disabled(path.b, () => true);
      hidden(path.b, () => true);
      metadata(path.b, WR_FIELD, () => ({ kind: 'input' }));
    });

    @Component({ imports: [WrSchemaForm], template: `<wr-schema-form [field]="f" />` })
    class SmallHost {
      readonly model = signal<Small>({ a: '', b: '' });
      readonly f = form(this.model, smallSchema);
    }

    const fixture = TestBed.createComponent(SmallHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // `required()` came off the schema and reached the marker beside the label.
    expect(el.querySelector('.wr-form-field--required')).toBeTruthy();
    // A hidden field is drawn by nobody: Angular's own docs say `hidden()` does
    // not hide anything on its own, so a component that ignored it would render
    // a control the form has already excluded from its validity.
    expect(el.querySelectorAll('.wr-schema-form__field')).toHaveLength(1);
  });

  /**
   * The one failure mode nothing else can report. `kind` is a string on a
   * metadata value, so TypeScript cannot hold it against the field's own type,
   * and the mismatch is silent until the control writes the wrong type into the
   * model. A dev-mode warning is the only evidence available.
   */
  describe('kind against the field type', () => {
    beforeEach(() => TestBed.resetTestingModule());

    it('warns when a kind writes a type the field does not hold', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      interface Wrong {
        readonly count: string;
      }
      @Component({ imports: [WrSchemaForm], template: `<wr-schema-form [field]="f" />` })
      class WrongHost {
        readonly model = signal<Wrong>({ count: '7' });
        readonly f = form(
          this.model,
          schema<Wrong>(path => metadata(path.count, WR_FIELD, () => ({ kind: 'number' })))
        );
      }

      TestBed.createComponent(WrongHost).detectChanges();

      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain(`field "count" is described as kind 'number'`);
      warn.mockRestore();
    });

    it('says nothing about a field whose value is still empty', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      interface Empty {
        readonly count: number | null;
      }
      @Component({ imports: [WrSchemaForm], template: `<wr-schema-form [field]="f" />` })
      class EmptyHost {
        readonly model = signal<Empty>({ count: null });
        readonly f = form(
          this.model,
          schema<Empty>(path => metadata(path.count, WR_FIELD, () => ({ kind: 'number' })))
        );
      }

      TestBed.createComponent(EmptyHost).detectChanges();

      // An unset field says nothing about its type, so a warning here would fire
      // on every correctly-described form before the user has typed.
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});

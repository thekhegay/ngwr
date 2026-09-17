import { Component, computed, type EnvironmentProviders, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCheckbox, type WrCheckboxSize } from './checkbox';
import { WrCheckboxGroup } from './checkbox-group';

@Component({
  imports: [WrCheckbox],
  template: `
    <wr-checkbox
      [(checked)]="checked"
      [disabled]="disabled()"
      [indeterminate]="indeterminate()"
      [ariaLabel]="ariaLabel()"
      (touch)="touched.set(touched() + 1)"
    >
      Accept terms
    </wr-checkbox>
  `,
})
class Host {
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly indeterminate = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly touched = signal(0);
}

@Component({
  imports: [WrCheckbox, WrCheckboxGroup],
  template: `
    <wr-checkbox-group [(value)]="picked" [disabled]="groupDisabled()" (touch)="touched.set(touched() + 1)">
      <wr-checkbox checkboxValue="a">A</wr-checkbox>
      <wr-checkbox checkboxValue="b" [indeterminate]="bMixed()">B</wr-checkbox>
      <wr-checkbox checkboxValue="c">C</wr-checkbox>
    </wr-checkbox-group>
  `,
})
class GroupHost {
  readonly picked = signal<unknown[]>([]);
  readonly groupDisabled = signal(false);
  readonly bMixed = signal(false);
  readonly touched = signal(0);
}

/** The documented "select all": the parent's state is DERIVED, and its toggle settles the children. */
@Component({
  imports: [WrCheckbox],
  template: `
    <wr-checkbox [checked]="all()" [indeterminate]="some()" (checkedChange)="toggleAll()">Select all</wr-checkbox>
  `,
})
class SelectAllHost {
  readonly picked = signal<string[]>(['a']);
  readonly all = computed(() => this.picked().length === 3);
  readonly some = computed(() => this.picked().length > 0 && !this.all());

  toggleAll(): void {
    this.picked.set(this.all() ? [] : ['a', 'b', 'c']);
  }
}

@Component({
  imports: [WrCheckbox],
  template: `<wr-checkbox [size]="size()">Accept terms</wr-checkbox>`,
})
class SizeHost {
  readonly size = signal<WrCheckboxSize | null>(null);
}

@Component({
  imports: [WrCheckbox],
  template: `<wr-checkbox id="cb">Accept terms</wr-checkbox>`,
})
class IdHost {}

/**
 * `WrCheckbox` is a signal-forms control, so the binding is the contract: the
 * boolean state is `checked`, and group membership is `checkboxValue` — NOT
 * `value`, which `FormCheckboxControl` reserves for the form value. That split
 * is the component's sharpest edge (a stray `value="x"` lands on the host as a
 * plain DOM attribute and every box in the group keeps the default identity),
 * so the group tests below are really about it.
 *
 * Assertions read the rendered DOM — the native input's state and the public
 * `.wr-*` classes — rather than component internals, because those are what a
 * consumer styles and what a screen reader reads.
 */
describe('WrCheckbox', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-checkbox__input')!;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-checkbox')!;

  /** Click through the label the way a user does, not by poking the model. */
  const toggle = (): void => {
    input().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a native checkbox with the projected text as its label', () => {
    expect(input().type).toBe('checkbox');
    expect(root().querySelector('.wr-checkbox__text')!.textContent.trim()).toBe('Accept terms');
    // The label wraps the input, so the projected text names it without an
    // explicit `aria-label`.
    expect(root().querySelector('label')!.getAttribute('for')).toBe(input().id);
  });

  it('reflects the bound state and writes back through the two-way model', () => {
    expect(input().checked).toBe(false);

    toggle();
    expect([input().checked, fixture.componentInstance.checked()]).toEqual([true, true]);

    fixture.componentInstance.checked.set(false);
    fixture.detectChanges();
    expect(input().checked).toBe(false);
  });

  it('renders the indeterminate state on the native input, where AT can see it', () => {
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();

    // A tri-state box drawn only in CSS announces as plain unchecked.
    expect(input().indeterminate).toBe(true);
    expect(root().querySelector('.wr-checkbox__dash')).not.toBeNull();
    expect(root().querySelector('.wr-checkbox__mark')).toBeNull();
  });

  // `indeterminate` is controlled: the dash stays until the host clears it. The
  // browser does not know that — activating a checkbox clears the input's own
  // `indeterminate` before `change` fires — and Angular never re-writes a bound
  // value that did not change, so the box went on painting a dash while the
  // accessibility tree announced "checked", then "not checked", on each click.
  it('keeps the native input mixed across a click while the host keeps it indeterminate', () => {
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();

    toggle();

    expect(fixture.componentInstance.checked()).toBe(true);
    expect(host().classList).toContain('wr-checkbox--indeterminate');
    expect(root().querySelector('.wr-checkbox__dash')).not.toBeNull();
    expect(input().indeterminate).toBe(true);

    toggle();

    expect(fixture.componentInstance.checked()).toBe(false);
    expect(input().indeterminate).toBe(true);
  });

  // The reset has to follow the binding, not assume a mixed box: a box that was
  // never indeterminate has a binding that never changes either, so writing `true`
  // there would announce "mixed" for the life of the page.
  it('leaves a box that was never indeterminate out of the mixed state across clicks', () => {
    toggle();
    expect([input().indeterminate, input().checked]).toEqual([false, true]);

    toggle();
    expect([input().indeterminate, input().checked]).toEqual([false, false]);
  });

  it('does not toggle while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(input().disabled).toBe(true);
    input().dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('takes an ariaLabel for a box with no projected text', () => {
    fixture.componentInstance.ariaLabel.set('Select row 3');
    fixture.detectChanges();

    // An `aria-label` on the host would not reach the native control inside it.
    expect(input().getAttribute('aria-label')).toBe('Select row 3');
  });

  it('emits touch on blur so a bound field can mark itself touched', () => {
    input().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('carries the public BEM classes', () => {
    expect([...host().classList]).toContain('wr-checkbox');

    toggle();
    expect(host().className).toContain('wr-checkbox--checked');
  });
});

describe('WrCheckboxGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const inputs = (): HTMLInputElement[] => [...root().querySelectorAll<HTMLInputElement>('input.wr-checkbox__input')];
  const picked = (): unknown[] => fixture.componentInstance.picked();

  const click = (index: number): void => {
    inputs()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  /**
   * The GROUP is the bound control, so the group is what has to report
   * touched — and a child's own `touch` output goes nowhere, because the group
   * never listens to it. The only path that marked the group touched was an
   * actual toggle, so tabbing through every box and deliberately picking none
   * left the field pristine: a `required` group showed no error until the user
   * did the one thing they had decided not to do.
   */
  it('is touched by a child losing focus, not only by a toggle', () => {
    expect(fixture.componentInstance.touched()).toBe(0);

    inputs()[1].dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched(), 'tabbing through left the group pristine').toBe(1);
    expect(picked()).toEqual([]);
  });

  it('collects each box under its own checkboxValue', () => {
    click(0);
    click(2);

    // The identity that matters is `checkboxValue`. With a stray `value="x"`
    // instead, every box keeps the default identity `null` — they all toggle
    // together and the group reports one entry.
    expect(picked()).toEqual(['a', 'c']);
  });

  it('drops a value again when its box is unchecked', () => {
    click(1);
    expect(picked()).toEqual(['b']);

    click(1);
    expect(picked()).toEqual([]);
  });

  it('checks the boxes named by an externally written value', () => {
    fixture.componentInstance.picked.set(['a', 'c']);
    fixture.detectChanges();

    expect(inputs().map(i => i.checked)).toEqual([true, false, true]);
  });

  it('disables every box from the group', () => {
    fixture.componentInstance.groupDisabled.set(true);
    fixture.detectChanges();

    expect(inputs().map(i => i.disabled)).toEqual([true, true, true]);

    inputs()[0].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(picked()).toEqual([]);
  });

  it('keeps a grouped box mixed across a click while the host keeps it indeterminate', () => {
    fixture.componentInstance.bMixed.set(true);
    fixture.detectChanges();

    click(1);
    click(0);

    expect(picked()).toEqual(['b', 'a']);
    expect(inputs().map(i => i.indeterminate)).toEqual([false, true, false]);
  });

  it('keeps the boxes independent of one another', () => {
    click(0);

    // The failure this guards is the `value`-instead-of-`checkboxValue` one: a
    // shared identity makes the whole group move as a single control.
    expect(inputs().map(i => i.checked)).toEqual([true, false, false]);
  });
});

describe('WrCheckbox as a select-all parent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SelectAllHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-checkbox__input')!;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-checkbox')!;

  const toggle = (): void => {
    input().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(SelectAllHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  // Holding the native state while the binding stays `true` must not fight a host
  // that answers the toggle: its `(checkedChange)` clears the derived flag, and the
  // binding writes `false` on the same change detection.
  it('leaves the mixed state when the host settles the children on the toggle', () => {
    expect(input().indeterminate).toBe(true);

    toggle();

    expect(fixture.componentInstance.picked()).toEqual(['a', 'b', 'c']);
    expect([input().indeterminate, input().checked]).toEqual([false, true]);
    expect(host().classList).toContain('wr-checkbox--checked');
    expect(host().classList).not.toContain('wr-checkbox--indeterminate');
    expect(root().querySelector('.wr-checkbox__mark')).not.toBeNull();

    toggle();

    expect(fixture.componentInstance.picked()).toEqual([]);
    expect([input().indeterminate, input().checked]).toEqual([false, false]);
  });

  it('turns mixed again when the children are partly checked from outside', () => {
    toggle();
    fixture.componentInstance.picked.set(['b']);
    fixture.detectChanges();

    expect(input().indeterminate).toBe(true);
    expect(root().querySelector('.wr-checkbox__dash')).not.toBeNull();
  });
});

/**
 * `provideWrConfig()` is a FALLBACK, not an override: the app-wide `checkbox.size`
 * applies only where the template said nothing, and a bound `[size]` still wins.
 * The first test is the invariant the whole change rests on — with no config the
 * box renders exactly what it always did, which for `md` is no modifier at all.
 */
describe('WrCheckbox + provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SizeHost>>;

  const mount = (providers: EnvironmentProviders[] = []): HTMLElement => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-checkbox')!;
  };

  afterEach(() => fixture.destroy());

  it('renders the md default with no modifier class when nothing is configured', () => {
    expect(mount().className).toBe('wr-checkbox');
  });

  it('takes the configured size when the template binds none', () => {
    expect(mount([provideWrConfig({ checkbox: { size: 'lg' } })]).className).toBe('wr-checkbox wr-checkbox--lg');
  });

  it('lets a bound size beat the configured one', () => {
    const host = mount([provideWrConfig({ checkbox: { size: 'lg' } })]);
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();

    expect(host.classList.contains('wr-checkbox--sm')).toBe(true);
    expect(host.classList.contains('wr-checkbox--lg')).toBe(false);
  });

  it('lets an explicitly bound `md` beat the configured size', () => {
    const host = mount([provideWrConfig({ checkbox: { size: 'lg' } })]);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();

    // The size counterpart of `[rounded]="false"`: `md` is the one bound value
    // that renders as the ABSENCE of a class, so an implementation that treats it
    // as "not set" looks identical to a correct one in every other test here.
    expect(host.className).toBe('wr-checkbox');
  });

  it('ignores a config that names other components', () => {
    expect(mount([provideWrConfig({ switch: { size: 'lg' } })]).className).toBe('wr-checkbox');
  });
});

/**
 * `[id]` is documented as "the id used to associate the native input with its
 * label", and using it used to be exactly what broke that association: Angular
 * feeds a static `id="x"` to the input AND leaves it on the host, so the
 * document held two elements with the id, `<label for>` resolved through
 * `getElementById` to the `<wr-checkbox>` host — not a labelable element — and
 * `input.labels` went from 1 to 0. The host binding that strips it is the fix,
 * and these are the three observable consequences of it.
 */
describe('WrCheckbox with an author-supplied id', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<IdHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-checkbox')!;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-checkbox__input')!;
  const label = (): HTMLLabelElement => root().querySelector<HTMLLabelElement>('label')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(IdHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps the id on the native input and off the host', () => {
    expect(input().id).toBe('cb');
    expect(host().hasAttribute('id')).toBe(false);
  });

  it('leaves exactly one element in the document carrying it', () => {
    expect(root().querySelectorAll('#cb')).toHaveLength(1);
    expect(document.getElementById('cb')).toBe(input());
  });

  it('still labels the control', () => {
    expect(label().htmlFor).toBe('cb');
    expect(input().labels).toHaveLength(1);
  });
});

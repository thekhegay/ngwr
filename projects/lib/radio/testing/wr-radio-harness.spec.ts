import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { WrRadio, WrRadioGroup } from 'ngwr/radio';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrRadioGroupHarness } from './wr-radio-group-harness';
import { WrRadioHarness } from './wr-radio-harness';

/**
 * Carries a `<title>`, which plenty of real icon sets do: it is text INSIDE the
 * `<label>` that is not the option's label, so it is what separates reading
 * `.wr-radio__text` from reading the whole label element.
 */
const CHECK_SVG = '<svg viewBox="0 0 24 24"><title>Done</title><polyline points="4 12 10 18 20 6" /></svg>';

@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <h3 id="size-question">Size</h3>

    <wr-radio-group
      name="size"
      aria-labelledby="size-question"
      [(value)]="picked"
      [disabled]="groupDisabled()"
      (touch)="touched.set(touched() + 1)"
    >
      <wr-radio value="small" size="sm">Small</wr-radio>
      <wr-radio value="medium" icon="check" [disabled]="mediumDisabled()">Medium</wr-radio>
      <wr-radio value="large">Large</wr-radio>
    </wr-radio-group>
  `,
})
class Host {
  readonly picked = signal<unknown>(null);
  readonly groupDisabled = signal(false);
  readonly mediumDisabled = signal(false);
  readonly touched = signal(0);
}

/** The same choices, but the values are objects the template BINDS. */
@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <wr-radio-group aria-label="Size" [(value)]="picked">
      <wr-radio [value]="small">Small</wr-radio>
      <wr-radio [value]="large">Large</wr-radio>
    </wr-radio-group>
  `,
})
class BoundHost {
  readonly small = { id: 'small' };
  readonly large = { id: 'large' };
  readonly picked = signal<unknown>(null);
}

/** Two questions on one page — the shape that catches a group answering for its neighbour. */
@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <wr-radio-group name="size" aria-label="Size">
      <wr-radio value="small">Small</wr-radio>
      <wr-radio value="large">Large</wr-radio>
    </wr-radio-group>

    <wr-radio-group name="colour" aria-label="Colour">
      <wr-radio value="red">Red</wr-radio>
      <wr-radio value="blue">Blue</wr-radio>
    </wr-radio-group>
  `,
})
class TwoHost {}

/**
 * A group whose `name` is BOUND, and one carrying both naming attributes.
 *
 * A literal `name="size"` also survives as a plain attribute on the group element,
 * so a harness reading it there looks right until someone binds it — this host is
 * the one that tells the difference.
 */
@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <h3 id="colour-question">Colour</h3>

    <wr-radio-group aria-label="Ignored" aria-labelledby="colour-question" [name]="groupName()">
      <wr-radio value="red">Red</wr-radio>
      <wr-radio value="blue">Blue</wr-radio>
    </wr-radio-group>
  `,
})
class BoundNameHost {
  readonly groupName = signal('colour');
}

@Component({ imports: [WrRadioGroup], template: '<wr-radio-group />' })
class EmptyHost {}

@Component({ imports: [WrRadio], template: '<wr-radio value="loose">Loose</wr-radio>' })
class BareHost {}

/**
 * Used exactly as a consumer would: through the loader, with no internals touched.
 *
 * Every write is asserted against the HOST's model as well as the DOM. A radio that
 * paints a dot without moving the group's value is the failure that matters here —
 * the dot is a `[checked]` binding and the value is a signal, and only one of them
 * is what the app reads.
 */
describe('WrRadioGroupHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrIcons([svgIcon('check', CHECK_SVG)])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the wiring a screen reader depends on', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    expect(await group.getRole()).toBe('radiogroup');
    // Resolved through `aria-labelledby` to a heading OUTSIDE the group: without a
    // name the group announces three answers and never the question.
    expect(await group.getAccessibleName()).toBe('Size');
  });

  it('lists its options in order', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    expect(await group.getRadioLabels()).toEqual(['Small', 'Medium', 'Large']);
  });

  it('stamps one shared name on every option', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);
    const names = await Promise.all((await group.getRadios()).map(radio => radio.getName()));

    expect(await group.getName()).toBe('size');
    // The shared name is the entire keyboard implementation: it is what makes a
    // browser walk the arrow keys between these three and skip the rest of the page.
    expect([...new Set(names)]).toEqual(['size']);
  });

  it('puts the tab stop on the first option while the question is unanswered', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    expect(await group.getSelectedRadio()).toBeNull();
    expect(await group.getSelectedLabel()).toBeNull();
    // Nothing is checked, so Tab enters on the FIRST enabled option — the tab stop
    // and the answer are only the same radio once there IS an answer.
    expect(await group.getTabStopLabel()).toBe('Small');

    await group.select({ label: 'Large' });

    expect(await group.getTabStopLabel()).toBe('Large');
  });

  it('picks an option, writes it to the host model and unchecks the rest', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    await group.select({ label: 'Large' });

    expect(fixture.componentInstance.picked()).toBe('large');
    expect(await group.getSelectedLabel()).toBe('Large');
    expect(await Promise.all((await group.getRadios()).map(radio => radio.isChecked()))).toEqual([false, false, true]);
  });

  it('follows a value the host writes from outside, tab stop included', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    fixture.componentInstance.picked.set('medium');
    await fixture.whenStable();

    expect(await group.getSelectedLabel()).toBe('Medium');
    expect(await group.getTabStopLabel()).toBe('Medium');
  });

  it('checks one option on its own, and a second check changes nothing', async () => {
    const medium = await loader.getHarness(WrRadioHarness.with({ label: 'Medium' }));

    await medium.check();
    await medium.check();

    expect(await medium.isChecked()).toBe(true);
    expect(fixture.componentInstance.picked()).toBe('medium');
  });

  it('says which options exist when none of them matched', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    // A silent no-op would surface as an unrelated assertion three lines later.
    await expect(group.select({ label: 'Enormous' })).rejects.toThrow(/Small, Medium, Large/);
  });

  it('refuses to pick an option that is disabled on its own', async () => {
    fixture.componentInstance.mediumDisabled.set(true);
    await fixture.whenStable();

    const group = await loader.getHarness(WrRadioGroupHarness);
    const [, medium] = await group.getRadios();

    expect(await medium.isDisabled()).toBe(true);
    expect(await group.isDisabled()).toBe(false);

    await expect(group.select({ label: 'Medium' })).rejects.toThrow(/still unchecked/);
    expect(fixture.componentInstance.picked()).toBeNull();
  });

  it('reports a group disabled as a whole, and stops being a tab stop at all', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);
    expect(await group.isDisabled()).toBe(false);

    fixture.componentInstance.groupDisabled.set(true);
    await fixture.whenStable();

    expect(await group.isDisabled()).toBe(true);
    expect(await group.getTabStopLabel()).toBeNull();
    await expect(group.focusTabStop()).rejects.toThrow(/skips it/);

    await expect(group.select({ label: 'Small' })).rejects.toThrow(/whole group/);
    expect(fixture.componentInstance.picked()).toBeNull();
  });

  it('narrows groups by their disabled state', async () => {
    expect(await loader.getAllHarnesses(WrRadioGroupHarness.with({ disabled: true }))).toEqual([]);

    fixture.componentInstance.groupDisabled.set(true);
    await fixture.whenStable();

    const locked = await loader.getAllHarnesses(WrRadioGroupHarness.with({ disabled: true }));
    expect(await Promise.all(locked.map(group => group.getName()))).toEqual(['size']);
  });

  it('narrows options by label, value, checked and disabled', async () => {
    fixture.componentInstance.mediumDisabled.set(true);
    await fixture.whenStable();

    const group = await loader.getHarness(WrRadioGroupHarness);
    await group.select({ value: 'small' });

    const labels = async (filters: Parameters<typeof group.getRadios>[0]): Promise<string[]> =>
      Promise.all((await group.getRadios(filters)).map(radio => radio.getLabel()));

    expect(await labels({ checked: true })).toEqual(['Small']);
    expect(await labels({ disabled: true })).toEqual(['Medium']);
    expect(await labels({ label: /^L/ })).toEqual(['Large']);
    expect(await labels({ value: 'medium' })).toEqual(['Medium']);
  });

  it('enters the group where Tab would, and a blur marks it touched', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);
    expect(await group.getFocusedLabel()).toBeNull();

    await group.focusTabStop();
    expect(await group.getFocusedLabel()).toBe('Small');

    const small = await loader.getHarness(WrRadioHarness.with({ label: 'Small' }));
    expect(await small.isFocused()).toBe(true);

    await small.blur();

    expect(await small.isFocused()).toBe(false);
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('names the focused option when it is not the first one', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    // Every other focus assertion here lands on option ONE — the tab stop of an
    // unanswered group — so nothing yet tells this apart from a harness that only
    // ever looks at the first radio. An answered group moves the tab stop, and the
    // arrow keys a real browser gives this group move it further.
    await group.select({ label: 'Large' });
    await group.focusTabStop();

    expect(await group.getFocusedLabel()).toBe('Large');

    const medium = await loader.getHarness(WrRadioHarness.with({ label: 'Medium' }));
    await medium.focus();

    expect(await group.getFocusedLabel()).toBe('Medium');
  });

  it('reads what one option is — size, icon, literal value and label binding', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);
    const [small, medium, large] = await group.getRadios();

    expect(await small.getSize()).toBe('sm');
    // `md` ships no modifier class, so its absence is the answer and not a gap.
    expect(await medium.getSize()).toBe('md');
    expect(await medium.hasIcon()).toBe(true);
    expect(await large.hasIcon()).toBe(false);
    // The icon sits inside the same `<label>` as the text and carries a `<title>`
    // of its own: the label is the PROJECTED text, not everything under the label.
    expect(await medium.getLabel()).toBe('Medium');
    expect(await small.getValue()).toBe('small');
    // The `for`/`id` pairing on top of the nesting: the label already names the
    // input it wraps, and `for` is what keeps a label click on this option.
    expect(await small.isLabelBound()).toBe(true);

    await medium.focus();
    expect(await medium.isFocused()).toBe(true);
  });
});

describe('WrRadioGroupHarness — values the DOM never sees', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BoundHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(BoundHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('cannot read a bound value, and picks by label regardless', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);
    const [small, large] = await group.getRadios();

    // The trap this whole harness is shaped around: `value` is `unknown` and the
    // component writes it nowhere — not on the host, not on the native input —
    // so a bound one leaves nothing behind to read or to match against.
    expect(await small.getValue()).toBeNull();
    expect(await large.getValue()).toBeNull();
    expect(await group.getRadios({ value: 'large' })).toEqual([]);

    await group.select({ label: 'Large' });

    expect(await group.getSelectedLabel()).toBe('Large');
    // Picked by label, yet what reached the model is the object the template
    // bound — the same reference, not a string standing in for it.
    expect(fixture.componentInstance.picked()).toBe(fixture.componentInstance.large);
  });
});

describe('WrRadioGroupHarness — two groups on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by name and answers with only its own options', async () => {
    const size = await loader.getHarness(WrRadioGroupHarness.with({ name: 'size' }));
    const colour = await loader.getHarness(WrRadioGroupHarness.with({ name: /^col/ }));

    expect(await size.getRadioLabels()).toEqual(['Small', 'Large']);
    expect(await colour.getRadioLabels()).toEqual(['Red', 'Blue']);
    expect(await size.getAccessibleName()).toBe('Size');
  });

  it('keeps one group from answering for the other', async () => {
    const size = await loader.getHarness(WrRadioGroupHarness.with({ name: 'size' }));
    const colour = await loader.getHarness(WrRadioGroupHarness.with({ name: 'colour' }));

    await size.select({ label: 'Large' });
    await colour.select({ label: 'Red' });

    // Distinct names are the whole of that isolation — one shared name and the
    // browser treats all four as one group, dropping the first answer.
    expect(await size.getSelectedLabel()).toBe('Large');
    expect(await colour.getSelectedLabel()).toBe('Red');
  });
});

describe('WrRadioGroupHarness — a bound name, and two ways to name the question', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BoundNameHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(BoundNameHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the shared name off the radios, which is where a bound one lives', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    // The group element itself has nothing to read: `[name]` is a property binding,
    // unlike the literal `name="size"` the first host writes, which Angular leaves
    // in place as an attribute. Only the radios answer for both forms.
    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-radio-group')!;
    expect(host.hasAttribute('name')).toBe(false);
    expect(await group.getName()).toBe('colour');
    expect(await loader.getAllHarnesses(WrRadioGroupHarness.with({ name: 'colour' }))).toHaveLength(1);
  });

  it('lets aria-labelledby win over aria-label, the way the name computation does', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    // Both are wired, and only one of them is announced: the reference wins, so a
    // harness that preferred `aria-label` would report a name nobody hears.
    expect(await group.getAccessibleName()).toBe('Colour');
  });
});

describe('WrRadioGroupHarness — a group with no options', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<EmptyHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(EmptyHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('refuses the group-level questions, which are all read off the radios', async () => {
    const group = await loader.getHarness(WrRadioGroupHarness);

    expect(await group.getRadioLabels()).toEqual([]);
    expect(await group.getAccessibleName()).toBeNull();
    await expect(group.getName()).rejects.toThrow(/no <wr-radio> children/);
    await expect(group.isDisabled()).rejects.toThrow(/no <wr-radio> children/);
  });
});

describe('WrRadioHarness — outside a group', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('has no standalone shape, because the component refuses to have one', () => {
    // Why the harness family starts at the group: a loose `<wr-radio>` is not a
    // half-working control, it is a build error.
    expect(() => TestBed.createComponent(BareHost)).toThrow(/must be used inside <wr-radio-group>/);
  });
});

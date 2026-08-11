import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
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

/**
 * Two fields on purpose: one that binds nothing, so an app-wide default has room
 * to apply, and one that binds — because the only thing that makes a global
 * config safe is that a template can still override it. The group is here too,
 * since it owns the border once it wraps the input — and it appears in all three
 * forms (unbound, bound, bare attribute) for the same reason the field does: it
 * carries its OWN `rounded` input, resolved by its own lookup, so a case that only
 * ever leaves it unbound says nothing about whether a template can still override
 * the config there.
 */
@Component({
  imports: [WrInput, WrInputGroup],
  template: `
    <wr-input-group>
      <input wrInput placeholder="Unbound" />
    </wr-input-group>
    <input wrInput [wrSize]="size()" [rounded]="rounded()" placeholder="Bound" />
    <input wrInput rounded placeholder="Attribute" />
    <wr-input-group [rounded]="groupRounded()">
      <input wrInput placeholder="Bound group" />
    </wr-input-group>
    <wr-input-group rounded>
      <input wrInput placeholder="Attribute group" />
    </wr-input-group>
  `,
})
class ConfigHost {
  readonly size = signal<WrInputSize | null>(null);
  readonly rounded = signal<boolean | null>(null);
  readonly groupRounded = signal<boolean | null>(null);
}

describe('WrInput defaults from provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;

  const mount = (providers: unknown[] = []): ConfigHost => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  const at = (placeholder: string): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
  const group = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-input-group')!;
  /** The group wrapping a given field — the groups differ only by what they bind. */
  const groupOf = (placeholder: string): HTMLElement => at(placeholder).closest('wr-input-group')!;

  afterEach(() => fixture.destroy());

  it('renders exactly as before when no config is provided', () => {
    // The invariant the whole change rests on: an unbound field is `md` and square,
    // which means no modifier class at all.
    mount();

    expect(at('Unbound').className).toBe('wr-input');
    expect(group().className).toBe('wr-input-group');
  });

  it('takes size and shape from the config when the template says nothing', () => {
    mount([provideWrConfig({ input: { size: 'sm', rounded: true } })]);

    expect(at('Unbound').classList.contains('wr-input--sm')).toBe(true);
    expect(at('Unbound').classList.contains('wr-input--rounded')).toBe(true);
    // The group has to follow, or the pill radius lands on an input whose chrome the
    // group already took over and the visible corner stays square.
    expect(group().classList.contains('wr-input-group--rounded')).toBe(true);
  });

  it('lets a bound value beat the config', () => {
    const host = mount([provideWrConfig({ input: { size: 'sm', rounded: true } })]);
    host.size.set('lg');
    fixture.detectChanges();

    expect(at('Bound').classList.contains('wr-input--lg')).toBe(true);
    expect(at('Bound').classList.contains('wr-input--sm')).toBe(false);
  });

  it('lets a bound `false` turn a configured `rounded` back off', () => {
    // The case that decides whether the config is escapable at all: `false` is a
    // value, not an absence, so it must not fall through to the configured `true`.
    const host = mount([provideWrConfig({ input: { rounded: true } })]);
    host.rounded.set(false);
    fixture.detectChanges();

    expect(at('Bound').classList.contains('wr-input--rounded')).toBe(false);
    // …and the field next to it, which bound nothing, still takes the config.
    expect(at('Unbound').classList.contains('wr-input--rounded')).toBe(true);
  });

  it('still reads a bare `rounded` attribute as true', () => {
    // The transform maps only `null` / `undefined` to "not set". A valueless
    // attribute arrives as `''`, which is a value the author wrote — folding it in
    // with the absences would silently un-round every consumer using this form.
    mount();

    expect(at('Attribute').classList.contains('wr-input--rounded')).toBe(true);
  });

  it('ignores a config that names other components', () => {
    mount([provideWrConfig({ textarea: { size: 'sm' }, select: { rounded: true } })]);

    expect(at('Unbound').className).toBe('wr-input');
  });

  it('goes back to the config when a binding is cleared', () => {
    const host = mount([provideWrConfig({ input: { size: 'sm' } })]);
    host.size.set('lg');
    fixture.detectChanges();
    expect(at('Bound').classList.contains('wr-input--lg')).toBe(true);

    host.size.set(null);
    fixture.detectChanges();
    expect(at('Bound').classList.contains('wr-input--sm')).toBe(true);
  });

  it('goes back to the config when a `rounded` binding is cleared', () => {
    // `rounded`'s own clearing path, not `wrSize`'s: it is the one that goes through
    // the null-preserving transform, and a transform that folded `null` into `false`
    // would leave this field permanently square with no way to ask for the default
    // back. Every other case here still passes with that folding in place.
    const host = mount([provideWrConfig({ input: { rounded: true } })]);
    host.rounded.set(false);
    fixture.detectChanges();
    expect(at('Bound').classList.contains('wr-input--rounded')).toBe(false);

    host.rounded.set(null);
    fixture.detectChanges();
    expect(at('Bound').classList.contains('wr-input--rounded')).toBe(true);
  });

  it('lets a bound `false` on the group beat a configured `rounded`', () => {
    // The group resolves the config itself, so it needs its own escape hatch: an
    // author who squares one group off must not be overruled by the app-wide value.
    const host = mount([provideWrConfig({ input: { rounded: true } })]);
    host.groupRounded.set(false);
    fixture.detectChanges();

    expect(groupOf('Bound group').classList.contains('wr-input-group--rounded')).toBe(false);
    // …while the group beside it, which binds nothing, still takes the config.
    expect(group().classList.contains('wr-input-group--rounded')).toBe(true);
  });

  it('hands the group back to the config when its own binding is cleared', () => {
    const host = mount([provideWrConfig({ input: { rounded: true } })]);
    host.groupRounded.set(false);
    fixture.detectChanges();
    expect(groupOf('Bound group').classList.contains('wr-input-group--rounded')).toBe(false);

    host.groupRounded.set(null);
    fixture.detectChanges();
    expect(groupOf('Bound group').classList.contains('wr-input-group--rounded')).toBe(true);
  });

  it('leaves a null-bound group as before and still reads its bare attribute as true', () => {
    // The group's half of the invariant, with no config in play: `[rounded]="null"`
    // renders the bare class list it always did, and `<wr-input-group rounded>` — the
    // documented attribute form — still rounds. Nothing else here exercises either.
    mount();

    expect(groupOf('Bound group').className).toBe('wr-input-group');
    expect(groupOf('Attribute group').className).toBe('wr-input-group wr-input-group--rounded');
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

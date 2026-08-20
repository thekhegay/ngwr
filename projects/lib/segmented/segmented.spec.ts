import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, disabled, form, required } from '@angular/forms/signals';

import { Subject } from 'rxjs';

import { WrFormField } from 'ngwr/form';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSegmentedOption } from './interfaces';
import { WrSegmented } from './segmented';

@Component({
  imports: [WrSegmented],
  template: `<wr-segmented [options]="options()" [(value)]="picked" [disabled]="disabled()" />`,
})
class Host {
  readonly options = signal<readonly WrSegmentedOption<string>[]>([
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month', disabled: true },
  ]);
  readonly picked = signal<string | null>('day');
  readonly disabled = signal(false);
}

/**
 * A segmented control is a row of toggle buttons over one value, so the state
 * a screen reader needs is `aria-pressed` — exactly one segment pressed, moving
 * with the value. The sliding thumb is decoration and is correctly hidden from
 * assistive tech.
 */
describe('WrSegmented', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const segments = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-segmented__option')];
  const pressed = (): string[] => segments().map(s => s.getAttribute('aria-pressed')!);
  const picked = (): string | null => fixture.componentInstance.picked();

  const click = (index: number): void => {
    segments()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('groups the segments and renders one per option', () => {
    expect(root().querySelector('wr-segmented')!.getAttribute('role')).toBe('group');
    expect(segments().map(s => s.textContent.trim())).toEqual(['Day', 'Week', 'Month']);
  });

  it('presses exactly the selected segment', () => {
    expect(pressed()).toEqual(['true', 'false', 'false']);
  });

  it('moves the pressed state with the value', () => {
    click(1);

    expect(picked()).toBe('week');
    expect(pressed()).toEqual(['false', 'true', 'false']);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.picked.set('week');
    fixture.detectChanges();

    expect(pressed()).toEqual(['false', 'true', 'false']);
  });

  it('presses nothing for a value that matches no option', () => {
    fixture.componentInstance.picked.set('year');
    fixture.detectChanges();

    expect(pressed()).toEqual(['false', 'false', 'false']);
  });

  it('refuses a segment disabled by its own option', () => {
    click(2);

    expect(picked()).toBe('day');
  });

  it('disables every segment from the host', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    click(1);
    expect(picked()).toBe('day');
  });

  it('hides the sliding thumb from assistive tech', () => {
    // It is a decoration that tracks the selection; announced, it would be a
    // stray unlabelled element inside the group.
    expect(root().querySelector('.wr-segmented__thumb')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('rebuilds when the options change', () => {
    fixture.componentInstance.options.set([
      { value: 'list', label: 'List' },
      { value: 'grid', label: 'Grid' },
    ]);
    fixture.detectChanges();

    expect(segments().map(s => s.textContent.trim())).toEqual(['List', 'Grid']);
  });
});

/**
 * The thumb's position is the one thing here that cannot come out of the
 * stylesheet alone. It is anchored with a physical `left` and slid with
 * `translateX`, and neither has a logical form — while the options are a grid
 * that mirrors, so under `dir="rtl"` the segment at index `i` occupies the slot
 * `count - 1 - i` counted from the physical left. So the component publishes the
 * SLOT, signed from `Directionality`, the way the carousel signs its track.
 *
 * Every case is a pair: the same selection in both directions, expecting
 * different slots. One direction alone cannot tell "mirrors" from "counts from
 * the left in both".
 *
 * What jsdom cannot answer is whether the pill then lands on that segment —
 * there is no layout and the stylesheet is not applied. The custom property is
 * the input to that, and it is the part a unit test can honestly check.
 */
describe('WrSegmented parks its thumb by the reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const mount = (direction: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: direction, valueSignal: signal(direction), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  /** The slot the component publishes, off the host's own inline style. */
  const slot = (): string =>
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('wr-segmented')!
      .style.getPropertyValue('--wr-segmented-thumb-index');

  afterEach(() => fixture.destroy());

  it('counts slots from the left in LTR', () => {
    mount('ltr');
    expect(slot()).toBe('0'); // 'day', the first of three

    fixture.componentInstance.picked.set('week');
    fixture.detectChanges();
    expect(slot()).toBe('1');
  });

  it('counts them from the right in RTL, where the strip mirrors', () => {
    mount('rtl');
    expect(slot()).toBe('2'); // 'day' is still first to READ, and last from the left

    fixture.componentInstance.picked.set('week');
    fixture.detectChanges();
    expect(slot()).toBe('1'); // the middle segment is the fixed point, in either direction
  });

  it('keeps the divisor the segment count in both directions', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      mount(direction);
      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector<HTMLElement>('wr-segmented')!
          .style.getPropertyValue('--wr-segmented-thumb-count')
      ).toBe('3');
    }
  });

  it('needs no provider at all when nobody set a direction', () => {
    // `optional: true` — the same guarantee the carousel and the table make. A
    // consumer who never thought about `dir` must not have to provide one.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(slot()).toBe('0');
  });
});

/**
 * The signal-forms half. `<wr-segmented>` implements `FormValueControl<T | null>`,
 * so `[formField]` writes the component's own `value` model with no
 * `ControlValueAccessor` in between — and the round trip has to hold in both
 * directions, or the strip is a picture of a form control rather than one.
 *
 * `touch` is the part with no visible symptom: a field that is never marked
 * touched never shows its validation copy, so a strip a user tabbed straight past
 * looks valid forever. That is the case `touched` exists for, and the reason the
 * component listens for `focusout` on its host rather than for a click.
 */
@Component({
  imports: [FormField, WrFormField, WrSegmented],
  template: `
    <wr-form-field label="Range">
      <wr-segmented [options]="options" [formField]="schedule.range" />
    </wr-form-field>
  `,
})
class FieldHost {
  readonly options: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];

  readonly model = signal({ range: '' });
  readonly schedule = form(this.model, path => {
    required(path.range);
  });
}

@Component({
  imports: [FormField, WrSegmented],
  template: `<wr-segmented [options]="options" [formField]="schedule.range" />`,
})
class DisabledFieldHost {
  readonly options: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];

  readonly locked = signal(true);
  readonly model = signal({ range: 'day' });
  readonly schedule = form(this.model, path => {
    disabled(path.range, () => this.locked());
  });
}

describe('WrSegmented as a signal-forms control', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FieldHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const segments = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-segmented__option')];
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-segmented')!;
  const schedule = (): FieldHost['schedule'] => fixture.componentInstance.schedule;

  /** Take focus out of the strip entirely — the only thing that marks the field touched. */
  const leave = (): void => {
    segments()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the value the field already holds', () => {
    fixture.componentInstance.model.set({ range: 'week' });
    fixture.detectChanges();

    expect(segments().map(s => s.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });

  it('writes the picked segment back into the field', () => {
    segments()[1].click();
    fixture.detectChanges();

    expect(schedule()().value()).toEqual({ range: 'week' });
  });

  it('leaves the field untouched until focus leaves the strip', () => {
    // A click alone is not enough, and neither is moving between segments: this is
    // the state a strip tabbed straight past has to end up in.
    expect(schedule().range().touched()).toBe(false);

    segments()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: segments()[1] }));
    fixture.detectChanges();
    expect(schedule().range().touched()).toBe(false);
  });

  it('marks the field touched when focus leaves', () => {
    leave();

    expect(schedule().range().touched()).toBe(true);
  });

  it('surfaces the required error through <wr-form-field> once touched', () => {
    // No `<wr-form-error>` markup anywhere above: the copy comes from the field's
    // own catalog lookup, which is the whole point of implementing the interface.
    expect(root().querySelector('.wr-form-field__error')).toBeNull();

    leave();

    const message = root().querySelector('.wr-form-field__error');
    expect(message).not.toBeNull();
    expect(message!.textContent?.trim()).not.toBe('');
    expect(root().querySelector('.wr-form-field--invalid')).not.toBeNull();
  });

  it('points the group at the message, and only while there is one', () => {
    // `aria-describedby` and `aria-invalid` sit on the host rather than on a
    // segment: the group is the field, and repeated per segment the message would
    // be announced once per Tab. Both are ARIA globals, so `role="group"` takes them.
    expect(host().hasAttribute('aria-describedby')).toBe(false);
    expect(host().hasAttribute('aria-invalid')).toBe(false);

    leave();

    const describedBy = host().getAttribute('aria-describedby');
    expect(host().getAttribute('aria-invalid')).toBe('true');
    expect(
      root()
        .querySelector(`#${CSS.escape(describedBy!)}`)
        ?.textContent?.trim()
    ).not.toBe('');
  });

  it('answers to the id the label points at, on the first segment', () => {
    // Resolved through the DOM rather than off the attribute: an id that merely
    // exists somewhere is exactly what the bug looked like. `<wr-segmented>` is not
    // labelable, so the `for` has to name a segment, and the first is where clicking
    // the label should land a user.
    const label = root().querySelector<HTMLLabelElement>('label')!;
    expect(label.htmlFor).not.toBe('');

    expect(root().querySelector(`#${CSS.escape(label.htmlFor)}`)).toBe(segments()[0]);
    expect(segments()[1].hasAttribute('id')).toBe(false);
  });

  it('stamps no id on a strip standing on its own', () => {
    // The field supplies the id; a bare control inventing one would put a
    // document-global name on a button nothing points at.
    const bare = TestBed.createComponent(Host);
    bare.detectChanges();

    const first = (bare.nativeElement as HTMLElement).querySelector('.wr-segmented__option')!;
    expect(first.getAttribute('id')).toBeNull();
    bare.destroy();
  });

  it('takes its disabled state from the field', () => {
    const disabledFixture = TestBed.createComponent(DisabledFieldHost);
    disabledFixture.detectChanges();

    const strip = (disabledFixture.nativeElement as HTMLElement).querySelector('wr-segmented')!;
    expect(strip.classList.contains('wr-segmented--disabled')).toBe(true);

    disabledFixture.componentInstance.locked.set(false);
    disabledFixture.detectChanges();
    expect(strip.classList.contains('wr-segmented--disabled')).toBe(false);
    disabledFixture.destroy();
  });
});

/**
 * The classic bindings, which reach the same `value` model through the accessor
 * Angular synthesises for a signal-forms control. Nothing in the component knows
 * about either of them — which is exactly why they are worth pinning: the bridge
 * is Angular's, and a change to how `value` is declared is what would quietly
 * break it.
 */
@Component({
  imports: [FormsModule, ReactiveFormsModule, WrSegmented],
  template: `
    <wr-segmented aria-label="Model" [options]="options" [(ngModel)]="legacy" />
    <wr-segmented aria-label="Reactive" [options]="options" [formControl]="reactive" />
  `,
})
class ClassicFormsHost {
  readonly options: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];

  legacy = 'day';
  readonly reactive = new FormControl<string | null>('day');
}

describe('WrSegmented under the classic forms bridge', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ClassicFormsHost>>;

  const strip = (index: number): HTMLElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-segmented')][index];
  const segments = (index: number): HTMLElement[] => [
    ...strip(index).querySelectorAll<HTMLElement>('.wr-segmented__option'),
  ];
  const pressed = (index: number): string[] => segments(index).map(s => s.getAttribute('aria-pressed')!);

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ClassicFormsHost);
    fixture.detectChanges();
    // `[(ngModel)]` writes its initial value from a microtask, one turn after the
    // first pass — so the strip is unpressed until the render that follows it.
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders and writes back through [(ngModel)]', async () => {
    expect(pressed(0)).toEqual(['true', 'false']);

    segments(0)[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.legacy).toBe('week');
    expect(pressed(0)).toEqual(['false', 'true']);
  });

  it('renders and writes back through [formControl]', async () => {
    expect(pressed(1)).toEqual(['true', 'false']);

    segments(1)[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.reactive.value).toBe('week');

    fixture.componentInstance.reactive.setValue('day');
    await fixture.whenStable();
    expect(pressed(1)).toEqual(['true', 'false']);
  });

  it('marks a reactive control touched when focus leaves the strip', () => {
    expect(fixture.componentInstance.reactive.touched).toBe(false);

    segments(1)[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    fixture.detectChanges();

    expect(fixture.componentInstance.reactive.touched).toBe(true);
  });
});

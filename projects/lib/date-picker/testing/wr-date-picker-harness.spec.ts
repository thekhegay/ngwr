import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateAdapter } from 'ngwr/date';
import { WrDatePicker, WrDateRangePicker, type WrDateRange } from 'ngwr/date-picker';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDatePickerHarness } from './wr-date-picker-harness';
import { WrDateRangePickerHarness } from './wr-date-range-picker-harness';

@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker
      placeholder="Pick a day"
      [(value)]="picked"
      [mode]="mode()"
      [format]="format()"
      [min]="min()"
      [max]="max()"
      [timeFormat]="timeFormat()"
      [showSeconds]="showSeconds()"
      [panelAriaLabel]="panelAriaLabel()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (touch)="touched.set(touched() + 1)"
    />
  `,
})
class Host {
  readonly picked = signal<Date | null>(new Date(2025, 0, 15, 10, 30));
  readonly mode = signal<'date' | 'time' | 'datetime'>('date');
  readonly format = signal<string | null>('dd.MM.yyyy');
  readonly min = signal<Date | undefined>(undefined);
  readonly max = signal<Date | undefined>(undefined);
  readonly timeFormat = signal<'auto' | '12h' | '24h'>('24h');
  readonly showSeconds = signal(false);
  readonly panelAriaLabel = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly touched = signal(0);
}

@Component({
  imports: [WrDatePicker],
  template: '<wr-date-picker [(value)]="picked" />',
})
class TodayHost {
  readonly picked = signal<Date | null>(new Date());
}

@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker placeholder="Arrival" format="dd.MM.yyyy" [(value)]="arrival" />
    <wr-date-picker placeholder="Departure" format="dd.MM.yyyy" [(value)]="departure" />
  `,
})
class TwoHost {
  readonly arrival = signal<Date | null>(new Date(2025, 0, 15));
  readonly departure = signal<Date | null>(new Date(2025, 5, 20));
}

@Component({
  imports: [WrDateRangePicker],
  template: `
    <wr-date-range-picker
      startPlaceholder="From"
      endPlaceholder="To"
      [(value)]="period"
      [mode]="mode()"
      [format]="format()"
      [timeFormat]="timeFormat()"
      [disabled]="disabled()"
      [readonly]="readonly()"
    />
  `,
})
class RangeHost {
  readonly period = signal<WrDateRange | null>([new Date(2025, 0, 14), new Date(2025, 0, 20)]);
  readonly mode = signal<'date' | 'datetime'>('date');
  readonly format = signal<string | null>('dd.MM.yyyy');
  readonly timeFormat = signal<'auto' | '12h' | '24h'>('24h');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
}

/**
 * The picker is a text field plus a popup, and the popup is a CDK overlay — the
 * calendar and the time steppers land in the overlay container, not in the
 * fixture, which is the whole reason the harness scopes its panel queries by the
 * id the trigger publishes as `aria-controls`. `provideWrOverlay()` keeps this
 * file's container out of the next one's, and `provideWrDateAdapter()` is
 * mandatory: without an adapter the picker cannot format or parse anything.
 *
 * The locale is pinned to `en-US` so the grid's first day of week and the month
 * names are stable, and the hosts pass an explicit token `format` — the named
 * keys (`shortDate`, …) go through `Intl`, whose output varies by ICU build.
 */
describe('WrDatePickerHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('opens and closes the popup', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    expect(await picker.isOpen()).toBe(false);

    await picker.open();
    expect(await picker.isOpen()).toBe(true);

    await picker.close();
    expect(await picker.isOpen()).toBe(false);
  });

  it('reads the field, the placeholder and the mode', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);

    expect(await picker.getValueText()).toBe('15.01.2025');
    expect(await picker.getPlaceholder()).toBe('Pick a day');
    expect(await picker.getMode()).toBe('date');
    expect(await picker.isDisabled()).toBe(false);
    expect(await picker.isReadonly()).toBe(false);
  });

  it('presents the popup as a named dialog, and takes an override for the name', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    expect(await picker.getPanelRole()).toBe('dialog');
    expect(await picker.getPanelAriaLabel()).toBe('Choose date');

    // The name is written onto the pane at open time, so it takes a reopen.
    await picker.close();
    fixture.componentInstance.panelAriaLabel.set('Delivery window');
    fixture.detectChanges();
    await picker.open();

    expect(await picker.getPanelAriaLabel()).toBe('Delivery window');
  });

  it('reads the calendar header and the weekday strip', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    // The month on show follows the bound value, not today.
    expect(await picker.getPanelHeader()).toBe('January 2025');
    expect(await picker.getView()).toBe('day');
    expect(await picker.getWeekdayLabels()).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });

  it('exposes the day cells with their grid role and state', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    const days = await picker.getDays();
    // Six weeks, always — which is why the first cell belongs to December.
    expect(days).toHaveLength(42);
    expect(await days[0].isOutOfMonth()).toBe(true);

    const fifteenth = await picker.getDay(15);
    expect(await fifteenth.getRole()).toBe('gridcell');
    expect(await fifteenth.getText()).toBe('15');
    expect(await fifteenth.getDayOfMonth()).toBe(15);
    expect(await fifteenth.isSelected()).toBe(true);
    expect(await fifteenth.isOutOfMonth()).toBe(false);
    expect(await fifteenth.isInRange()).toBe(false);
    expect(await (await picker.getDay(16)).isSelected()).toBe(false);
  });

  it('answers which cell is the grid’s single tab stop', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    const roving: number[] = [];
    for (const day of await picker.getDays()) {
      if (await day.isActive()) roving.push(await day.getDayOfMonth());
    }

    // Exactly one cell carries the roving tabindex, and it is the selected day.
    expect(roving).toEqual([15]);
  });

  it('picks a day out of the grid, writes it back and closes', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.selectDay(20);

    expect(fixture.componentInstance.picked()?.getDate()).toBe(20);
    expect(await picker.getValueText()).toBe('20.01.2025');
    expect(await picker.isOpen()).toBe(false);
  });

  it('narrows day cells by their state', async () => {
    fixture.componentInstance.min.set(new Date(2025, 0, 10));
    fixture.componentInstance.max.set(new Date(2025, 0, 20));
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    const closed = await picker.getDays({ disabled: true });
    expect(await Promise.all(closed.map(day => day.getDayOfMonth()))).toContain(5);

    const selected = await picker.getDays({ selected: true });
    expect(await Promise.all(selected.map(day => day.getDayOfMonth()))).toEqual([15]);

    const numbered = await picker.getDays({ text: '15' });
    expect(numbered).toHaveLength(1);

    // A string filter is an EXACT match, never a substring: the two cells reading
    // "1" are the 1st of January and the 1st of February the last row spills
    // into — `10`…`19`, `21` and `31` are not among them.
    const ones = await picker.getDays({ text: '1' });
    expect(ones).toHaveLength(2);
    expect(await ones[0].isOutOfMonth()).toBe(false);
    expect(await ones[1].isOutOfMonth()).toBe(true);

    // A single-value calendar never fills a range interior.
    expect(await picker.getDays({ inRange: true })).toEqual([]);
    expect(await (await picker.getDay(15)).isDisabled()).toBe(false);
  });

  it('refuses to pick a day the bounds rule out, and a direct click on it does nothing', async () => {
    fixture.componentInstance.min.set(new Date(2025, 0, 10));
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    await expect(picker.selectDay(5)).rejects.toThrow(/disabled/);

    // The cell is a disabled <button>: the click is swallowed rather than refused
    // loudly, which is exactly why selectDay() checks first.
    await (await picker.getDay(5)).click();
    expect(fixture.componentInstance.picked()?.getDate()).toBe(15);
  });

  it('refuses to read the popup while it is closed', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);

    // A silent empty list would turn into a confusing failure three lines later.
    await expect(picker.getDays()).rejects.toThrow(/closed/);
    await expect(picker.getPanelHeader()).rejects.toThrow(/closed/);
  });

  it('says which day is not on the month it is showing', async () => {
    fixture.componentInstance.picked.set(new Date(2025, 1, 10));
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    // The 30th of February does not exist; the 30th of January is on screen as a
    // padding cell and is deliberately not matched.
    await expect(picker.getDay(30)).rejects.toThrow(/February 2025/);
  });

  it('types a date into the field', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.setValueText('20.01.2025');

    expect(fixture.componentInstance.picked()?.getDate()).toBe(20);
    expect(await picker.getValueText()).toBe('20.01.2025');
  });

  it('commits nothing while a partial date is being typed', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    // setValueText() empties the field first — which clears the value, exactly as
    // selecting all and typing over it does — and `20.0` never parses, so nothing
    // replaces it.
    await picker.setValueText('20.0');

    expect(fixture.componentInstance.picked()).toBeNull();
    expect(await picker.getValueText()).toBe('20.0');
  });

  it('clears the value by emptying the field', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.clear();

    expect(fixture.componentInstance.picked()).toBeNull();
    expect(await picker.getValueText()).toBe('');
  });

  it('focuses and blurs the field, and blur reports the control as touched', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);

    await picker.focus();
    expect(await picker.isFocused()).toBe(true);

    await picker.blur();
    expect(await picker.isFocused()).toBe(false);
    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('steps between months', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    await picker.previous();
    expect(await picker.getPanelHeader()).toBe('December 2024');

    await picker.next();
    await picker.next();
    expect(await picker.getPanelHeader()).toBe('February 2025');
  });

  it('zooms out to months and years, and picks its way back in', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    await picker.zoomOut();
    expect(await picker.getView()).toBe('month');
    expect(await picker.getPanelHeader()).toBe('2025');

    await picker.zoomOut();
    expect(await picker.getView()).toBe('year');
    expect(await picker.getPanelHeader()).toBe('2016 – 2027');

    // The header is inert at the year view — there is nothing further out.
    await expect(picker.zoomOut()).rejects.toThrow(/inert/);

    await picker.selectYear(2020);
    expect(await picker.getView()).toBe('month');
    expect(await picker.getPanelHeader()).toBe('2020');

    await picker.selectMonth(2);
    expect(await picker.getView()).toBe('day');
    expect(await picker.getPanelHeader()).toBe('March 2020');
    expect(await picker.getDays()).toHaveLength(42);
  });

  it('picks a month by the label the calendar renders', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.zoomOut();
    await picker.selectMonth('Mar');

    expect(await picker.getPanelHeader()).toBe('March 2025');
  });

  it('steps the year window, and says which years are on show', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.zoomOut();
    await picker.zoomOut();

    await expect(picker.selectYear(1999)).rejects.toThrow(/2016-2027/);

    await picker.next();
    expect(await picker.getPanelHeader()).toBe('2028 – 2039');
  });

  it('refuses the day methods while the calendar is zoomed out', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.zoomOut();

    await expect(picker.getDays()).rejects.toThrow(/no day grid/);
    await expect(picker.selectMonth(99)).rejects.toThrow(/no such month/);
  });

  it('refuses the time methods in date mode', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    await expect(picker.getTime()).rejects.toThrow(/no time stepper/);
    await expect(picker.setTime({ hours: 9 })).rejects.toThrow(/no time stepper/);
  });

  it('does not open while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDatePickerHarness);

    expect(await picker.isDisabled()).toBe(true);
    await expect(picker.open()).rejects.toThrow(/disabled/);
  });

  it('still opens while readonly — the field is untypeable, not inert', async () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDatePickerHarness);

    expect(await picker.isReadonly()).toBe(true);
    await picker.open();
    expect(await picker.getPanelHeader()).toBe('January 2025');
  });

  it('narrows by text, placeholder, mode and disabled state', async () => {
    const byText = await loader.getHarness(WrDatePickerHarness.with({ text: '15.01.2025' }));
    expect(await byText.getPlaceholder()).toBe('Pick a day');

    const byPlaceholder = await loader.getHarness(WrDatePickerHarness.with({ placeholder: /Pick/ }));
    expect(await byPlaceholder.getValueText()).toBe('15.01.2025');

    expect(await loader.getAllHarnesses(WrDatePickerHarness.with({ mode: 'date' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrDatePickerHarness.with({ mode: 'time' }))).toHaveLength(0);
    expect(await loader.getAllHarnesses(WrDatePickerHarness.with({ disabled: true }))).toHaveLength(0);
  });
});

describe('WrDatePickerHarness — time mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.mode.set('time');
    fixture.componentInstance.format.set('HH:mm');
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('offers a time stepper instead of a calendar', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    expect(await picker.getMode()).toBe('time');
    expect(await picker.getPanelAriaLabel()).toBe('Choose time');
    expect(await picker.getTime()).toBe('10:30');

    // Everything calendar-shaped fails with a reason rather than answering emptily.
    await expect(picker.getView()).rejects.toThrow(/no calendar/);
    await expect(picker.getPanelHeader()).rejects.toThrow(/no calendar/);
    await expect(picker.next()).rejects.toThrow(/no calendar/);
    await expect(picker.getWeekdayLabels()).rejects.toThrow(/weekday strip/);
    await expect(picker.getDays()).rejects.toThrow(/no day grid/);
  });

  it('steps the hours and stays open', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.stepTime('hours', 1);

    expect(await picker.getTime()).toBe('11:30');
    expect(await picker.getValueText()).toBe('11:30');
    expect(fixture.componentInstance.picked()?.getHours()).toBe(11);
    // Editing a time is not one decisive action — the popup survives it.
    expect(await picker.isOpen()).toBe(true);

    await picker.stepTime('minutes', -1);
    expect(await picker.getTime()).toBe('11:29');
  });

  it('types into one box and leaves the others alone', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();
    await picker.setTime({ minutes: 45 });

    expect(await picker.getTime()).toBe('10:45');
    expect(fixture.componentInstance.picked()?.getMinutes()).toBe(45);
  });

  it('renders a seconds column only on request', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    await expect(picker.stepTime('seconds', 1)).rejects.toThrow(/seconds column/);

    await picker.close();
    fixture.componentInstance.showSeconds.set(true);
    fixture.componentInstance.format.set('HH:mm:ss');
    fixture.detectChanges();
    await picker.open();

    expect(await picker.getTime()).toBe('10:30:00');

    await picker.setTime({ seconds: 15 });
    expect(await picker.getTime()).toBe('10:30:15');
    expect(await picker.getValueText()).toBe('10:30:15');
  });

  it('never mistakes the AM / PM arrows for a seconds column', async () => {
    fixture.componentInstance.timeFormat.set('12h');
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    // The AM/PM column contributes its own ▲ / ▼ and is always last, so with
    // seconds off the panel's THIRD ▲ is the meridiem toggle. Asking for seconds
    // has to fail loudly rather than quietly flip AM to PM.
    await expect(picker.stepTime('seconds', 1)).rejects.toThrow(/seconds column/);
    expect(await picker.getTime()).toBe('10:30 AM');
  });

  it('offers AM / PM only in 12-hour mode', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    await expect(picker.toggleMeridiem()).rejects.toThrow(/24-hour/);

    await picker.close();
    fixture.componentInstance.timeFormat.set('12h');
    fixture.detectChanges();
    await picker.open();

    expect(await picker.getTime()).toBe('10:30 AM');

    await picker.toggleMeridiem();
    expect(await picker.getTime()).toBe('10:30 PM');
    expect(fixture.componentInstance.picked()?.getHours()).toBe(22);
  });
});

describe('WrDatePickerHarness — datetime mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.mode.set('datetime');
    fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('offers a calendar and a stepper together, and keeps the popup up when a day is picked', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    expect(await picker.getMode()).toBe('datetime');
    expect(await picker.getPanelAriaLabel()).toBe('Choose date and time');
    expect(await picker.getPanelHeader()).toBe('January 2025');
    expect(await picker.getTime()).toBe('10:30');

    await picker.selectDay(20);

    // Documented difference from date mode: the user is usually about to set the
    // time next, so the popup stays.
    expect(await picker.isOpen()).toBe(true);
    expect(await picker.getTime()).toBe('10:30');
    expect(await picker.getValueText()).toBe('20.01.2025 10:30');
  });
});

describe('WrDatePickerHarness — today', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TodayHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(TodayHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('marks today’s cell', async () => {
    const picker = await loader.getHarness(WrDatePickerHarness);
    await picker.open();

    const today = await picker.getDay(new Date().getDate());
    expect(await today.isToday()).toBe(true);
  });
});

describe('WrDatePickerHarness — two on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  /**
   * Both popups up at once. Opened from the keyboard deliberately: a click on the
   * second trigger is an outside pointer event for the first popup, which closes
   * it — and one panel in a shared overlay container proves nothing about scoping.
   * Alt+ArrowDown is the APG route in, and the only open path that is not a
   * pointer event.
   */
  const openBoth = async (): Promise<WrDatePickerHarness[]> => {
    const root = fixture.nativeElement as HTMLElement;
    for (const field of root.querySelectorAll<HTMLInputElement>('input')) {
      field.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true })
      );
    }
    await fixture.whenStable();

    return loader.getAllHarnesses(WrDatePickerHarness);
  };

  it('reads only its own popup while both are open', async () => {
    const [arrival, departure] = await openBoth();

    expect(await arrival.isOpen()).toBe(true);
    expect(await departure.isOpen()).toBe(true);

    // A bare `.wr-calendar` query would answer with the first picker's panel for
    // both of these.
    expect(await arrival.getPanelHeader()).toBe('January 2025');
    expect(await departure.getPanelHeader()).toBe('June 2025');
    expect(await (await arrival.getDay(15)).isSelected()).toBe(true);
    expect(await (await departure.getDay(15)).isSelected()).toBe(false);
    expect(await (await departure.getDay(20)).isSelected()).toBe(true);
  });

  it('answers per popup for the LIST queries too, not just the single ones', async () => {
    // The plural panel query is a separate code path from the single-element one,
    // and it is the one that fails quietly: two day grids render seven weekday
    // headers each, so an unscoped query answers fourteen rather than throwing.
    // Reads only, no clicks — a click inside one popup is an outside pointer event
    // for the other, which dismisses it, so the both-open state does not survive
    // one. (Which is also why the chip methods, which read and click in one go,
    // cannot leak in practice.)
    const [arrival, departure] = await openBoth();

    expect(await arrival.getWeekdayLabels()).toHaveLength(7);
    expect(await departure.getWeekdayLabels()).toHaveLength(7);
    expect(await arrival.getWeekdayLabels()).toEqual(await departure.getWeekdayLabels());
  });

  it('closes its own popup rather than whichever opened last', async () => {
    const [arrival, departure] = await openBoth();
    expect(await arrival.isOpen()).toBe(true);
    expect(await departure.isOpen()).toBe(true);

    await arrival.close();

    // close() toggles this picker's OWN trigger. Escape would go to the CDK's
    // top-most overlay instead — the departure popup, which opened last — and
    // leave the one that was asked to close still up.
    expect(await arrival.isOpen()).toBe(false);
  });

  it('narrows to the picker whose popup is up', async () => {
    const [arrival] = await loader.getAllHarnesses(WrDatePickerHarness);
    await arrival.open();

    const open = await loader.getHarness(WrDatePickerHarness.with({ open: true }));
    expect(await open.getPlaceholder()).toBe('Arrival');
    expect(await loader.getAllHarnesses(WrDatePickerHarness.with({ open: false }))).toHaveLength(1);
  });
});

describe('WrDateRangePickerHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RangeHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const period = (): WrDateRange | null => fixture.componentInstance.period();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(RangeHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads both fields, the separator and the placeholders', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);

    expect(await picker.getStartText()).toBe('14.01.2025');
    expect(await picker.getEndText()).toBe('20.01.2025');
    expect(await picker.getSeparator()).toBe('–');
    expect(await picker.getPlaceholder('start')).toBe('From');
    expect(await picker.getPlaceholder('end')).toBe('To');
    expect(await picker.getMode()).toBe('date');
    expect(await picker.isDisabled()).toBe(false);
    expect(await picker.isReadonly()).toBe(false);
  });

  it('picks a range out of one calendar, closing on the second date', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();

    expect(await picker.getPanelRole()).toBe('dialog');
    expect(await picker.getPanelAriaLabel()).toBe('Choose date range');
    expect(await picker.getPanelHeader()).toBe('January 2025');

    await picker.selectDay(5);

    // Half-picked: the first click restarts the range, so the end is empty and the
    // popup is still up.
    expect(await picker.getStartText()).toBe('05.01.2025');
    expect(await picker.getEndText()).toBe('');
    expect(await picker.isOpen()).toBe(true);

    await picker.selectDay(9);

    expect(await picker.getStartText()).toBe('05.01.2025');
    expect(await picker.getEndText()).toBe('09.01.2025');
    expect(await picker.isOpen()).toBe(false);
  });

  it('marks both ends selected and the days between them in-range', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();

    const ends = await picker.getDays({ selected: true });
    expect(await Promise.all(ends.map(day => day.getDayOfMonth()))).toEqual([14, 20]);

    const between = await picker.getDays({ inRange: true });
    expect(await Promise.all(between.map(day => day.getDayOfMonth()))).toEqual([15, 16, 17, 18, 19]);

    // The ends are `selected`, never `inRange` — the two states do not overlap.
    expect(await (await picker.getDay(14)).isInRange()).toBe(false);
  });

  it('keeps the roving tab stop on one end while both are selected', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();

    const roving: number[] = [];
    for (const day of await picker.getDays()) {
      if (await day.isActive()) roving.push(await day.getDayOfMonth());
    }

    // Two cells are `selected` and exactly one is the grid's tab stop — the two
    // states are read off different things and must not be conflated.
    expect(roving).toEqual([14]);
    expect(await (await picker.getDay(20)).isSelected()).toBe(true);
    expect(await (await picker.getDay(20)).isActive()).toBe(false);
  });

  it('types one end, and puts an out-of-order range back in order on blur', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.setStartText('25.01.2025');

    // Ordering is deliberately NOT settled mid-type: reordering here would move
    // the text out from under the caret.
    expect(await picker.getStartText()).toBe('25.01.2025');
    expect(await picker.getEndText()).toBe('20.01.2025');

    await picker.blur('start');

    expect(await picker.getStartText()).toBe('20.01.2025');
    expect(await picker.getEndText()).toBe('25.01.2025');
  });

  it('types the end field', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.setEndText('28.01.2025');

    expect(period()?.[1]?.getDate()).toBe(28);
    expect(await picker.getEndText()).toBe('28.01.2025');
  });

  it('clears both ends', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.clear();

    expect(period()).toEqual([null, null]);
    expect(await picker.getStartText()).toBe('');
    expect(await picker.getEndText()).toBe('');
  });

  it('focuses each end independently', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.focus('end');

    expect(await picker.isFocused('end')).toBe(true);
    expect(await picker.isFocused('start')).toBe(false);
  });

  it('refuses to open while readonly — stricter than the single picker', async () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDateRangePickerHarness);

    expect(await picker.isReadonly()).toBe(true);
    await expect(picker.open()).rejects.toThrow(/readonly/);
  });

  it('does not open while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDateRangePickerHarness);

    expect(await picker.isDisabled()).toBe(true);
    await expect(picker.open()).rejects.toThrow(/disabled/);
  });

  it('refuses the time methods in date mode', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();

    await expect(picker.getTime('start')).rejects.toThrow(/no time steppers/);
  });

  it('narrows by either end’s text, by mode and by state', async () => {
    const byStart = await loader.getHarness(WrDateRangePickerHarness.with({ startText: '14.01.2025' }));
    expect(await byStart.getEndText()).toBe('20.01.2025');

    const byEnd = await loader.getHarness(WrDateRangePickerHarness.with({ endText: /^20\./ }));
    expect(await byEnd.getStartText()).toBe('14.01.2025');

    expect(await loader.getAllHarnesses(WrDateRangePickerHarness.with({ mode: 'date' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrDateRangePickerHarness.with({ mode: 'datetime' }))).toHaveLength(0);
    expect(await loader.getAllHarnesses(WrDateRangePickerHarness.with({ disabled: true }))).toHaveLength(0);
    expect(await loader.getAllHarnesses(WrDateRangePickerHarness.with({ open: true }))).toHaveLength(0);

    await byStart.open();
    expect(await loader.getAllHarnesses(WrDateRangePickerHarness.with({ open: true }))).toHaveLength(1);
  });
});

describe('WrDateRangePickerHarness — datetime mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RangeHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })] });
    fixture = TestBed.createComponent(RangeHost);
    fixture.componentInstance.mode.set('datetime');
    fixture.componentInstance.format.set('dd.MM.yyyy HH:mm');
    fixture.componentInstance.period.set([new Date(2025, 0, 14, 9, 0), new Date(2025, 0, 20, 17, 30)]);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads a stepper per end', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();

    expect(await picker.getMode()).toBe('datetime');
    expect(await picker.getPanelAriaLabel()).toBe('Choose date and time range');
    expect(await picker.getTime('start')).toBe('09:00');
    expect(await picker.getTime('end')).toBe('17:30');
  });

  it('steps one end without dragging the other with it', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();
    await picker.stepTime('start', 'hours', 1);

    expect(await picker.getTime('start')).toBe('10:00');
    expect(await picker.getTime('end')).toBe('17:30');
    expect(fixture.componentInstance.period()?.[0]?.getHours()).toBe(10);
  });

  it('types into one end’s stepper', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();
    await picker.setTime('end', { hours: 18, minutes: 5 });

    expect(await picker.getTime('end')).toBe('18:05');
    expect(await picker.getTime('start')).toBe('09:00');
  });

  it('flips one end between AM and PM', async () => {
    fixture.componentInstance.timeFormat.set('12h');
    fixture.detectChanges();

    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();

    expect(await picker.getTime('end')).toBe('05:30 PM');

    await picker.toggleMeridiem('end');
    expect(await picker.getTime('end')).toBe('05:30 AM');
  });

  it('keeps the popup up when a day is picked, since the times come next', async () => {
    const picker = await loader.getHarness(WrDateRangePickerHarness);
    await picker.open();
    await picker.selectDay(15);

    expect(await picker.isOpen()).toBe(true);
  });
});

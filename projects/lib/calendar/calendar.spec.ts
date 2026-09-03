import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrDateAdapter } from 'ngwr/date';
import { provideWrDateFnsAdapter } from 'ngwr/date/adapters/fns';
import { type WrI18nCatalog, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCalendar } from './calendar';
import type { WrCalendarRange } from './interfaces';

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar [date]="date()" [min]="min()" [max]="max()" [dateFilter]="filter()" />`,
})
class Host {
  readonly date = signal<Date | null>(new Date(2026, 0, 15));
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly filter = signal<((d: Date) => boolean) | null>(null);
}

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar [mode]="mode()" [range]="range()" [autoFocus]="autoFocus()" />`,
})
class AutoFocusHost {
  readonly mode = signal<'single' | 'range'>('range');
  readonly range = signal<WrCalendarRange>([null, null]);
  readonly autoFocus = signal(true);
}

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar [date]="date()" (dateChange)="date.set($event)" />`,
})
class WritebackHost {
  readonly date = signal<Date | null>(null);
}

describe('WrCalendar keyboard focus', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('[role="grid"]')!;
  const ring = (): string | undefined => root().querySelector('.wr-calendar__day--focused')?.textContent?.trim();
  const active = (): string | undefined => (document.activeElement as HTMLElement | null)?.textContent?.trim();
  const tabStops = (): HTMLButtonElement[] => [
    ...root().querySelectorAll<HTMLButtonElement>('.wr-calendar__day[tabindex="0"]'),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] });
    fixture = TestBed.createComponent(Host);
  });

  it('moves REAL focus with the ring, not just the ring', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    root().querySelector<HTMLElement>('.wr-calendar__day--focused')!.focus();

    // Dispatch and let ONLY the scheduler settle it. A synchronous
    // `detectChanges()` here would update the DOM before the deferred focus
    // call and hide the very thing this guards: under zoneless CD the
    // scheduler runs in a macrotask, so the old `queueMicrotask` fired first
    // and focused the cell we had just left. The ring said 16, the screen
    // reader said 15, for the rest of the session.
    grid().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(ring()).toBe('16');
    expect(active()).toBe('16');
  });

  it('keeps them together across several moves', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    root().querySelector<HTMLElement>('.wr-calendar__day--focused')!.focus();

    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown']) {
      grid().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    }

    expect(active()).toBe(ring());
    expect(ring()).toBe('24');
  });

  it('refuses to step the ring below min, keeping the grid tabbable', async () => {
    // The roving tabindex means the ring IS the grid's only tab stop. Parked on
    // a `disabled` button it is unfocusable, so the grid drops out of the tab
    // order entirely — tab out once and there is no way back in. The count is
    // the assertion that matters: jsdom refuses to focus disabled buttons too,
    // so `activeElement` alone would call this fixed while it was still broken.
    fixture.componentInstance.min.set(new Date(2026, 0, 15));
    fixture.detectChanges();
    await fixture.whenStable();

    grid().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(ring()).toBe('15');
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('steps the ring ACROSS a disabled weekend rather than onto it', async () => {
    // Direction is the whole point: probing forward first — which is what the
    // seeding helper does — would bounce an ArrowLeft back onto the Monday it
    // started from, and the ring could never cross the hole at all.
    fixture.componentInstance.date.set(new Date(2026, 0, 12)); // a Monday
    fixture.componentInstance.filter.set(d => d.getDay() !== 0 && d.getDay() !== 6);
    fixture.detectChanges();
    await fixture.whenStable();

    grid().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(ring()).toBe('9'); // the Friday before, not Sunday the 11th
    expect(active()).toBe('9');
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('seeds the tab stop on a selectable day when today is out of range', async () => {
    // The roving tabindex means this cell is the grid's ONLY tab stop. Seeded
    // on a disabled day — which a `min` in the future does to "today" — that
    // stop is an unfocusable button and the whole grid drops out of the tab
    // order.
    fixture.componentInstance.date.set(null);
    fixture.componentInstance.min.set(new Date(2027, 0, 1));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('steps past a dateFilter hole to reach a selectable day', async () => {
    fixture.componentInstance.date.set(null);
    // Everything up to the 20th of the current month is closed off.
    fixture.componentInstance.filter.set(d => d.getDate() > 20);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0].disabled).toBe(false);
  });

  it('still seeds on the selected date when that date is selectable', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(ring()).toBe('15');
    expect(tabStops()[0].disabled).toBe(false);
  });
});

describe('WrCalendar autoFocus', () => {
  const cell = (): HTMLElement | null => document.querySelector('.wr-calendar__day--focused');

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] }));

  it('takes focus in range mode with neither end picked', async () => {
    // The seed reads `date() ?? range()[0] ?? today()`, so range mode leans on
    // the LAST fallback here. `wr-date-range-picker` opens in exactly this
    // state, which makes it the case that matters and the one a single-mode
    // test would never reach.
    const fixture = TestBed.createComponent(AutoFocusHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(cell());
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
  });

  it('seeds on the start of a half-picked range, not on today', async () => {
    const fixture = TestBed.createComponent(AutoFocusHost);
    fixture.componentInstance.range.set([new Date(2026, 5, 9), null]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cell()?.textContent?.trim()).toBe('9');
    expect(document.activeElement).toBe(cell());
  });

  it('stays off by default so a calendar in a page does not steal focus', async () => {
    const fixture = TestBed.createComponent(AutoFocusHost);
    fixture.componentInstance.autoFocus.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // The ring is still seeded — it is the tab stop. What must NOT happen is
    // real focus moving to it on load.
    expect(cell()).not.toBeNull();
    expect(document.activeElement).not.toBe(cell());
  });
});

/**
 * The keydown listener is on the HOST, which wraps the nav header and the
 * month / year chip listboxes as well as the day grid. Every key aimed at one
 * of those used to be consumed as day-grid navigation, and the handler's
 * `preventDefault()` cancelled the button's own activation with it — so Enter
 * on `‹` committed a day the user never touched instead of paging the month.
 *
 * The last case here is the other half of the guard: keys sent to the host
 * ELEMENT must keep driving the grid, because `WrCalendarHarness` sends them
 * there rather than to a cell. A guard written as "must be inside
 * `.wr-calendar__grid`" passes the first three cases and breaks every keyboard
 * method on the harness.
 */
describe('WrCalendar header and chip keys', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<WritebackHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-calendar')!;
  const ring = (): string | undefined => root().querySelector('.wr-calendar__day--focused')?.textContent?.trim();

  const press = async (el: Element, key: string): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] });
    fixture = TestBed.createComponent(WritebackHost);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('leaves Enter on the previous-month button to the button', async () => {
    const event = await press(root().querySelector('.wr-calendar__nav--prev')!, 'Enter');

    // Cancelling keydown on a `<button>` suppresses the activation the browser
    // would synthesize from it, so `defaultPrevented` IS the symptom here —
    // jsdom fires no click of its own to observe.
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.date()).toBeNull();
  });

  it('leaves ArrowDown on the header label alone instead of moving the ring', async () => {
    const before = ring();
    const event = await press(root().querySelector('.wr-calendar__label')!, 'ArrowDown');

    expect(event.defaultPrevented).toBe(false);
    expect(ring()).toBe(before);
  });

  it('does not pick a day when Enter lands on a month chip', async () => {
    root().querySelector<HTMLButtonElement>('.wr-calendar__label')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const chips = root().querySelectorAll<HTMLButtonElement>('.wr-calendar__months .wr-calendar__chip');
    expect(chips.length).toBe(12);

    const event = await press(chips[2], 'Enter');

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.date()).toBeNull();
  });

  it('still drives the grid from keys sent to the host element', async () => {
    const before = ring();
    const event = await press(host(), 'ArrowRight');

    expect(event.defaultPrevented).toBe(true);
    expect(ring()).not.toBe(before);
  });
});

/**
 * `role="listbox"` promises arrow keys and one tab stop, and the month and year
 * views delivered neither: twelve `<button>`s, every one of them tabbable, no
 * ring to move. A role that lies about the interaction model is worse than a
 * plain group of buttons, so the chips grew the roving half of the pattern they
 * were already claiming.
 *
 * Read off `tabindex`, which IS the ring here — there is no `--focused`
 * modifier on a chip, and a spec that asserted `document.activeElement` alone
 * would pass on a component that moved real focus while leaving every chip a tab
 * stop, which is the bug.
 */
describe('WrCalendar month and year listbox keys', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-calendar')!;
  const chips = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-calendar__chip')];
  const ringed = (): string | null =>
    chips()
      .find(chip => chip.getAttribute('tabindex') === '0')
      ?.textContent?.trim() ?? null;
  const tabStops = (): number => chips().filter(chip => chip.getAttribute('tabindex') === '0').length;

  const press = async (key: string): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    host().dispatchEvent(event);
    fixture.detectChanges();
    await fixture.whenStable();
    return event;
  };

  const climb = async (times: number): Promise<void> => {
    for (let i = 0; i < times; i++) {
      root().querySelector<HTMLButtonElement>('.wr-calendar__label')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
    }
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('leaves the month list one tab stop, on the month being shown', async () => {
    await climb(1);

    // The host date is 15 Jan 2026, so the view is January.
    expect(chips()).toHaveLength(12);
    expect(tabStops()).toBe(1);
    expect(ringed()).toBe('Jan');
  });

  it('walks the row with the inline arrows and the column by three', async () => {
    await climb(1);

    expect((await press('ArrowRight')).defaultPrevented).toBe(true);
    expect(ringed()).toBe('Feb');

    // Three chips per row in the month grid, so Down is a row and not a chip.
    await press('ArrowDown');
    expect(ringed()).toBe('May');

    await press('ArrowUp');
    expect(ringed()).toBe('Feb');

    await press('End');
    expect(ringed()).toBe('Dec');

    await press('Home');
    expect(ringed()).toBe('Jan');
  });

  it('steps the year page by four, because that grid is four wide', async () => {
    await climb(2);
    // From the top-left of the page, so there is a row below to step onto — the
    // 12-year window is floor-aligned, and 2026 sits in the last row of it.
    await press('Home');
    const first = ringed();

    await press('ArrowDown');

    expect(Number(ringed()) - Number(first)).toBe(4);
  });

  it('stays inside the page instead of wrapping onto the far end', async () => {
    // The header's ‹ / › are what change which twelve months are on offer; an
    // arrow that wrapped would move the ring without changing the page under it.
    await climb(1);
    await press('Home');

    const event = await press('ArrowLeft');

    expect(event.defaultPrevented).toBe(false);
    expect(ringed()).toBe('Jan');
  });

  it('never parks the only tab stop on a chip that cannot take focus', async () => {
    // `.focus()` on a `<button disabled>` is a no-op, so a ring seeded on a month
    // a `[min]` closed off leaves the view with nothing tabbable in it at all.
    fixture.componentInstance.min.set(new Date(2026, 5, 1));
    fixture.detectChanges();
    await climb(1);

    expect(tabStops()).toBe(1);
    expect(ringed()).toBe('Jun');
    expect(chips().find(chip => chip.getAttribute('tabindex') === '0')!.disabled).toBe(false);

    // And an arrow may not walk it onto one either.
    await press('ArrowLeft');
    expect(ringed()).toBe('Jun');
  });

  it('re-seeds the ring on the view it lands in, not on the index it left', async () => {
    await climb(2);
    await press('End');
    root().querySelector<HTMLButtonElement>('.wr-calendar__chip[tabindex="0"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Picking the last year of the page drops back to the month view; carrying
    // index 11 across would ring December instead of the month on screen.
    expect(ringed()).toBe('Jan');
  });
});

/**
 * A calendar grid mirrors under `dir="rtl"`, so the day to the visual right of
 * today is YESTERDAY and ArrowRight has to walk back. The LTR twin of each case
 * lives in the keyboard describe above (ArrowRight from the 15th lands on the
 * 16th); a mirrored one that lands on the 14th is the whole point.
 */
describe('WrCalendar under dir="rtl"', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('[role="grid"]')!;
  const ring = (): string | undefined => root().querySelector('.wr-calendar__day--focused')?.textContent?.trim();

  const press = async (key: string): Promise<void> => {
    grid().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrDateFnsAdapter(),
        { provide: Directionality, useValue: { value: 'rtl', change: new Subject<Direction>() } },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('walks back a day on the arrow pointing at the visual right', async () => {
    await press('ArrowRight');
    expect(ring()).toBe('14');
  });

  it('walks forward a day on the arrow pointing at the visual left', async () => {
    await press('ArrowLeft');
    expect(ring()).toBe('16');
  });

  it('leaves the week step alone, because Up and Down are the block axis', async () => {
    await press('ArrowDown');
    expect(ring()).toBe('22');

    await press('ArrowUp');
    expect(ring()).toBe('15');
  });

  it('hangs the arrow mirror on the two icon-only nav buttons, and nowhere near the label', () => {
    // `__header` is a plain flex row that mirrors, while the chevrons are inline
    // SVG baked to a physical direction — so "previous" ends up at the right
    // edge still pointing left, away from the month it goes to. The stylesheet
    // turns them with `scaleX(-1)` scoped to `.wr-calendar__nav`. jsdom has no
    // cascade, so this test CANNOT fail on that rule; what it pins is the hook
    // the rule needs — two nav buttons, each an svg and no text — and that the
    // scope excludes the textual `__label`, whose month name mirrored would be
    // gibberish.
    const nav = [...root().querySelectorAll<HTMLElement>('.wr-calendar__nav')];

    expect(nav).toHaveLength(2);
    expect(nav.every(b => b.textContent.trim() === '')).toBe(true);
    // The rule's own selector, and everything it reaches.
    expect(root().querySelectorAll('.wr-calendar__nav svg')).toHaveLength(2);

    const label = root().querySelector<HTMLElement>('.wr-calendar__label')!;
    expect(label.classList.contains('wr-calendar__nav')).toBe(false);
    expect(label.textContent.trim().length).toBeGreaterThan(0);
  });
});

/**
 * The header and the day cells, as translatable units.
 *
 * Two defects with one shape. The header was `${month} ${year}` and the year
 * view `${first} – ${last}`, both assembled in TypeScript: English word order
 * and an English separator, frozen where no catalog reaches. ja-JP writes
 * 2026年3月, which is not a translation of any word in "March 2026" but a
 * different ARRANGEMENT of the same two values — so the arrangement has to be
 * the thing a catalog owns.
 *
 * And a day cell had no accessible name at all: `role="gridcell"` inherits none
 * from the grid or the column header above it, so every date announced as a
 * bare number, with the month, the year and the weekday all on screen and none
 * of them reachable.
 */
describe('WrCalendar — header and cell names', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const header = (): string => root().querySelector('.wr-calendar__label')!.textContent.trim();
  const days = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-calendar__day')];

  const mount = async (catalog?: WrI18nCatalog): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        // The NATIVE adapter here, not the date-fns one the specs above use:
        // `longDate` is `Intl` with `{ year, month: 'long', day }`, where
        // date-fns's `PPP` writes an ordinal ("January 15th, 2026"). Both are
        // correct for their adapter; this file needs one exact string.
        provideWrDateAdapter(),
        ...(catalog
          ? [
              provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
              provideWrI18nStaticLoader({ xx: catalog }),
            ]
          : []),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('renders the shipped English arrangement', async () => {
    await mount(wrEn);

    expect(header()).toBe('January 2026');
  });

  it('lets a catalog put the year first and drop the space — the ja-JP shape', async () => {
    await mount({ calendar: { header: '{{year}}年{{month}}' } });

    expect(header()).toBe('2026年January');
  });

  it('hands the year range separator to the catalog too', async () => {
    await mount({ calendar: { yearRange: '{{from}}年〜{{to}}年' } });

    // day → month → year.
    root().querySelector<HTMLButtonElement>('.wr-calendar__label')!.click();
    fixture.detectChanges();
    root().querySelector<HTMLButtonElement>('.wr-calendar__label')!.click();
    fixture.detectChanges();

    expect(header()).toBe('2016年〜2027年');
  });

  it('names every day cell with its weekday and full date', async () => {
    await mount(wrEn);

    // 15 January 2026 is a Thursday. The date half is the adapter's `longDate`,
    // so its field order and punctuation are `Intl`'s, not this component's.
    const fifteenth = days().find(
      d => d.textContent.trim() === '15' && !d.classList.contains('wr-calendar__day--out-of-month')
    );

    expect(fifteenth!.getAttribute('aria-label')).toBe('Thursday, January 15, 2026');
    // Every cell in the grid, not just the selected one — six weeks of them.
    expect(days()).toHaveLength(42);
    expect(days().every(d => (d.getAttribute('aria-label') ?? '').length > 0)).toBe(true);
  });

  it('picks the weekday by calendar day, not by column index', async () => {
    // `getDayOfWeekNames` returns COLUMN order — index 0 is the locale's first
    // day of the week, which date-fns's default en-US makes Sunday and most
    // locales make Monday. Indexing it with `getDayOfWeek()` (0 = Sunday)
    // directly is off by one in every Monday-first locale, and reads plausibly
    // in en-US, which is where it would have been checked.
    await mount(wrEn);

    const named = days().map(d => (d.getAttribute('aria-label') ?? '').split(',')[0]);
    // Seven columns, so every cell in a column carries the same weekday name…
    for (let col = 0; col < 7; col++) {
      const column = new Set(named.filter((_, i) => i % 7 === col));
      expect(column.size, `column ${col}`).toBe(1);
    }
    // …and the seven names are seven different days, in the header strip's order.
    const strip = [...root().querySelectorAll('.wr-calendar__weekday')].map(w => w.textContent.trim());
    expect(named.slice(0, 7).map(n => n.slice(0, 2))).toEqual(strip.map(s => s.slice(0, 2)));
  });

  it('lets a catalog move the weekday to the other side of the date', async () => {
    await mount({ calendar: { dayLabel: '{{date}} ({{weekday}})' } });

    const fifteenth = days().find(
      d => d.textContent.trim() === '15' && !d.classList.contains('wr-calendar__day--out-of-month')
    );

    expect(fifteenth!.getAttribute('aria-label')).toBe('January 15, 2026 (Thursday)');
  });

  it('names its cells with no i18n provider at all', async () => {
    await mount();

    const fifteenth = days().find(
      d => d.textContent.trim() === '15' && !d.classList.contains('wr-calendar__day--out-of-month')
    );

    expect(header()).toBe('January 2026');
    expect(fifteenth!.getAttribute('aria-label')).toBe('Thursday, January 15, 2026');
  });
});

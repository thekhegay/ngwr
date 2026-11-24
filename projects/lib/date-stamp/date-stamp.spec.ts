import { Component, LOCALE_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { WrI18n, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDateStamp } from './date-stamp';

/** An instant in UTC and a zone as an offset: nothing depends on the zone of the runner. */
const INSTANT = new Date(Date.UTC(2026, 10, 12, 8, 45, 30));

@Component({
  imports: [WrDateStamp],
  template: `<wr-date-stamp
    [value]="value()"
    [dateFormat]="dateFormat()"
    [timeFormat]="timeFormat()"
    [emptyLabel]="emptyLabel()"
  />`,
})
class Host {
  readonly value = signal<Date | string | number | null | undefined>(INSTANT);
  readonly dateFormat = signal('mediumDate');
  readonly timeFormat = signal('time');
  readonly emptyLabel = signal<string | null>(null);
}

describe('WrDateStamp', () => {
  const zone = signal<string | null>('+05:00');
  let fixture: ComponentFixture<Host>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('wr-date-stamp')!;
  const time = (): HTMLTimeElement | null => host().querySelector('time');
  const line = (name: 'date' | 'time' | 'empty'): string | null =>
    host().querySelector(`.wr-date-stamp__${name}`)?.textContent ?? null;

  const setup = (providers: unknown[] = []): void => {
    zone.set('+05:00');
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru', 'en'], storageKey: null }),
        provideWr(withDates({ timeZone: zone })),
        ...(providers as never[]),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('shows the date over the time, in the zone and the interface language', () => {
    setup();
    expect(host().classList.contains('wr-date-stamp')).toBe(true);
    expect(line('date')).toBe('12 нояб. 2026 г.');
    expect(line('time')).toBe('13:45');
    const lines = [...time()!.children].map(child => child.className);
    expect(lines).toEqual(['wr-date-stamp__date', 'wr-date-stamp__time']);
  });

  it('carries the instant in a valid datetime attribute, whatever the zone', () => {
    setup();
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12T08:45:30.000Z');
    expect(new Date(time()!.dateTime).getTime()).toBe(INSTANT.getTime());
  });

  it('takes named keys and token strings for both lines', () => {
    setup();
    fixture.componentInstance.dateFormat.set('d MMM yyyy');
    fixture.componentInstance.timeFormat.set('time24hSeconds');
    fixture.detectChanges();
    expect(line('date')).toBe('12 нояб. 2026');
    expect(line('time')).toBe('13:45:30');
  });

  it('reads a string and epoch milliseconds as wrDate does', () => {
    setup();
    fixture.componentInstance.value.set('2026-11-12 08:45:30Z');
    fixture.detectChanges();
    expect(line('time')).toBe('13:45');

    fixture.componentInstance.value.set(INSTANT.getTime());
    fixture.detectChanges();
    expect(line('time')).toBe('13:45');
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12T08:45:30.000Z');
  });

  it('follows the zone and the language at runtime', async () => {
    setup();
    zone.set('+05:30');
    await fixture.whenStable();
    expect(line('time')).toBe('14:15');

    // `use()` says once that numbers stay on LOCALE_ID.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.inject(WrI18n).use('en');
    await fixture.whenStable();
    expect(line('date')).toBe('Nov 12, 2026');
    expect(line('time')).toBe('02:15 PM');
  });

  it('crosses midnight with the zone', () => {
    setup();
    fixture.componentInstance.value.set(new Date(Date.UTC(2026, 10, 12, 20, 0)));
    fixture.componentInstance.dateFormat.set('dd.MM.yyyy');
    fixture.detectChanges();
    expect(line('date')).toBe('13.11.2026');
    expect(line('time')).toBe('01:00');
  });

  it('shows a date-only string as that day, with no time line and no shift', () => {
    setup();
    zone.set('-12:00');
    fixture.componentInstance.value.set('2026-11-12');
    fixture.componentInstance.dateFormat.set('dd.MM.yyyy');
    fixture.detectChanges();
    expect(line('date')).toBe('12.11.2026');
    expect(line('time')).toBeNull();
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12');
  });

  it.each([null, undefined, '', '   ', 'n/a', Number.NaN])('shows the placeholder for %s', empty => {
    setup();
    fixture.componentInstance.value.set(empty);
    fixture.detectChanges();
    expect(time()).toBeNull();
    expect(line('empty')).toBe('-');
    expect(host().classList.contains('wr-date-stamp--empty')).toBe(true);
  });

  it('takes the placeholder from emptyLabel, then from the catalog', async () => {
    setup([provideWrI18nStaticLoader({ ru: { copyValue: { empty: 'нет' } } })]);
    fixture.componentInstance.value.set(null);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(line('empty')).toBe('нет');

    fixture.componentInstance.emptyLabel.set('n/a');
    fixture.detectChanges();
    expect(line('empty')).toBe('n/a');
  });

  it('writes in LOCALE_ID and the browser zone with nothing configured', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-US' }] });
    fixture = TestBed.createComponent(Host);
    const local = new Date(2026, 10, 12, 13, 45);
    fixture.componentInstance.value.set(local);
    fixture.detectChanges();
    expect(line('date')).toBe('Nov 12, 2026');
    expect(line('time')).toBe('01:45 PM');
    expect(time()!.getAttribute('datetime')).toBe(local.toISOString());
  });
});

/** No input bound but the value, so the defaults of `withDates({ stamp })` show. */
@Component({ imports: [WrDateStamp], template: `<wr-date-stamp [value]="value()" />` })
class Bare {
  readonly value = signal<Date | string | number | null>(null);
}

@Component({
  imports: [WrDateStamp],
  template: `<wr-date-stamp
    [value]="value()"
    [todayTimeOnly]="todayTimeOnly()"
    [seconds]="seconds()"
    [epochUnit]="epochUnit()"
    [timeFormat]="timeFormat()"
    dateFormat="dd.MM.yyyy"
  />`,
})
class Options {
  readonly value = signal<Date | string | number | null>(null);
  readonly todayTimeOnly = signal(false);
  readonly seconds = signal(false);
  readonly epochUnit = signal<'ms' | 'us' | 's' | 'auto' | null>(null);
  readonly timeFormat = signal('HH:mm');
}

describe('WrDateStamp options', () => {
  type Dates = Parameters<typeof withDates>[0];

  const create = <T>(type: new () => T, dates: Dates): ComponentFixture<T> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, provideWr(withDates(dates))],
    });
    return TestBed.createComponent(type);
  };
  const lines = (fixture: ComponentFixture<unknown>): (string | null)[] => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return [
      el.querySelector('.wr-date-stamp__date')?.textContent ?? null,
      el.querySelector('.wr-date-stamp__time')?.textContent ?? null,
    ];
  };
  const datetime = (fixture: ComponentFixture<unknown>): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('time')?.getAttribute('datetime') ?? null;

  /** Run with the process in another zone: Node re-reads `TZ` when it is assigned. */
  const everywhere = (run: () => void): void => {
    const before = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      for (const [timeZone, offset] of [
        [before, new Date(2026, 10, 12).getTimezoneOffset()],
        ['America/New_York', 300],
        ['Asia/Tokyo', -540],
      ] as const) {
        process.env['TZ'] = timeZone;
        expect(new Date(2026, 10, 12).getTimezoneOffset()).toBe(offset);
        run();
      }
    } finally {
      process.env['TZ'] = before;
    }
  };

  afterEach(() => vi.useRealTimers());

  describe('the backend forms', () => {
    const BACKEND: Dates = {
      timeZone: '+0500',
      zonelessIn: 'display',
      epochUnit: 'auto',
      stamp: { dateFormat: 'd MMM y', timeFormat: 'HH:mm' },
    };

    it('shows one moment the same from a zoneless string, milliseconds and microseconds', () => {
      everywhere(() => {
        // 13:45 at +05:00 is 08:45 UTC.
        for (const value of ['2026-11-12 13:45:00', 1794473100000, 1794473100000000, 1794473100]) {
          const fixture = create(Bare, BACKEND);
          fixture.componentInstance.value.set(value);
          expect(lines(fixture)).toEqual(['12 Nov 2026', '13:45']);
          expect(datetime(fixture)).toBe('2026-11-12T08:45:00.000Z');
          fixture.destroy();
        }
      });
    });

    it('reads a number in the unit of its own input, over the one of withDates', () => {
      const fixture = create(Options, { timeZone: '+0500', epochUnit: 'us' });
      fixture.componentInstance.value.set(1794473100000000);
      expect(lines(fixture)).toEqual(['12.11.2026', '13:45']);

      fixture.componentInstance.value.set(1794473100);
      fixture.componentInstance.epochUnit.set('s');
      expect(lines(fixture)).toEqual(['12.11.2026', '13:45']);

      fixture.componentInstance.epochUnit.set('auto');
      expect(lines(fixture)).toEqual(['12.11.2026', '13:45']);
      fixture.destroy();
    });
  });

  describe('app-wide defaults', () => {
    it('takes its formats, seconds and todayTimeOnly from withDates({ stamp })', () => {
      const fixture = create(Bare, {
        timeZone: '+05:00',
        stamp: { dateFormat: 'dd/MM/yy', timeFormat: 'HH:mm', seconds: true },
      });
      fixture.componentInstance.value.set(INSTANT);
      expect(lines(fixture)).toEqual(['12/11/26', '13:45:30']);
      fixture.destroy();

      const today = create(Bare, { timeZone: '+05:00', stamp: { todayTimeOnly: true, timeFormat: 'HH:mm' } });
      today.componentInstance.value.set(new Date());
      const [date, time] = lines(today);
      expect(date).toBeNull();
      expect(time).toMatch(/^\d{2}:\d{2}$/);
      today.destroy();
    });

    it('lets an input win over the default', () => {
      const fixture = create(Options, {
        timeZone: '+05:00',
        stamp: { dateFormat: 'd MMM y', timeFormat: 'time12h', seconds: true, todayTimeOnly: true },
      });
      fixture.componentInstance.value.set(new Date());
      const [date, time] = lines(fixture);
      expect(date).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      expect(time).toMatch(/^\d{2}:\d{2}$/);
      fixture.destroy();
    });

    it('keeps the 16.1 defaults with no stamp option', () => {
      const fixture = create(Bare, { timeZone: '+05:00' });
      fixture.componentInstance.value.set(INSTANT);
      expect(lines(fixture)).toEqual(['Nov 12, 2026', '01:45 PM']);
      fixture.destroy();
    });
  });

  describe('seconds', () => {
    it.each([
      ['HH:mm', '13:45:30'],
      ['HH:mm:ss', '13:45:30'],
      ['time24h', '13:45:30'],
      ['time12h', '01:45:30 PM'],
      ['time', '01:45:30 PM'],
      ['time24hSeconds', '13:45:30'],
      ['shortDateTime24h', '11/12/2026, 13:45:30'],
      ['mediumDate', 'Nov 12, 2026'],
    ])('turns %s into its seconds form', (format, shown) => {
      const fixture = create(Options, { timeZone: '+05:00' });
      fixture.componentInstance.value.set(INSTANT);
      fixture.componentInstance.timeFormat.set(format);
      fixture.componentInstance.seconds.set(true);
      expect(lines(fixture)[1]).toBe(shown);
      fixture.destroy();
    });

    it('is off by default', () => {
      const fixture = create(Options, { timeZone: '+05:00' });
      fixture.componentInstance.value.set(INSTANT);
      expect(lines(fixture)[1]).toBe('13:45');
      fixture.destroy();
    });
  });

  describe('todayTimeOnly', () => {
    // 21:30 UTC on the 12th: still the 12th in New York, already the 13th at +05:00.
    const NOW = Date.UTC(2026, 10, 12, 21, 30);
    const HOUR = 3_600_000;

    const at = (timeZone: string, value: Date | string | number, on = true): ComponentFixture<Options> => {
      vi.useFakeTimers({ toFake: ['Date'], now: NOW });
      const fixture = create(Options, { timeZone });
      fixture.componentInstance.value.set(value);
      fixture.componentInstance.todayTimeOnly.set(on);
      return fixture;
    };

    it('shows the time alone for a value from today, in a time element that stays valid', () => {
      const fixture = at('+05:00', new Date(NOW + HOUR));
      expect(lines(fixture)).toEqual([null, '03:30']);
      expect(datetime(fixture)).toBe('2026-11-12T22:30:00.000Z');
      const time = (fixture.nativeElement as HTMLElement).querySelector('time')!;
      expect([...time.children].map(child => child.className)).toEqual(['wr-date-stamp__time']);
      fixture.destroy();
    });

    it('keeps the date of another day', () => {
      const yesterday = at('+05:00', new Date(NOW - 3 * HOUR));
      expect(lines(yesterday)).toEqual(['12.11.2026', '23:30']);
      yesterday.destroy();
      const tomorrow = at('+05:00', new Date(NOW + 24 * HOUR));
      expect(lines(tomorrow)).toEqual(['14.11.2026', '02:30']);
      tomorrow.destroy();
    });

    it('takes today from the display zone, not from the process', () => {
      everywhere(() => {
        // 19:30 UTC is the 13th at +05:00 and the 12th at -05:00, where today still is the 12th.
        const value = new Date(NOW - 2 * HOUR);
        const east = at('+05:00', value);
        expect(lines(east)).toEqual([null, '00:30']);
        east.destroy();
        const west = at('-05:00', value);
        expect(lines(west)).toEqual([null, '14:30']);
        west.destroy();

        // 18:30 UTC is the 12th at +05:00, where today is the 13th, and today at -05:00.
        const earlier = new Date(NOW - 3 * HOUR);
        const eastEarlier = at('+05:00', earlier);
        expect(lines(eastEarlier)).toEqual(['12.11.2026', '23:30']);
        eastEarlier.destroy();
        const named = at('America/New_York', earlier);
        expect(lines(named)).toEqual([null, '13:30']);
        named.destroy();
      });
    });

    it('does nothing when it is off, and keeps the date of a date-only value', () => {
      const off = at('+05:00', new Date(NOW), false);
      expect(lines(off)).toEqual(['13.11.2026', '02:30']);
      off.destroy();

      const day = at('+05:00', '2026-11-13');
      expect(lines(day)).toEqual(['13.11.2026', null]);
      expect(datetime(day)).toBe('2026-11-13');
      day.destroy();
    });
  });
});

@Component({
  imports: [WrDateStamp],
  template: `<wr-date-stamp
    [value]="value()"
    [relative]="relative()"
    [dateFormat]="dateFormat()"
    timeFormat="HH:mm"
  />`,
})
class Relative {
  readonly value = signal<Date | string | number | null>(null);
  readonly relative = signal(true);
  readonly dateFormat = signal('dd.MM.yyyy');
}

describe('WrDateStamp relative', () => {
  // 12:00 at +05:00 on 12 November.
  const NOW = Date.UTC(2026, 10, 12, 7, 0, 0);
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  let fixture: ComponentFixture<Relative>;

  const create = <T>(type: new () => T, dates: Parameters<typeof withDates>[0] = {}): ComponentFixture<T> => {
    vi.useFakeTimers({ now: NOW });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, provideWr(withDates({ timeZone: '+05:00', ...dates }))],
    });
    return TestBed.createComponent(type);
  };
  const setup = (value: Date | string | number | null, dates?: Parameters<typeof withDates>[0]): void => {
    fixture = create(Relative, dates);
    fixture.componentInstance.value.set(value);
    fixture.detectChanges();
  };
  const time = (): HTMLTimeElement | null => (fixture.nativeElement as HTMLElement).querySelector('time');
  const text = (): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-date-stamp__relative')?.textContent ?? null;
  /** Let the clock run, then render what the timers left behind. */
  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('shows the relative text alone, with the date and the time in the title', () => {
    setup(new Date(NOW - 5 * MINUTE));
    expect(text()).toBe('5 minutes ago');
    expect([...time()!.children].map(child => child.className)).toEqual(['wr-date-stamp__relative']);
    expect(time()!.getAttribute('title')).toBe('12.11.2026, 11:55');
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12T06:55:00.000Z');
  });

  it('reads the future as the future', () => {
    setup(new Date(NOW + SECOND));
    expect(text()).toBe('in 1 second');
    advance(1);
    expect(text()).toBe('now');
    advance(SECOND);
    expect(text()).toBe('now');
    advance(SECOND - 1);
    expect(text()).toBe('1 second ago');
  });

  it('advances each second under a minute, then each minute', () => {
    setup(new Date(NOW - 58 * SECOND));
    expect(text()).toBe('58 seconds ago');
    advance(SECOND);
    expect(text()).toBe('59 seconds ago');
    advance(SECOND);
    expect(text()).toBe('1 minute ago');

    // A minute holds one timer, not sixty.
    expect(vi.getTimerCount()).toBe(1);
    advance(MINUTE - 1);
    expect(text()).toBe('1 minute ago');
    expect(vi.getTimerCount()).toBe(1);
    advance(1);
    expect(text()).toBe('2 minutes ago');
  });

  it('advances each hour under a day and each day after that', () => {
    setup(new Date(NOW - (2 * HOUR + 59 * MINUTE)));
    expect(text()).toBe('2 hours ago');
    advance(MINUTE);
    expect(text()).toBe('3 hours ago');
    advance(HOUR - 1);
    expect(text()).toBe('3 hours ago');
    advance(1);
    expect(text()).toBe('4 hours ago');

    fixture.componentInstance.value.set(new Date(Date.now() - 3 * DAY));
    fixture.detectChanges();
    expect(text()).toBe('3 days ago');
    advance(DAY - 1);
    expect(text()).toBe('3 days ago');
    advance(1);
    expect(text()).toBe('4 days ago');
  });

  it('keeps the next change on time when it restarts for another input', () => {
    setup(new Date(NOW - 5 * MINUTE));
    advance(30 * SECOND);
    fixture.componentInstance.dateFormat.set('d MMM yyyy');
    fixture.detectChanges();

    advance(30 * SECOND - 1);
    expect(text()).toBe('5 minutes ago');
    advance(1);
    expect(text()).toBe('6 minutes ago');
  });

  it('counts a coming value down', () => {
    setup(new Date(NOW + 2 * MINUTE + 500));
    expect(text()).toBe('in 2 minutes');
    advance(500);
    expect(text()).toBe('in 2 minutes');
    advance(1);
    expect(text()).toBe('in 1 minute');
    advance(MINUTE);
    expect(text()).toBe('in 59 seconds');
  });

  it('measures a new value from the current time, not from the last tick', () => {
    setup(new Date(NOW - 400 * DAY));
    expect(text()).toBe('last year');
    // Half a day on, with the daily timer still waiting.
    vi.setSystemTime(NOW + 12 * HOUR);
    fixture.componentInstance.value.set(new Date(NOW + 12 * HOUR - 5 * MINUTE));
    fixture.detectChanges();
    expect(text()).toBe('5 minutes ago');
  });

  it('starts no timer before the first render, and none with relative off', () => {
    fixture = create(Relative);
    // The scheduler of change detection keeps timers of its own, with no delay: the stamp's is the one that has one.
    const started = vi.spyOn(globalThis, 'setTimeout');
    const delays = (): number[] => started.mock.calls.map(([, delay]) => delay ?? 0).filter(delay => delay > 0);
    fixture.componentInstance.value.set(new Date(NOW - 5 * SECOND));
    expect(delays()).toEqual([]);
    fixture.detectChanges();
    expect(delays()).toEqual([SECOND]);
    started.mockRestore();
    expect(vi.getTimerCount()).toBe(1);

    fixture.componentInstance.relative.set(false);
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(0);
    expect(text()).toBeNull();
    expect(time()!.getAttribute('title')).toBeNull();
    expect([...time()!.children].map(child => child.textContent)).toEqual(['12.11.2026', '11:59']);

    fixture.componentInstance.relative.set(true);
    fixture.detectChanges();
    expect(text()).toBe('5 seconds ago');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('starts no timer for an empty value', () => {
    setup(null);
    expect(time()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its timer on destroy', () => {
    setup(new Date(NOW - 5 * SECOND));
    expect(vi.getTimerCount()).toBe(1);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('writes in the language the stamp formats in, and follows it', () => {
    vi.useFakeTimers({ now: NOW });
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru', 'en'], storageKey: null }),
        provideWr(withDates({ timeZone: '+05:00' })),
      ],
    });
    fixture = TestBed.createComponent(Relative);
    fixture.componentInstance.value.set(new Date(NOW - 3 * HOUR));
    fixture.detectChanges();
    expect(text()).toBe('3 часа назад');
    expect(time()!.getAttribute('title')).toBe('12.11.2026, 09:00');

    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.inject(WrI18n).use('en');
    fixture.detectChanges();
    expect(text()).toBe('3 hours ago');
    vi.restoreAllMocks();
  });

  it('compares a date-only value with today in the display zone, and turns at its midnight', () => {
    // 21:30 UTC on the 12th is 02:30 on the 13th at +05:00.
    vi.useFakeTimers({ now: NOW });
    vi.setSystemTime(Date.UTC(2026, 10, 12, 21, 30));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, provideWr(withDates({ timeZone: '+05:00' }))],
    });
    fixture = TestBed.createComponent(Relative);
    fixture.componentInstance.value.set('2026-11-13');
    fixture.detectChanges();
    expect(text()).toBe('today');
    expect(time()!.getAttribute('title')).toBe('13.11.2026');
    expect(time()!.getAttribute('datetime')).toBe('2026-11-13');

    // Midnight at +05:00 is 19:00 UTC, 21 hours and 30 minutes on.
    advance(21 * HOUR + 30 * MINUTE - 1);
    expect(text()).toBe('today');
    advance(1);
    expect(text()).toBe('yesterday');
  });

  it('takes relative from withDates({ stamp }), and lets the input win', () => {
    @Component({ imports: [WrDateStamp], template: `<wr-date-stamp [value]="value" />` })
    class Default {
      readonly value = new Date(NOW - 5 * MINUTE);
    }
    const bare = create(Default, { stamp: { relative: true } });
    bare.detectChanges();
    expect((bare.nativeElement as HTMLElement).querySelector('.wr-date-stamp__relative')?.textContent).toBe(
      '5 minutes ago'
    );
    bare.destroy();

    setup(new Date(NOW - 5 * MINUTE), { stamp: { relative: true } });
    fixture.componentInstance.relative.set(false);
    fixture.detectChanges();
    expect(text()).toBeNull();
  });
});

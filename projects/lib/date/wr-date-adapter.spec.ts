import { LOCALE_ID, Service, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { provideWrDateAdapter } from './provide-wr-date-adapter';
import { WrDateAdapter, WrNativeDateAdapter } from './wr-date-adapter';

/** A consumer's own adapter, decorated the way the base class asks. */
@Service()
class FixedClockAdapter extends WrNativeDateAdapter {
  override today(): Date {
    return new Date(2000, 0, 1);
  }
}

/**
 * A direct subclass with no decorator, built through a cast so the spec does not
 * restate two dozen abstract methods: only which class the injector builds is
 * under test, and no method is ever called on it.
 */
class UndecoratedAdapter extends (WrDateAdapter as unknown as new () => object) {}

/**
 * Until v15 `WrDateAdapter` had no default, so the calendar, every date-picker
 * mode and the event calendar threw `NullInjectorError` in an app that had not
 * called `provideWrDateAdapter()`, although the adapter that call registered is
 * the only one ngwr ships. Injected with nothing provided it is now the native
 * adapter, and the provider stays for the two things only an app can say:
 * another adapter, or another locale.
 */
describe('WrDateAdapter default', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('is the native adapter with nothing provided', () => {
    TestBed.configureTestingModule({});
    const adapter = TestBed.inject(WrDateAdapter);

    expect(adapter).toBeInstanceOf(WrNativeDateAdapter);
    // `useExisting`, so one native adapter per root whichever token asked first.
    expect(adapter).toBe(TestBed.inject(WrNativeDateAdapter));
  });

  it("formats in the app's LOCALE_ID with nothing provided", () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'ru-RU' }] });

    expect(TestBed.inject(WrDateAdapter).getMonthNames('long')[2]).toBe('март');
  });

  it('gives way to an adapter passed to provideWrDateAdapter', () => {
    TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ adapter: FixedClockAdapter })] });
    const adapter = TestBed.inject(WrDateAdapter);

    expect(adapter).toBeInstanceOf(FixedClockAdapter);
    expect(adapter.today().getFullYear()).toBe(2000);
  });

  it('builds an undecorated subclass as itself, not as the native adapter', () => {
    // Such a class inherits the base's injectable definition, so the base's
    // factory is what builds it. A `@Service({ factory })` default ignores the
    // type it is handed and would return the native adapter here, silently
    // replacing the app's own. Angular warns about the inheritance in dev mode,
    // which is why the base class asks for a decorator.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const adapter = UndecoratedAdapter as unknown as Type<WrDateAdapter<unknown>>;
    TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ adapter })] });

    expect(TestBed.inject(WrDateAdapter)).toBeInstanceOf(UndecoratedAdapter);
  });
});

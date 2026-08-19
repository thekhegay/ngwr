import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WR_CONFIG, provideWrConfig, useConfigValue } from 'ngwr/config';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The precedence order IS the feature: bound value, then config, then the
 * component's own fallback. Everything here is about that order holding, and
 * about `false` and `0` surviving it — a config that a template cannot turn off
 * is the failure mode this design exists to avoid.
 */
@Component({
  selector: 'wr-config-host',
  template: '',
})
class Host {
  readonly size = input<'sm' | 'md' | 'lg' | null>(null);
  readonly rounded = input<boolean | null>(null);

  readonly resolvedSize = useConfigValue(this.size, c => c.button?.size, 'md');
  readonly resolvedRounded = useConfigValue(this.rounded, c => c.select?.rounded, false);
}

/**
 * The parity guard, asserted at COMPILE time — there is nothing to run.
 *
 * `useConfigValue`'s JSDoc promises that a component whose scale is narrower than
 * `WrControlSize` stops compiling rather than accepting a value it cannot render.
 * The `NoInfer`s on `pick` / `fallback` are the whole of that promise: remove them
 * and `T` widens to the config's own union, the line below type-checks, and the
 * unused `@ts-expect-error` becomes the error instead — so the suite stops
 * BUILDING, which is the only failure mode a type-level guard has.
 */
@Component({
  selector: 'wr-config-narrow-host',
  template: '',
})
class NarrowHost {
  /** A scale with no `lg`, the way half the catalog's controls are declared. */
  readonly size = input<'sm' | 'md' | null>(null);

  // @ts-expect-error — `c.button?.size` is the wider `WrControlSize`, and this
  // component cannot render `lg`. Widening `WrControlSize` must break its callers.
  readonly resolvedSize = useConfigValue(this.size, c => c.button?.size, 'md');
}

describe('the type-parity guard', () => {
  it('is guarding against a real unsoundness, not a hypothetical one', () => {
    // What the suppressed error buys: `resolvedSize` is typed `'sm' | 'md'` and
    // holds `'lg'`. Components push that straight into a `wr-<block>--${size}`
    // modifier, so the drift reaches the host as a class nothing styles.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrConfig({ button: { size: 'lg' } })] });
    const narrow = TestBed.createComponent(NarrowHost);
    narrow.detectChanges();

    expect(narrow.componentInstance.resolvedSize()).toBe('lg');
    narrow.destroy();
  });
});

describe('useConfigValue', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const mount = (providers: unknown[] = []): Host => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  afterEach(() => fixture.destroy());

  it('falls back to the component default when nothing is configured', () => {
    const host = mount();

    expect(host.resolvedSize()).toBe('md');
    expect(host.resolvedRounded()).toBe(false);
  });

  it('takes the configured default when the template says nothing', () => {
    const host = mount([provideWrConfig({ button: { size: 'lg' }, select: { rounded: true } })]);

    expect(host.resolvedSize()).toBe('lg');
    expect(host.resolvedRounded()).toBe(true);
  });

  it('lets a bound value beat the config', () => {
    mount([provideWrConfig({ button: { size: 'lg' } })]);
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();

    expect(fixture.componentInstance.resolvedSize()).toBe('sm');
  });

  it('lets a bound `false` turn a configured `true` back off', () => {
    // The case a `??` on a falsy check would get wrong, and the one that decides
    // whether a global config is escapable at all.
    mount([provideWrConfig({ select: { rounded: true } })]);
    fixture.componentRef.setInput('rounded', false);
    fixture.detectChanges();

    expect(fixture.componentInstance.resolvedRounded()).toBe(false);
  });

  it('reads a config that names other components without disturbing this one', () => {
    const host = mount([provideWrConfig({ checkbox: { size: 'sm' } })]);

    expect(host.resolvedSize()).toBe('md');
  });

  it('tracks the binding, so a later change is picked up', () => {
    const host = mount([provideWrConfig({ button: { size: 'lg' } })]);
    expect(host.resolvedSize()).toBe('lg');

    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(host.resolvedSize()).toBe('sm');

    // Back to unset — the config takes over again rather than the last value
    // sticking, which is what a `linkedSignal`-shaped implementation would do.
    fixture.componentRef.setInput('size', null);
    fixture.detectChanges();
    expect(host.resolvedSize()).toBe('lg');
  });
});

describe('provideWrConfig', () => {
  it('is what the token resolves to', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrConfig({ button: { size: 'lg' } })] });

    expect(TestBed.inject(WR_CONFIG)).toEqual({ button: { size: 'lg' } });
  });

  it('resolves to an empty config when nobody provided one', () => {
    // The token has a root factory, so a component asking for its own default
    // never has to care whether the app configured anything.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(WR_CONFIG)).toEqual({});
  });

  it('touches no DOM', () => {
    // Unlike `provideWrDensity()`, which instantiates its service to write
    // `[data-wr-density]` onto `<html>`, a config is read on demand. Providing one
    // the app never uses costs a token and changes nothing about the document.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrConfig({ select: { rounded: true } })] });
    const before = document.documentElement.outerHTML.length;

    TestBed.inject(WR_CONFIG);

    expect(document.documentElement.outerHTML.length).toBe(before);
  });
});

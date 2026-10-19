import {
  EnvironmentInjector,
  InjectionToken,
  createEnvironmentInjector,
  inject,
  provideEnvironmentInitializer,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { withDates } from 'ngwr/date';
import { withDensity } from 'ngwr/density';
import { withMeta } from 'ngwr/meta';
import { withStorage } from 'ngwr/storage';
import { withTheme } from 'ngwr/theme';
import { withToast } from 'ngwr/toast';
import { wrFeature } from 'ngwr/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { provideWr } from './public-api';

const FIRST = new InjectionToken<string>('FIRST');
const SECOND = new InjectionToken<string>('SECOND');

/**
 * `provideWr()` owns nothing of its own — every provider it returns belongs to
 * a feature — so what is under test is the plumbing: that each feature's
 * providers arrive whole, initializers included, wherever the call is placed,
 * and that a feature passed twice is named rather than resolved by whichever
 * copy Angular happens to read last.
 */
describe('provideWr', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('flattens every feature into one set of providers', () => {
    TestBed.configureTestingModule({
      providers: [
        provideWr(
          wrFeature('first', [{ provide: FIRST, useValue: 'one' }]),
          wrFeature('second', [{ provide: SECOND, useValue: 'two' }])
        ),
      ],
    });

    expect([TestBed.inject(FIRST), TestBed.inject(SECOND)]).toEqual(['one', 'two']);
  });

  it('runs the initializers a feature carries when the injector is built', () => {
    const booted = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideWr(
          wrFeature('boot', [
            { provide: FIRST, useValue: 'ready' },
            provideEnvironmentInitializer(() => booted(inject(FIRST))),
          ])
        ),
      ],
    });

    TestBed.inject(EnvironmentInjector);

    expect(booted).toHaveBeenCalledTimes(1);
    expect(booted).toHaveBeenCalledWith('ready');
  });

  it('takes no features at all', () => {
    TestBed.configureTestingModule({ providers: [provideWr()] });

    expect(() => TestBed.inject(EnvironmentInjector)).not.toThrow();
  });

  it("works in a route's providers, scoped to the route", () => {
    TestBed.configureTestingModule({
      providers: [provideWr(wrFeature('first', [{ provide: FIRST, useValue: 'root' }]))],
    });
    // A child environment injector is what a lazy route creates.
    const route = createEnvironmentInjector(
      [provideWr(wrFeature('first', [{ provide: FIRST, useValue: 'route' }]))],
      TestBed.inject(EnvironmentInjector)
    );

    expect([route.get(FIRST), TestBed.inject(FIRST)]).toEqual(['route', 'root']);
    route.destroy();
  });

  it('reports a feature kind passed twice, naming the kind', () => {
    // Two copies of one feature mean two configs for one service, and only one
    // of them can win — silently, by provider order. Vitest runs in dev mode.
    expect(() =>
      provideWr(
        wrFeature('density', [{ provide: FIRST, useValue: 'a' }]),
        wrFeature('density', [{ provide: FIRST, useValue: 'b' }])
      )
    ).toThrow(/\[NGWR\].*density/);
  });

  it('gives every shipped feature a kind of its own', () => {
    // A kind copied from a neighbouring feature would make two different
    // features refuse each other as duplicates.
    const features = [withDates(), withDensity(), withMeta(), withStorage(), withTheme(), withToast({})];

    expect(new Set(features.map(f => f.ɵkind)).size).toBe(features.length);
    expect(() => provideWr(...features)).not.toThrow();
  });
});

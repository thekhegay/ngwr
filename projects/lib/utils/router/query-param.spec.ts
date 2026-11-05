/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Location } from '@angular/common';
import { type SpyLocation, provideLocationMocks } from '@angular/common/testing';
import {
  ApplicationRef,
  EnvironmentInjector,
  PLATFORM_ID,
  type WritableSignal,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, NavigationStart, Router, provideRouter, withRouterConfig } from '@angular/router';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { wrQueryParam } from './query-param';

/** What `/page` lets through. The spec swaps it per case; the default lets everything through. */
let gate: (route: ActivatedRouteSnapshot) => boolean | Promise<boolean> = () => true;

const ROUTES = [
  { path: '', children: [] },
  {
    path: 'page',
    children: [],
    canActivate: [(route: ActivatedRouteSnapshot) => gate(route)],
    // A write changes query params only, which the default never re-guards.
    runGuardsAndResolvers: 'paramsOrQueryParamsChange' as const,
  },
];

/** Lets the microtask flush navigate, then lets the navigation land. */
const settle = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
  await TestBed.inject(ApplicationRef).whenStable();
};

describe('wrQueryParam', () => {
  let router: Router;
  let location: SpyLocation;
  let starts: number;

  const create = <T>(fn: () => WritableSignal<T>): WritableSignal<T> => TestBed.runInInjectionContext(fn);

  beforeEach(() => {
    gate = () => true;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES, withRouterConfig({ resolveNavigationPromiseOnError: true })),
        provideLocationMocks(),
      ],
    });
    router = TestBed.inject(Router);
    location = TestBed.inject(Location) as SpyLocation;
    // What bootstrapping does and `TestBed` does not: without it Back moves the
    // location and the router never hears of it.
    router.setUpLocationChangeListener();
    starts = 0;
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) starts++;
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('needs an injection context', () => {
    expect(() => wrQueryParam('q')).toThrow(/injection context/);
  });

  it('reads an absent parameter as the default, an empty string unless given', async () => {
    await router.navigateByUrl('/page');

    expect(create(() => wrQueryParam('q'))()).toBe('');
    expect(create(() => wrQueryParam('q', { default: 'all' }))()).toBe('all');
    expect(create(() => wrQueryParam<number>('page', { default: 1, parse: Number, serialize: String }))()).toBe(1);
  });

  it('reads the address it is created on, and navigates nothing to do so', async () => {
    await router.navigateByUrl('/page?q=hello&tag=a&tag=b');
    const before = starts;

    const q = create(() => wrQueryParam('q'));
    const tag = create(() => wrQueryParam('tag'));
    await settle();

    expect(q()).toBe('hello');
    // A repeated parameter reads its first value, as `queryParamMap.get` does.
    expect(tag()).toBe('a');
    expect(starts).toBe(before);
  });

  it('follows the address through navigation, Back and Forward', async () => {
    await router.navigateByUrl('/page');
    const q = create(() => wrQueryParam('q'));

    await router.navigateByUrl('/page?q=one');
    expect(q()).toBe('one');

    await router.navigateByUrl('/page?q=two');
    expect(q()).toBe('two');

    location.back();
    await settle();
    expect(q()).toBe('one');

    location.forward();
    await settle();
    expect(q()).toBe('two');

    await router.navigateByUrl('/page');
    expect(q()).toBe('');
  });

  it('writes the address, keeps the other parameters and the fragment, and takes the value at once', async () => {
    await router.navigateByUrl('/page?keep=1&q=a#top');
    const q = create(() => wrQueryParam('q'));

    q.set('b');
    expect(q()).toBe('b');
    await settle();

    expect(router.url).toBe('/page?keep=1&q=b#top');
    expect(location.path()).toBe('/page?keep=1&q=b#top');

    q.update(value => `${value}!`);
    await settle();
    expect(router.url).toBe('/page?keep=1&q=b!#top');
  });

  it('removes the parameter on a write of the default, and navigates nothing when it is already absent', async () => {
    await router.navigateByUrl('/page?q=a');
    const q = create(() => wrQueryParam('q'));
    const before = starts;

    q.set('');
    await settle();
    expect(router.url).toBe('/page');
    expect(starts).toBe(before + 1);

    q.set('');
    await settle();
    expect(starts).toBe(before + 1);
  });

  it('navigates nothing on a write of the value the address already has', async () => {
    await router.navigateByUrl('/page?q=a');
    const q = create(() => wrQueryParam('q'));
    const before = starts;

    q.set('a');
    await settle();

    expect(starts).toBe(before);
  });

  it('makes one navigation of every write in a task, across signals', async () => {
    await router.navigateByUrl('/page');
    const q = create(() => wrQueryParam('q'));
    const page = create(() => wrQueryParam<number>('page', { default: 1, parse: Number, serialize: String }));
    const before = starts;

    q.set('a');
    q.set('b');
    page.set(3);
    await settle();

    expect(starts).toBe(before + 1);
    expect(router.url).toBe('/page?q=b&page=3');
  });

  it('parses and serializes a typed parameter, with the default left out of the address', async () => {
    await router.navigateByUrl('/page?tags=a,b');
    const tags = create(() =>
      wrQueryParam<string[]>('tags', {
        default: [],
        parse: raw => raw.split(','),
        serialize: value => value.join(','),
      })
    );

    expect(tags()).toEqual(['a', 'b']);

    tags.set(['c']);
    await settle();
    expect(router.url).toBe('/page?tags=c');

    // A new empty array is not `default` by identity, but serializes like it.
    tags.set([]);
    await settle();
    expect(router.url).toBe('/page');
  });

  it('reads the default when parse throws, and leaves the address alone', async () => {
    await router.navigateByUrl('/page?n=junk');
    const before = starts;
    const n = create(() =>
      wrQueryParam<number>('n', {
        default: 0,
        parse: raw => {
          const value = Number(raw);
          if (Number.isNaN(value)) throw new Error('not a number');
          return value;
        },
        serialize: String,
      })
    );
    await settle();

    expect(n()).toBe(0);
    expect(router.url).toBe('/page?n=junk');
    expect(starts).toBe(before);

    // Writing the default from here does remove the junk: the address had it.
    n.set(0);
    await settle();
    expect(router.url).toBe('/page');
  });

  it('replaces the history entry when every write of the task asked to, and pushes otherwise', async () => {
    await router.navigateByUrl('/page');
    const q = create(() => wrQueryParam('q', { replaceUrl: true }));
    const page = create(() => wrQueryParam('page'));

    q.set('a');
    await settle();
    expect(location.urlChanges.at(-1)).toBe('replace: /page?q=a');

    q.set('b');
    page.set('2');
    await settle();
    expect(location.urlChanges.at(-1)).toBe('/page?q=b&page=2');
  });

  it('moves every signal of the parameter, the writer and the others alike', async () => {
    await router.navigateByUrl('/page');
    const one = create(() => wrQueryParam('q'));
    const two = create(() => wrQueryParam('q'));

    one.set('a');
    expect(two()).toBe('');
    await settle();

    expect(one()).toBe('a');
    expect(two()).toBe('a');
  });

  it('waits for a navigation in flight, then lands on the address it produced', async () => {
    await router.navigateByUrl('/page');
    const q = create(() => wrQueryParam('q'));

    let open!: (allowed: boolean) => void;
    gate = () => new Promise<boolean>(resolve => (open = resolve));
    const before = starts;
    void router.navigateByUrl('/page?from=link');

    q.set('a');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(starts).toBe(before + 1);
    expect(q()).toBe('a');

    gate = () => true;
    open(true);
    await settle();

    expect(starts).toBe(before + 2);
    expect(router.url).toBe('/page?from=link&q=a');
    expect(q()).toBe('a');
  });

  it('reads the address again when its own navigation is cancelled', async () => {
    await router.navigateByUrl('/page?q=a');
    const q = create(() => wrQueryParam('q'));
    gate = route => route.queryParamMap.get('q') !== 'blocked';

    q.set('blocked');
    expect(q()).toBe('blocked');
    await settle();

    expect(router.url).toBe('/page?q=a');
    expect(q()).toBe('a');
  });

  it('reads the address again when its own navigation fails', async () => {
    await router.navigateByUrl('/page?q=a');
    const q = create(() => wrQueryParam('q'));
    gate = route => {
      if (route.queryParamMap.get('q') === 'boom') throw new Error('boom');
      return true;
    };

    q.set('boom');
    await settle();

    expect(router.url).toBe('/page?q=a');
    expect(q()).toBe('a');
  });

  it('stops following when its injection context is destroyed, and still navigates a write already made', async () => {
    await router.navigateByUrl('/page');
    const scope: EnvironmentInjector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const q = runInInjectionContext(scope, () => wrQueryParam('q'));

    q.set('a');
    scope.destroy();
    await settle();
    expect(router.url).toBe('/page?q=a');

    await router.navigateByUrl('/page?q=b');
    expect(q()).toBe('a');
  });

  it('drops a write waiting on the navigation that destroys its signal', async () => {
    await router.navigateByUrl('/page');
    const scope: EnvironmentInjector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const q = runInInjectionContext(scope, () => wrQueryParam('q'));

    let open!: (allowed: boolean) => void;
    gate = () => new Promise<boolean>(resolve => (open = resolve));
    void router.navigateByUrl('/page?from=link');

    q.set('a');
    await new Promise(resolve => setTimeout(resolve, 0));
    scope.destroy();

    gate = () => true;
    open(true);
    await settle();

    expect(router.url).toBe('/page?from=link');
  });

  it('keeps a null default, in the signal and out of the address', async () => {
    await router.navigateByUrl('/page?id=7');
    const id = create(() => wrQueryParam<number | null>('id', { default: null, parse: Number, serialize: String }));
    expect(id()).toBe(7);

    id.set(null);
    await settle();

    expect(id()).toBeNull();
    expect(router.url).toBe('/page');
  });

  it('reads the address again when opposite writes of a task leave it as it was', async () => {
    await router.navigateByUrl('/page?q=a');
    const one = create(() => wrQueryParam('q'));
    const two = create(() => wrQueryParam('q'));
    const before = starts;

    one.set('b');
    two.set('a');
    await settle();

    expect(starts).toBe(before);
    expect(one()).toBe('a');
  });

  it('refuses a typed parameter without parse and serialize at the type level', () => {
    // @ts-expect-error a number needs parse and serialize
    const page = (): WritableSignal<number> => wrQueryParam<number>('page', { default: 1 });
    expect(page).toBeTypeOf('function');
  });
});

describe('wrQueryParam on the server', () => {
  let router: Router;
  let starts: number;

  beforeEach(() => {
    gate = () => true;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter(ROUTES), provideLocationMocks(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    router = TestBed.inject(Router);
    starts = 0;
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) starts++;
    });
  });

  it('reads the parameter from the router, and a write moves the signal only', async () => {
    await router.navigateByUrl('/page?q=a');
    const q = TestBed.runInInjectionContext(() => wrQueryParam('q'));
    const before = starts;

    expect(q()).toBe('a');

    q.set('b');
    await settle();

    expect(q()).toBe('b');
    expect(router.url).toBe('/page?q=a');
    expect(starts).toBe(before);
  });
});

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { WrLoadingBar } from 'ngwr/loading-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideWrLoadingBarRouter } from './provide-wr-loading-bar-router';

/**
 * The half of `WrLoadingBar` that knows about the router. It lives here because
 * naming `Router` in the service put 66.3 kB of `@angular/router` into every app
 * that rendered the bar, routed or not — `{ optional: true }` included, which
 * measured byte-for-byte identical to a required inject.
 *
 * So the assertions are about the wiring: a navigation moves the bar, every
 * terminal event releases the slot it took, and the initializer does not run in
 * the prerenderer.
 */
describe('provideWrLoadingBarRouter', () => {
  const setup = (platform: 'browser' | 'server' = 'browser'): { bar: WrLoadingBar; router: Router } => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...(platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : []),
        provideRouter([]),
        provideWrLoadingBarRouter(),
      ],
    });
    // The wiring is an environment initializer, so nothing has run until the
    // injector is created — this first `inject` is what boots it.
    return { bar: TestBed.inject(WrLoadingBar), router: TestBed.inject(Router) };
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts the bar when a navigation begins and finishes it when it lands', async () => {
    const { bar, router } = setup();

    const navigation = router.navigateByUrl('/');
    expect(bar.state()).toBe('running');

    await navigation;
    expect(bar.progress()).toBe(1);

    vi.advanceTimersByTime(220);
    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
  });

  it('releases the slot a cancelled navigation took', async () => {
    const { bar, router } = setup();
    // A guard that redirects, a route that does not exist: both end as something
    // other than `NavigationEnd`, and a bar that only listens for that one
    // trickles at ~90% for the rest of the session.
    await router.navigateByUrl('/nowhere').catch(() => undefined);

    expect(bar.state()).not.toBe('running');
  });

  it('drives nothing in the prerenderer', async () => {
    const { bar, router } = setup('server');
    await router.navigateByUrl('/').catch(() => undefined);

    // Nothing paints during prerender, and the reset that would clear a 100% bar
    // is deferred past serialization — so a bar left running here ships as a
    // full-width stripe across the top of every cold page load.
    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
  });
});

/**
 * The other half of the contract, and the one a consumer upgrading from v13
 * lands on: without the call, the bar is a manual state machine and navigations
 * do not touch it.
 */
describe('WrLoadingBar without provideWrLoadingBarRouter', () => {
  it('ignores navigations', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const bar = TestBed.inject(WrLoadingBar);

    await TestBed.inject(Router).navigateByUrl('/');

    expect([bar.progress(), bar.state()]).toEqual([0, 'idle']);
  });
});

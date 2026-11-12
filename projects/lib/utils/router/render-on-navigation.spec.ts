/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ApplicationRef, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideWr } from 'ngwr';
import type { WrFeature } from 'ngwr/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withRenderOnNavigation } from './render-on-navigation';

@Component({ template: `<p [class.bound]="on()">page</p>` })
class Page {
  protected readonly on = signal(true);
}

const routes = [
  { path: 'a', component: Page },
  { path: 'b', component: Page },
];

describe('withRenderOnNavigation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const setup = async (features: readonly WrFeature[]): Promise<RouterTestingHarness> => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes), provideWr(...features)],
    });
    return RouterTestingHarness.create();
  };

  it('ticks the app in the same task as the navigation ends', async () => {
    const harness = await setup([withRenderOnNavigation()]);
    const tick = vi.spyOn(TestBed.inject(ApplicationRef), 'tick');

    const navigation = TestBed.inject(Router).navigateByUrl('/a');
    // Microtasks drain before any macrotask, so a tick seen here ran before the
    // browser could paint the inserted page.
    await navigation;
    await Promise.resolve();

    expect(tick).toHaveBeenCalled();
    expect(harness.routeNativeElement?.querySelector('p')?.classList).toContain('bound');
  });

  it('adds no tick without the feature', async () => {
    await setup([]);
    const tick = vi.spyOn(TestBed.inject(ApplicationRef), 'tick');

    await TestBed.inject(Router).navigateByUrl('/b');
    await Promise.resolve();

    expect(tick).not.toHaveBeenCalled();
  });
});

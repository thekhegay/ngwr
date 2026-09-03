/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSquircle } from './wr-squircle';

/**
 * The shape itself is unassertable here — jsdom has no layout, so every host
 * measures 0×0 and the `clip-path` the directive writes describes nothing. What
 * IS assertable is the wiring: the directive's three `model()`s are its whole
 * point (a composing parent flips them from outside), and `exportAs` is what lets
 * a TEMPLATE do the same. `compute-squircle-path.spec.ts` covers the geometry.
 *
 * jsdom ships no `ResizeObserver`, and the directive observes its host in the
 * constructor — so the stub below is what lets the directive construct at all,
 * not a convenience.
 */
@Component({
  imports: [WrSquircle],
  template: `<div wrSquircle #ref="wrSquircle" [borderWidth]="2">Card</div>`,
})
class ExportHost {
  readonly squircle = viewChild.required<WrSquircle>('ref');
}

/** Enough of the contract for the directive's constructor; jsdom resizes nothing. */
class NoopResizeObserver implements ResizeObserver {
  observe(): void {
    // Nothing to watch: every element in jsdom is 0x0 and stays that way.
  }

  unobserve(): void {
    // Symmetry with `observe`.
  }

  disconnect(): void {
    // The directive calls this on destroy; there is nothing to tear down.
  }
}

describe('WrSquircle', () => {
  const original = globalThis.ResizeObserver;

  beforeEach(() => {
    globalThis.ResizeObserver = NoopResizeObserver;
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    globalThis.ResizeObserver = original;
  });

  it('publishes the instance as `wrSquircle`', () => {
    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const squircle = fixture.componentInstance.squircle();
    expect(squircle).toBeInstanceOf(WrSquircle);
    expect(squircle.enabled()).toBe(true);

    fixture.destroy();
  });

  it('lets a template flip the models the reference reaches', () => {
    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('div');
    expect(host?.classList.contains('wr-squircle--bordered')).toBe(true);

    // The reason `enabled` is a `model()` and not an `input()`: something outside
    // the declaring template owns the state. A template reference is that
    // something, once the directive says how to be named.
    fixture.componentInstance.squircle().enabled.set(false);
    fixture.detectChanges();

    expect(host?.classList.contains('wr-squircle--bordered')).toBe(false);

    fixture.destroy();
  });
});

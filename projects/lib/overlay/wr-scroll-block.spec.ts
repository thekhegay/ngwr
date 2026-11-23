import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrScrollBlock } from './wr-scroll-block';

describe('WrScrollBlock', () => {
  const blocked = (): boolean => document.documentElement.classList.contains('cdk-global-scrollblock');

  beforeEach(() => {
    // jsdom lays nothing out, and CDK blocks only a page that overflows.
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true });
  });

  afterEach(() => {
    delete (document.documentElement as { scrollHeight?: number }).scrollHeight;
    document.documentElement.classList.remove('cdk-global-scrollblock');
    TestBed.resetTestingModule();
  });

  it('blocks the page while any holder is enabled', () => {
    const lock = TestBed.inject(WrScrollBlock);
    const first = lock.strategy();
    const second = lock.strategy();

    first.enable();
    second.enable();
    expect(blocked()).toBe(true);

    first.disable();
    expect(blocked()).toBe(true);

    second.disable();
    expect(blocked()).toBe(false);
  });

  it('releases only with the last holder, whatever the order', () => {
    const lock = TestBed.inject(WrScrollBlock);
    const first = lock.strategy();
    const second = lock.strategy();

    first.enable();
    second.enable();
    second.disable();
    expect(blocked()).toBe(true);

    first.disable();
    expect(blocked()).toBe(false);
  });

  it('counts a holder once, however often it is enabled or disabled', () => {
    const lock = TestBed.inject(WrScrollBlock);
    const first = lock.strategy();
    const second = lock.strategy();

    first.enable();
    first.enable();
    second.enable();
    first.disable();
    first.disable();
    expect(blocked()).toBe(true);

    second.disable();
    expect(blocked()).toBe(false);
  });
});

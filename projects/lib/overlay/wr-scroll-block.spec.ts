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

  describe('the page behind', () => {
    const added: HTMLElement[] = [];
    const child = (setup?: (el: HTMLElement) => void): HTMLElement => {
      const el = document.createElement('div');
      setup?.(el);
      document.body.appendChild(el);
      added.push(el);
      return el;
    };

    afterEach(() => {
      added.splice(0).forEach(el => el.remove());
    });

    it('is inert while any holder is enabled, and not after the last one', () => {
      const page = child();
      const lock = TestBed.inject(WrScrollBlock);
      const first = lock.strategy();
      const second = lock.strategy();
      expect(page.hasAttribute('inert')).toBe(false);

      first.enable();
      second.enable();
      expect(page.hasAttribute('inert')).toBe(true);

      first.disable();
      expect(page.hasAttribute('inert')).toBe(true);

      second.disable();
      expect(page.hasAttribute('inert')).toBe(false);
    });

    it('leaves overlay containers, what holds one, and live regions reachable', () => {
      const container = child(el => el.classList.add('cdk-overlay-container'));
      const holder = child(el => (el.innerHTML = '<div class="cdk-overlay-container"></div>'));
      const polite = child(el => el.setAttribute('aria-live', 'polite'));
      const status = child(el => el.setAttribute('role', 'status'));
      const holderOfNone = child();
      const strategy = TestBed.inject(WrScrollBlock).strategy();

      strategy.enable();

      for (const el of [container, holder, polite, status]) expect(el.hasAttribute('inert')).toBe(false);
      expect(holderOfNone.hasAttribute('inert')).toBe(true);
      strategy.disable();
    });

    it('leaves an element that was inert already inert after the release', () => {
      const own = child(el => el.setAttribute('inert', ''));
      const strategy = TestBed.inject(WrScrollBlock).strategy();

      strategy.enable();
      strategy.disable();

      expect(own.hasAttribute('inert')).toBe(true);
    });

    it('covers what joined the page before a later holder', () => {
      const lock = TestBed.inject(WrScrollBlock);
      const first = lock.strategy();
      const second = lock.strategy();

      first.enable();
      const late = child();
      second.enable();
      expect(late.hasAttribute('inert')).toBe(true);

      first.disable();
      second.disable();
      expect(late.hasAttribute('inert')).toBe(false);
    });

    it('covers a child appended while a modal is open, with the same exclusions', async () => {
      const strategy = TestBed.inject(WrScrollBlock).strategy();
      strategy.enable();

      const late = child();
      const region = child(el => el.setAttribute('aria-live', 'polite'));
      const own = child(el => el.setAttribute('inert', ''));
      await Promise.resolve();
      expect(late.hasAttribute('inert')).toBe(true);
      expect(region.hasAttribute('inert')).toBe(false);

      strategy.disable();
      expect(late.hasAttribute('inert')).toBe(false);
      expect(own.hasAttribute('inert')).toBe(true);

      const after = child();
      await Promise.resolve();
      expect(after.hasAttribute('inert')).toBe(false);
    });

    it('tells whether a node sits in what it made inert', () => {
      const page = child(el => (el.innerHTML = '<span></span>'));
      const lock = TestBed.inject(WrScrollBlock);
      const strategy = lock.strategy();
      expect(lock.isolates(page.firstElementChild!)).toBe(false);

      strategy.enable();
      expect(lock.isolates(page.firstElementChild!)).toBe(true);

      strategy.disable();
      expect(lock.isolates(page.firstElementChild!)).toBe(false);
    });

    it('sees a node inside a shadow root as inside what it made inert', () => {
      const page = child();
      const shadow = page.attachShadow({ mode: 'open' });
      const inner = document.createElement('span');
      shadow.appendChild(inner);
      const lock = TestBed.inject(WrScrollBlock);
      const strategy = lock.strategy();

      strategy.enable();
      expect(lock.isolates(inner)).toBe(true);

      strategy.disable();
      expect(lock.isolates(inner)).toBe(false);
    });

    it('only blocks the scroll for a modal that renders inside the page', () => {
      const page = child();
      const lock = TestBed.inject(WrScrollBlock);
      const inPage = lock.strategy(false);
      const modal = lock.strategy();

      inPage.enable();
      expect(page.hasAttribute('inert')).toBe(false);

      modal.enable();
      modal.disable();
      expect(page.hasAttribute('inert')).toBe(false);
      inPage.disable();
    });

    it('releases the page when the application is torn down with a modal open', () => {
      const page = child();
      TestBed.inject(WrScrollBlock).strategy().enable();
      expect(page.hasAttribute('inert')).toBe(true);

      TestBed.resetTestingModule();

      expect(page.hasAttribute('inert')).toBe(false);
    });
  });
});

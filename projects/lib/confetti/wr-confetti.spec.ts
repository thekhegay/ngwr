import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrConfetti } from './wr-confetti';

/** The two platform answers this service branches on. */
const platformStub = (reducedMotion: boolean, browser = true): unknown => ({
  provide: WrPlatform,
  useValue: {
    isBrowser: browser,
    isServer: !browser,
    userAgent: null,
    prefersDark: () => false,
    prefersReducedMotion: () => reducedMotion,
  },
});

/**
 * jsdom gives no 2D context, which is the interesting half rather than a
 * limitation: `getContext('2d')` returning null is a real browser state (a
 * refused context, a headless environment), and the service has to put a canvas
 * on the page, find no context, and stop — without throwing and without leaving a
 * frame loop running.
 */
describe('WrConfetti', () => {
  let confetti: WrConfetti;

  const canvases = (): HTMLCanvasElement[] => [...document.querySelectorAll('canvas')];

  const setup = (platform?: unknown): WrConfetti => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: platform ? [platform as never] : [] });
    return TestBed.inject(WrConfetti);
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    confetti = setup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('puts one full-screen canvas on the page, out of everyone way', () => {
    confetti.fire();

    expect(canvases().length).toBe(1);
    const canvas = canvases()[0];
    // Decoration, and it must never swallow a click meant for the page under it.
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('reuses the same canvas for every burst', () => {
    confetti.fire();
    const first = canvases()[0];
    confetti.fire({ count: 10 });
    confetti.fire({ count: 10 });

    expect(canvases().length).toBe(1);
    expect(canvases()[0]).toBe(first);
  });

  it('survives a browser that will not give it a drawing context', () => {
    // Which is what jsdom is — the guard has to hold rather than the service
    // assuming a context it was handed null for.
    expect(() => confetti.fire({ count: 500 })).not.toThrow();
  });

  it('sizes the canvas to the viewport and the pixel ratio', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    confetti = setup();
    confetti.fire();

    expect(canvases()[0].width).toBe(window.innerWidth * 2);
    expect(canvases()[0].height).toBe(window.innerHeight * 2);
  });

  it('does nothing at all for someone who asked for less motion', () => {
    confetti = setup(platformStub(true));
    confetti.fire();

    // Not even the canvas: a decoration nobody asked for should leave no trace.
    expect(canvases()).toEqual([]);
  });

  it('does nothing on the server', () => {
    confetti = setup({ provide: PLATFORM_ID, useValue: 'server' });
    confetti.fire();

    expect(canvases()).toEqual([]);
  });

  it('takes an options object without complaining about the ones it is not given', () => {
    expect(() => confetti.fire({ count: 5, origin: { x: 0.25, y: 0.5 }, colors: ['#fff'] })).not.toThrow();
    expect(canvases().length).toBe(1);
  });
});

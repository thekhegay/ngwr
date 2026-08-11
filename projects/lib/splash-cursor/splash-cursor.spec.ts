import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSplashCursor } from './splash-cursor';

@Component({
  imports: [WrSplashCursor],
  template: `<wr-splash-cursor [fullscreen]="fullscreen()" [rainbow]="rainbow()" />`,
})
class Host {
  readonly fullscreen = signal(true);
  readonly rainbow = signal(true);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * A WebGL fluid simulation that follows the pointer. jsdom refuses the context, which
 * is the state this spec is for: a refused context is a real browser answer, and the
 * component has to put its canvas up and stop rather than throw on a null context.
 */
describe('WrSplashCursor', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const canvas = (): HTMLCanvasElement | null => (fixture.nativeElement as HTMLElement).querySelector('canvas');

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('renders a canvas that is decoration, not content', () => {
    expect(canvas()).not.toBeNull();
    expect(canvas()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('survives a browser with no WebGL', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('takes an input change without reaching for a context it never got', () => {
    fixture.componentInstance.fullscreen.set(false);
    fixture.componentInstance.rainbow.set(false);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('renders the canvas on the server without drawing', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
  });

  it('does not start a loop for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(canvas()).not.toBeNull();
    expect(() => fixture.destroy()).not.toThrow();
  });

  it('tears down cleanly', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });
});

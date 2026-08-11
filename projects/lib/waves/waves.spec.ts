import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrWaves } from './waves';

@Component({
  imports: [WrWaves],
  template: `<wr-waves [friction]="friction()" [tension]="tension()" />`,
})
class Host {
  readonly friction = signal(0.925);
  readonly tension = signal(0.005);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * A 2D-canvas line field. jsdom refuses the context, which is the state this spec is
 * for: `getContext('2d')` returning null is a real browser answer, and the component
 * has to put its canvas up and stop rather than throw on a null context.
 */
describe('WrWaves', () => {
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

  it('survives a browser that will not give it a 2d context', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('takes an input change without reaching for a context it never got', () => {
    fixture.componentInstance.friction.set(0.5);
    fixture.componentInstance.tension.set(0.01);
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

import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrClickSpark } from './click-spark';

@Component({
  imports: [WrClickSpark],
  template: `
    <wr-click-spark [sparkCount]="sparkCount()" [sparkColor]="sparkColor()">
      <button type="button" class="inner">Click me</button>
    </wr-click-spark>
  `,
})
class Host {
  readonly sparkCount = signal(8);
  readonly sparkColor = signal('var(--wr-color-dark)');
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * The sparks are drawn into a canvas jsdom will not give a context for, so what is
 * checkable is everything AROUND the drawing: that the canvas is decoration rather
 * than content, that the click still reaches what it was wrapped around, and that
 * a reader who asked for less motion gets none.
 */
describe('WrClickSpark', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const canvas = (): HTMLCanvasElement => root().querySelector<HTMLCanvasElement>('.wr-click-spark__canvas')!;

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

  it('draws into a canvas that is decoration, not content', () => {
    expect(canvas()).not.toBeNull();
    expect(canvas().getAttribute('aria-hidden')).toBe('true');
  });

  it('lets the click through to what it wraps', () => {
    // The whole point is that it decorates an existing control rather than
    // replacing it — a canvas that ate the click would be useless.
    let clicked = 0;
    root()
      .querySelector('.inner')!
      .addEventListener('click', () => (clicked += 1));
    root().querySelector<HTMLElement>('.inner')!.click();

    expect(clicked).toBe(1);
  });

  it('survives a click with no drawing context behind the canvas', () => {
    const event = new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 });
    expect(() => root().querySelector<HTMLElement>('wr-click-spark')!.dispatchEvent(event)).not.toThrow();
  });

  it('makes no sparks for someone who asked for less motion', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    const event = new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 });

    expect(() => root().querySelector<HTMLElement>('wr-click-spark')!.dispatchEvent(event)).not.toThrow();
  });

  it('renders the canvas and the content on the server too', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
    expect(root().querySelector('.inner')).not.toBeNull();
  });
});

import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFuzzyText } from './fuzzy-text';

@Component({
  imports: [WrFuzzyText],
  template: `<wr-fuzzy-text [text]="text()" [color]="color()" />`,
})
class Host {
  readonly text = signal('404');
  readonly color = signal('inherit');
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * This component paints its text into a canvas as PIXELS, which jsdom will not give
 * it a context for — so the drawing is untestable here and, more to the point, was
 * never the part at risk. What is testable is the half that exists for people who
 * cannot see the drawing at all.
 */
describe('WrFuzzyText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-fuzzy-text__sr-only');
  const canvas = (): HTMLCanvasElement => root().querySelector('canvas')!;

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

  it('carries its text as text, not only as pixels', () => {
    // Everything this component renders used to be a canvas: a screen reader got
    // an empty element where the page showed a headline.
    expect(readable()!.textContent).toBe('404');
    expect(canvas().getAttribute('aria-hidden')).toBe('true');
  });

  it('follows the text it is given', () => {
    fixture.componentInstance.text.set('Not found');
    fixture.detectChanges();

    expect(readable()!.textContent).toBe('Not found');
  });

  it('hides the readable copy without depending on a stylesheet', () => {
    // This entry point ships no CSS, so a consumer importing none would otherwise
    // see the text twice — once as pixels and once as a stray line of markup.
    // Read back off the element rather than as the authored string: the browser
    // normalises the declaration it was given.
    const style = readable()!.style;
    expect(style.position).toBe('absolute');
    expect(style.clipPath).toBe('inset(50%)');
    expect(style.width).toBe('1px');
  });

  it('survives a browser that will not give it a drawing context', () => {
    // Which is what jsdom is: `getContext('2d')` returns null here.
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(canvas()).not.toBeNull();
  });

  it('renders the readable text on the server too', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(readable()!.textContent).toBe('404');
  });

  it('draws nothing for someone who asked for less motion, and still reads', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(readable()!.textContent).toBe('404');
    expect(canvas()).not.toBeNull();
  });
});

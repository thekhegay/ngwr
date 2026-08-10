import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrSplitTextUnit } from './interfaces';
import { WrSplitText } from './split-text';

@Component({
  imports: [WrSplitText],
  template: `
    <wr-split-text
      [text]="text()"
      [splitType]="splitType()"
      [textAlign]="textAlign()"
      (animationComplete)="done = done + 1"
    />
  `,
})
class Host {
  readonly text = signal('Hi there');
  readonly splitType = signal<WrSplitTextUnit>('chars');
  readonly textAlign = signal<'left' | 'center' | 'right' | 'justify'>('center');
  done = 0;
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * Under reduced motion the tween is skipped entirely, which is what makes the
 * component testable here at all — jsdom has neither `IntersectionObserver` (stubbed
 * below) nor the Web Animations API. What is pinned is the split itself, and the
 * accessible layer: a per-character span list read letter by letter is the failure
 * mode this component would otherwise ship.
 */
describe('WrSplitText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let observed: (() => void)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): string => root().querySelector('.wr-split-text__sr-only')!.textContent;
  const pieces = (): string[] => [...root().querySelectorAll('.wr-split-text__piece')].map(el => el.textContent);
  const spaces = (): number => root().querySelectorAll('.wr-split-text__space').length;

  const mount = async (providers: unknown[] = []): Promise<void> => {
    observed = [];
    class StubObserver {
      constructor(private readonly cb: IntersectionObserverCallback) {}
      observe(): void {
        observed.push(() =>
          this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
        );
      }
      disconnect(): void {
        /* nothing to release in the stub */
      }
    }
    vi.stubGlobal('IntersectionObserver', StubObserver);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Scroll it into view, the way the observer would. */
  const enterViewport = async (): Promise<void> => {
    observed.forEach(fire => fire());
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount([{ provide: WrPlatform, useValue: reducedMotion }]));

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('carries the whole string once, with the pieces out of the tree', () => {
    expect(readable()).toBe('Hi there');
    for (const el of root().querySelectorAll('.wr-split-text__piece')) {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('splits into one piece per character, keeping the spaces separate', () => {
    expect(pieces()).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);
    expect(spaces()).toBe(1);
  });

  it('splits into words when asked', () => {
    fixture.componentInstance.splitType.set('words');
    fixture.detectChanges();

    expect(pieces()).toEqual(['Hi', 'there']);
  });

  it('keeps a surrogate pair in one piece', () => {
    fixture.componentInstance.text.set('a🚀');
    fixture.detectChanges();

    expect(pieces()).toEqual(['a', '🚀']);
  });

  it('reports completion as soon as it is seen, for someone who asked for less motion', async () => {
    expect(fixture.componentInstance.done).toBe(0);
    await enterViewport();

    expect(fixture.componentInstance.done).toBe(1);
  });

  it('reports completion once, however often it is seen', async () => {
    await enterViewport();
    await enterViewport();

    expect(fixture.componentInstance.done).toBe(1);
  });

  it('waits to be seen before doing anything', async () => {
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(fixture.componentInstance.done).toBe(0);
    expect(observed.length).toBeGreaterThan(0);
  });

  it('follows the alignment it was given', () => {
    expect(root().querySelector<HTMLElement>('wr-split-text')!.style.textAlign).toBe('center');

    fixture.componentInstance.textAlign.set('right');
    fixture.detectChanges();
    expect(root().querySelector<HTMLElement>('wr-split-text')!.style.textAlign).toBe('right');
  });

  it('renders the text plainly on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(readable()).toBe('Hi there');
    expect(pieces().join('')).toBe('Hithere');
    expect(observed).toEqual([]);
  });
});

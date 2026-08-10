import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBlurText } from './blur-text';

@Component({
  imports: [WrBlurText],
  template: `
    <wr-blur-text
      [text]="text()"
      [animateBy]="animateBy()"
      [direction]="direction()"
      (animationComplete)="done = done + 1"
    />
  `,
})
class Host {
  readonly text = signal('Hi there');
  readonly animateBy = signal<'chars' | 'words'>('words');
  readonly direction = signal<'top' | 'bottom'>('top');
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
 * The sibling of `wr-split-text` — same piece-splitting shape, same viewport
 * trigger, same reduced-motion escape, and until now the same missing accessible
 * layer. The stub for `IntersectionObserver` and the reasoning behind running under
 * reduced motion are documented in `split-text.spec.ts`.
 */
describe('WrBlurText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let observed: (() => void)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): string => root().querySelector('.wr-blur-text__sr-only')!.textContent;
  const pieces = (): string[] => [...root().querySelectorAll('.wr-blur-text__piece')].map(el => el.textContent);

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
    for (const el of root().querySelectorAll('.wr-blur-text__piece')) {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('splits by word by default, and by character when asked', () => {
    expect(pieces()).toEqual(['Hi', 'there']);

    fixture.componentInstance.animateBy.set('chars');
    fixture.detectChanges();
    expect(pieces()).toEqual(['H', 'i', 't', 'h', 'e', 'r', 'e']);
  });

  it('keeps a surrogate pair in one piece', () => {
    fixture.componentInstance.text.set('a🚀');
    fixture.componentInstance.animateBy.set('chars');
    fixture.detectChanges();

    expect(pieces()).toEqual(['a', '🚀']);
  });

  it('keeps the whitespace between words as its own piece', () => {
    expect(root().querySelectorAll('.wr-blur-text__space').length).toBe(1);
  });

  it('reports completion once it is seen, and only once', async () => {
    expect(fixture.componentInstance.done).toBe(0);

    await enterViewport();
    await enterViewport();
    expect(fixture.componentInstance.done).toBe(1);
  });

  it('renders the text plainly on the server', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(readable()).toBe('Hi there');
    expect(pieces()).toEqual(['Hi', 'there']);
    expect(observed).toEqual([]);
  });
});

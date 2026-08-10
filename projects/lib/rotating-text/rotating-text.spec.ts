import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WrRotatingTextSplit } from './interfaces';
import { WrRotatingText } from './rotating-text';

@Component({
  imports: [WrRotatingText],
  template: `
    <wr-rotating-text
      [texts]="texts()"
      [splitBy]="splitBy()"
      [auto]="auto()"
      [loop]="loop()"
      [rotationInterval]="100"
      (nextChange)="seen.push($event)"
    />
  `,
})
class Host {
  readonly texts = signal<readonly string[]>(['one', 'two', 'three']);
  readonly splitBy = signal<WrRotatingTextSplit>('characters');
  readonly auto = signal(false);
  readonly loop = signal(true);
  readonly seen: number[] = [];
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * Every spec here runs under reduced motion, and that is not a shortcut: jsdom has
 * no Web Animations API at all, so the animated path would throw on `el.animate`
 * before any assertion ran. The reduced-motion path is also the one where the swap
 * is INSTANT, which makes each rotation a single synchronous step to assert on —
 * and it is a path real users get, so pinning it is not a compromise.
 */
describe('WrRotatingText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): string => root().querySelector('.wr-rotating-text__sr-only')!.textContent;
  const chars = (): string[] => [...root().querySelectorAll('.wr-rotating-text__char')].map(el => el.textContent);
  const words = (): number => root().querySelectorAll('.wr-rotating-text__word').length;
  const instance = (): WrRotatingText =>
    fixture.debugElement.query(By.directive(WrRotatingText)).componentInstance as WrRotatingText;

  const mount = async (): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Drive one rotation and let the render that follows it settle. */
  const rotate = async (move: () => void): Promise<void> => {
    move();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => mount());

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('carries the current string as readable text, with the animation hidden', () => {
    expect(readable()).toBe('one');
    expect(root().querySelector('.wr-rotating-text__inner')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('splits into one span per character by default', () => {
    expect(chars()).toEqual(['o', 'n', 'e']);
    expect(words()).toBe(1);
  });

  it('splits by word and by line when asked', () => {
    fixture.componentInstance.texts.set(['hello there']);
    fixture.componentInstance.splitBy.set('words');
    fixture.detectChanges();
    expect(chars()).toEqual(['hello', 'there']);

    fixture.componentInstance.texts.set(['top\nbottom']);
    fixture.componentInstance.splitBy.set('lines');
    fixture.detectChanges();
    expect(chars()).toEqual(['top', 'bottom']);
  });

  it('keeps a grapheme cluster in one span', () => {
    // Splitting by code unit would put half a surrogate in a span of its own.
    fixture.componentInstance.texts.set(['a🚀b']);
    fixture.detectChanges();

    expect(chars()).toEqual(['a', '🚀', 'b']);
  });

  it('advances, reports the new index, and wraps at the end', async () => {
    await rotate(() => instance().next());
    expect(readable()).toBe('two');
    expect(fixture.componentInstance.seen).toEqual([1]);

    await rotate(() => instance().next());
    await rotate(() => instance().next());
    expect(readable()).toBe('one');
    expect(fixture.componentInstance.seen).toEqual([1, 2, 0]);
  });

  it('stops at the ends when it is not looping', async () => {
    fixture.componentInstance.loop.set(false);
    fixture.detectChanges();

    await rotate(() => instance().previous());
    expect(readable()).toBe('one');
    expect(fixture.componentInstance.seen).toEqual([]);

    await rotate(() => instance().next());
    await rotate(() => instance().next());
    await rotate(() => instance().next());
    expect(readable()).toBe('three');
    expect(fixture.componentInstance.seen).toEqual([1, 2]);
  });

  it('goes backwards, wrapping to the last string', async () => {
    await rotate(() => instance().previous());

    expect(readable()).toBe('three');
    expect(fixture.componentInstance.seen).toEqual([2]);
  });

  it('jumps to an index, clamping one that is out of range', async () => {
    await rotate(() => instance().jumpTo(2));
    expect(readable()).toBe('three');

    await rotate(() => instance().jumpTo(99));
    expect(readable()).toBe('three');

    await rotate(() => instance().jumpTo(-5));
    expect(readable()).toBe('one');
  });

  it('resets to the first string', async () => {
    await rotate(() => instance().jumpTo(2));
    await rotate(() => instance().reset());

    expect(readable()).toBe('one');
  });

  it('says nothing when there is nowhere to go', async () => {
    await rotate(() => instance().reset());

    expect(fixture.componentInstance.seen).toEqual([]);
  });

  it('advances on its own when asked, and stops when told', async () => {
    // Only the interval is faked: `whenStable` still needs real microtasks and a
    // real `setTimeout`, and the rotation itself awaits a render.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    fixture.componentInstance.auto.set(true);
    fixture.detectChanges();

    vi.advanceTimersByTime(100);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(readable()).toBe('two');

    fixture.componentInstance.auto.set(false);
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(1000);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(readable()).toBe('two');
    vi.useRealTimers();
  });

  it('renders an empty string list as nothing at all', () => {
    fixture.componentInstance.texts.set([]);
    fixture.detectChanges();

    expect(readable()).toBe('');
    expect(chars()).toEqual([]);
    expect(() => instance().next()).not.toThrow();
  });

  it('shows the last string when the list shrinks under the index', async () => {
    // Kept async: the jump before the shrink awaits a render.
    await rotate(() => instance().jumpTo(2));
    fixture.componentInstance.texts.set(['only']);
    fixture.detectChanges();

    expect(readable()).toBe('only');
  });
});

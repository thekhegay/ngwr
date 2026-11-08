import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrBlurReveal } from './blur-reveal';
import type { WrBlurRevealBy } from './types';

@Component({
  imports: [WrBlurReveal],
  template: `<h2 wrBlurReveal [by]="by()" [delay]="delay()" [stagger]="stagger()">
    Bind to <code>Signal Forms</code> in {{ where() }}.
  </h2>`,
})
class Host {
  readonly by = signal<WrBlurRevealBy>('words');
  readonly delay = signal(0);
  readonly stagger = signal<number | null>(null);
  readonly where = signal('one line');
}

@Component({
  imports: [WrBlurReveal],
  template: `<h2 wrBlurReveal by="letters">Héllo 👋🏽 wörld</h2>`,
})
class LettersHost {}

@Component({
  imports: [WrBlurReveal],
  template: `<p wrBlurReveal>{{ text }}</p>`,
})
class LongHost {
  readonly text = Array.from({ length: 31 }, (_, i) => `w${i}`).join(' ');
}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const platform = (reduced: boolean): unknown => ({
  provide: WrPlatform,
  useValue: { prefersReducedMotion: signal(reduced), pageVisible: signal(true) },
});

const PIECE = '.wr-blur-reveal__piece';
const WORD = '.wr-blur-reveal__word';
const SR = '.wr-blur-reveal__sr';

describe('WrBlurReveal', () => {
  const render = async <T>(
    host: new () => T,
    providers: unknown[] = [platform(false)]
  ): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.wr-blur-reveal')!;

  const pieces = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(PIECE));

  const wrapper = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>('.wr-blur-reveal__pieces')!;

  const enterView = (): void => {
    StubIntersectionObserver.instances[0].fire(true);
  };

  const finish = (el: HTMLElement): void => {
    pieces(el)
      .at(-1)!
      .dispatchEvent(new Event('animationend', { bubbles: true }));
  };

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('waits for most of the host to be in view, then splits into words and runs', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    const text = el.textContent;

    expect(StubIntersectionObserver.instances[0].options?.threshold).toBeGreaterThanOrEqual(0.5);
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
    expect(el.classList.contains('wr-blur-reveal--run')).toBe(false);

    enterView();

    expect(el.classList.contains('wr-blur-reveal--run')).toBe(true);
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(wrapper(el).getAttribute('aria-hidden')).toBe('true');
    expect(wrapper(el).textContent).toBe(text);
    expect(el.querySelectorAll(WORD)).toHaveLength(0);
    expect(pieces(el).map(p => p.textContent)).toEqual(['Bind', 'to', 'Signal Forms', 'in', 'one', 'line.']);
    expect(pieces(el).map(p => p.style.getPropertyValue('--wr-blur-reveal-i'))).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(wrapper(el).style.getPropertyValue('--wr-blur-reveal-stagger')).toBe('70ms');
    expect(wrapper(el).style.getPropertyValue('--wr-blur-reveal-delay')).toBe('0ms');
    // The authored text nodes are out of the document, not destroyed.
    const texts = before.filter(node => node.nodeType === Node.TEXT_NODE);
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every(node => !el.contains(node) && node.textContent !== '')).toBe(true);
  });

  it('keeps spaces as real text between the pieces', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    enterView();

    const kinds = Array.from(wrapper(el).childNodes).map(node => (node.nodeType === Node.TEXT_NODE ? 'text' : 'piece'));
    expect(kinds).toEqual([
      'text',
      'piece',
      'text',
      'piece',
      'text',
      'piece',
      'text',
      'piece',
      'text',
      'piece',
      'text',
      'piece',
      'text',
    ]);
  });

  it('treats an inline element as one piece and moves the same node', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const code = el.querySelector('code')!;
    enterView();

    const piece = pieces(el)[2];
    expect(piece.firstChild).toBe(code);
    expect(piece.childNodes).toHaveLength(1);
  });

  it('splits by grapheme in letter mode, each word in a no-wrap wrapper', async () => {
    const fixture = await render(LettersHost);
    const el = target(fixture);
    enterView();

    expect(el.classList.contains('wr-blur-reveal--letters')).toBe(true);
    const words = Array.from(el.querySelectorAll<HTMLElement>(WORD));
    expect(words.map(w => w.textContent)).toEqual(['Héllo', '👋🏽', 'wörld']);
    expect(words.map(w => w.querySelectorAll(PIECE).length)).toEqual([5, 1, 5]);
    expect(pieces(el).map(p => p.textContent)).toEqual(['H', 'é', 'l', 'l', 'o', '👋🏽', 'w', 'ö', 'r', 'l', 'd']);
    expect(pieces(el)[10].style.getPropertyValue('--wr-blur-reveal-i')).toBe('10');
    expect(wrapper(el).style.getPropertyValue('--wr-blur-reveal-stagger')).toBe('28ms');
    expect(wrapper(el).textContent).toBe('Héllo 👋🏽 wörld');
  });

  it('keeps the screen-reader copy beside the pieces and drops it after', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const text = el.textContent;
    enterView();

    const copy = el.querySelector<HTMLElement>(SR)!;
    expect(copy.textContent).toBe(text);
    expect(copy.getAttribute('aria-hidden')).toBeNull();
    expect(copy.previousElementSibling).toBe(wrapper(el));

    finish(el);

    expect(el.querySelector(SR)).toBeNull();
  });

  it('puts the original nodes back, the same objects, when the last piece ends', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    enterView();

    // An earlier piece ending, or an inline child's own animation, is not the end.
    pieces(el)[0].dispatchEvent(new Event('animationend', { bubbles: true }));
    el.querySelector('code')!.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(el.classList.contains('wr-blur-reveal--run')).toBe(true);

    finish(el);

    const after = Array.from(el.childNodes);
    expect(after).toHaveLength(before.length);
    after.forEach((node, i) => expect(node).toBe(before[i]));
    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(el.classList.contains('wr-blur-reveal--run')).toBe(false);
    expect(el.className).toBe('wr-blur-reveal');
  });

  it('shows a binding that changed during the reveal once restored', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    enterView();

    fixture.componentInstance.where.set('two lines');
    fixture.detectChanges();
    expect(wrapper(el).textContent).toContain('one line');

    finish(el);

    expect(el.textContent).toContain('Bind to Signal Forms in two lines.');
  });

  it('shrinks the gap so a long text still starts its last piece by 1.2 s', async () => {
    const fixture = await render(LongHost);
    const el = target(fixture);
    enterView();

    expect(pieces(el)).toHaveLength(31);
    expect(wrapper(el).style.getPropertyValue('--wr-blur-reveal-stagger')).toBe('40ms');
  });

  it('takes a delay and a stagger of its own', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.delay.set(300);
    fixture.componentInstance.stagger.set(50);
    fixture.detectChanges();
    const el = target(fixture);
    enterView();

    expect(wrapper(el).style.getPropertyValue('--wr-blur-reveal-delay')).toBe('300ms');
    expect(wrapper(el).style.getPropertyValue('--wr-blur-reveal-stagger')).toBe('50ms');
  });

  it('restores when the animation is cancelled', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    enterView();

    pieces(el)[3].dispatchEvent(new Event('animationcancel', { bubbles: true }));

    expect(Array.from(el.childNodes)).toEqual(before);
    expect(el.classList.contains('wr-blur-reveal--run')).toBe(false);
  });

  it('leaves the DOM alone under reduced motion', async () => {
    const fixture = await render(Host, [platform(true)]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('wr-blur-reveal');
    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(el.querySelector(SR)).toBeNull();
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(el.className).toBe('wr-blur-reveal');
    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.className).toBe('wr-blur-reveal');
    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
  });

  it('stops observing on destroy before the reveal', async () => {
    const fixture = await render(Host);
    const observer = StubIntersectionObserver.instances[0];

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('cleans up when destroyed mid-reveal', async () => {
    vi.useFakeTimers();
    const fixture = await render(Host);
    const el = target(fixture);
    const before = Array.from(el.childNodes);
    enterView();
    expect(el.querySelectorAll(PIECE).length).toBeGreaterThan(0);

    expect(() => fixture.destroy()).not.toThrow();

    expect(Array.from(el.childNodes)).toEqual(before);
    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

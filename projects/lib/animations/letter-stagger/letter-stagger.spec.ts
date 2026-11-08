import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrStaggerBy } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrLetterStagger } from './letter-stagger';
import type { WrLetterStaggerTrigger } from './types';

@Component({
  imports: [WrLetterStagger],
  template: `<h1>
    <span class="wr-letter-stagger__item" style="--wr-letter-stagger-i: 0">Angular</span>&ngsp;<wr-letter-stagger
      [text]="text()"
      [by]="by()"
      [start]="start()"
      [stagger]="stagger()"
      [delay]="delay()"
      [masked]="masked()"
      [trigger]="trigger()"
    />
  </h1>`,
})
class Host {
  readonly text = signal('Héllo 👋🏽 wörld');
  readonly by = signal<WrStaggerBy>('letters');
  readonly start = signal(0);
  readonly stagger = signal<number | null>(null);
  readonly delay = signal(0);
  readonly masked = signal(false);
  readonly trigger = signal<WrLetterStaggerTrigger>('load');
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

const PIECE = '.wr-letter-stagger__piece';
const WORD = '.wr-letter-stagger__word';
const GAP = '.wr-letter-stagger__gap';
const SR = '.wr-letter-stagger__sr';
const TEXT = '.wr-letter-stagger__text';

describe('WrLetterStagger', () => {
  const render = async (
    providers: unknown[] = [platform(false)],
    setup?: (host: Host) => void
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('wr-letter-stagger')!;

  const pieces = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>(PIECE));

  const indices = (el: HTMLElement): string[] => pieces(el).map(p => p.style.getPropertyValue('--wr-letter-stagger-i'));

  const end = (piece: HTMLElement): void => {
    piece.dispatchEvent(new Event('animationend', { bubbles: true }));
  };

  beforeEach(() => {
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders the graphemes as indexed pieces, each word in a no-wrap wrapper, playing from the start', async () => {
    const fixture = await render();
    const el = target(fixture);

    expect(el.classList.contains('wr-letter-stagger--play')).toBe(true);
    expect(el.classList.contains('wr-letter-stagger--masked')).toBe(false);
    const words = Array.from(el.querySelectorAll<HTMLElement>(WORD));
    expect(words.map(w => w.textContent)).toEqual(['Héllo', '👋🏽', 'wörld']);
    expect(words.map(w => w.querySelectorAll(PIECE).length)).toEqual([5, 1, 5]);
    expect(pieces(el).map(p => p.textContent)).toEqual(['H', 'é', 'l', 'l', 'o', '👋🏽', 'w', 'ö', 'r', 'l', 'd']);
    expect(indices(el)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(el.style.getPropertyValue('--wr-letter-stagger-gap')).toBe('28ms');
    expect(el.style.getPropertyValue('--wr-letter-stagger-delay')).toBe('0ms');
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('keeps the spaces as real text between the words', async () => {
    const fixture = await render();
    const el = target(fixture);
    const wrapper = el.querySelector<HTMLElement>('.wr-letter-stagger__pieces')!;

    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.textContent).toBe('Héllo 👋🏽 wörld');
    expect(Array.from(wrapper.children).map(child => child.className)).toEqual([
      'wr-letter-stagger__word',
      'wr-letter-stagger__gap',
      'wr-letter-stagger__word',
      'wr-letter-stagger__gap',
      'wr-letter-stagger__word',
    ]);
    expect(Array.from(el.querySelectorAll(GAP)).map(gap => gap.textContent)).toEqual([' ', ' ']);
  });

  it('reads the sentence once for a screen reader, beside the hidden pieces', async () => {
    const fixture = await render();
    const el = target(fixture);
    const copy = el.querySelector<HTMLElement>(SR)!;

    expect(copy.textContent).toBe('Héllo 👋🏽 wörld');
    expect(copy.getAttribute('aria-hidden')).toBeNull();
    expect(copy.previousElementSibling?.className).toBe('wr-letter-stagger__pieces');
    expect(el.querySelector(TEXT)).toBeNull();
    // What is left for a reader once the hidden pieces are out: the chip, the space and the run once.
    const heading = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('h1')!
      .cloneNode(true) as HTMLElement;
    heading.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
    expect(heading.textContent?.replace(/\s+/g, ' ').trim()).toBe('Angular Héllo 👋🏽 wörld');
  });

  it('splits by word on request', async () => {
    const fixture = await render(undefined, host => host.by.set('words'));
    const el = target(fixture);

    expect(pieces(el).map(p => p.textContent)).toEqual(['Héllo', '👋🏽', 'wörld']);
    expect(el.querySelectorAll(WORD)).toHaveLength(3);
    expect(indices(el)).toEqual(['0', '1', '2']);
    expect(el.style.getPropertyValue('--wr-letter-stagger-gap')).toBe('70ms');
  });

  it('continues the count from `start`, as the next run of one sequence', async () => {
    const fixture = await render(undefined, host => {
      host.text.set('ab cd');
      host.start.set(29);
    });
    const el = target(fixture);

    expect(indices(el)).toEqual(['29', '30', '31', '32']);
  });

  it('shrinks the gap so the sequence up to its last piece starts by 1.2 s', async () => {
    const fixture = await render(undefined, host => {
      host.text.set('a'.repeat(41));
      host.start.set(20);
    });
    const el = target(fixture);

    expect(pieces(el)).toHaveLength(41);
    expect(el.style.getPropertyValue('--wr-letter-stagger-gap')).toBe('20ms');
  });

  it('takes a delay, a stagger and the masked mode', async () => {
    const fixture = await render(undefined, host => {
      host.delay.set(300);
      host.stagger.set(50);
      host.masked.set(true);
    });
    const el = target(fixture);

    expect(el.style.getPropertyValue('--wr-letter-stagger-delay')).toBe('300ms');
    expect(el.style.getPropertyValue('--wr-letter-stagger-gap')).toBe('50ms');
    expect(el.classList.contains('wr-letter-stagger--masked')).toBe(true);
  });

  it('renders the pieces on the server, playing, with nothing left to the browser', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(el.classList.contains('wr-letter-stagger--play')).toBe(true);
    expect(pieces(el)).toHaveLength(11);
    expect(el.querySelector(SR)?.textContent).toBe('Héllo 👋🏽 wörld');
    expect(el.querySelector(TEXT)).toBeNull();
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('swaps the pieces for the plain text when the last piece lands, not before', async () => {
    const fixture = await render(undefined, host => host.start.set(5));
    const el = target(fixture);

    end(pieces(el)[0]);
    end(pieces(el)[9]);
    fixture.detectChanges();
    expect(pieces(el)).toHaveLength(11);

    end(pieces(el)[10]);
    fixture.detectChanges();

    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(el.querySelector(SR)).toBeNull();
    expect(el.querySelector(TEXT)?.textContent).toBe('Héllo 👋🏽 wörld');
    expect(el.textContent).toBe('Héllo 👋🏽 wörld');
  });

  it('swaps to the text when the animation is cancelled', async () => {
    const fixture = await render();
    const el = target(fixture);

    pieces(el)[3].dispatchEvent(new Event('animationcancel', { bubbles: true }));
    fixture.detectChanges();

    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(el.textContent).toBe('Héllo 👋🏽 wörld');
  });

  it('swaps to the text at once when hydration comes after the last piece landed', async () => {
    const stubAnimations = (running: number): void => {
      Object.defineProperty(Element.prototype, 'getAnimations', {
        configurable: true,
        value: () => Array.from({ length: running }, () => ({})),
      });
    };
    try {
      stubAnimations(0);
      const fixture = await render();
      expect(target(fixture).querySelectorAll(PIECE)).toHaveLength(0);
      expect(target(fixture).textContent).toBe('Héllo 👋🏽 wörld');
      TestBed.resetTestingModule();

      stubAnimations(3);
      const running = await render();
      expect(target(running).querySelectorAll(PIECE)).toHaveLength(11);
    } finally {
      delete (Element.prototype as { getAnimations?: unknown }).getAnimations;
    }
  });

  it('is the plain text under reduced motion', async () => {
    const fixture = await render([platform(true)]);
    const el = target(fixture);

    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(el.querySelector(SR)).toBeNull();
    expect(el.textContent).toBe('Héllo 👋🏽 wörld');
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('is the plain text when the run is empty', async () => {
    const fixture = await render(undefined, host => host.text.set(''));
    const el = target(fixture);

    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    expect(el.textContent).toBe('');
  });

  it('shows a new text once settled', async () => {
    const fixture = await render();
    const el = target(fixture);
    end(pieces(el)[10]);
    fixture.detectChanges();

    fixture.componentInstance.text.set('Later');
    fixture.detectChanges();

    expect(el.textContent).toBe('Later');
    expect(el.querySelectorAll(PIECE)).toHaveLength(0);
  });

  describe('trigger "view"', () => {
    it('keeps the pieces visible until most of the host is in view, then plays', async () => {
      const fixture = await render(undefined, host => host.trigger.set('view'));
      const el = target(fixture);

      expect(el.classList.contains('wr-letter-stagger--play')).toBe(false);
      expect(pieces(el)).toHaveLength(11);
      const observer = StubIntersectionObserver.instances[0];
      expect(observer.options?.threshold).toBeGreaterThanOrEqual(0.5);
      expect(observer.observe).toHaveBeenCalledWith(el);

      observer.fire(false);
      fixture.detectChanges();
      expect(el.classList.contains('wr-letter-stagger--play')).toBe(false);

      observer.fire(true);
      fixture.detectChanges();

      expect(el.classList.contains('wr-letter-stagger--play')).toBe(true);
      expect(observer.disconnect).toHaveBeenCalled();
      expect(pieces(el)).toHaveLength(11);

      end(pieces(el)[10]);
      fixture.detectChanges();
      expect(el.textContent).toBe('Héllo 👋🏽 wörld');
      expect(el.querySelectorAll(PIECE)).toHaveLength(0);
    });

    it('is the plain text under reduced motion and without IntersectionObserver', async () => {
      const reduced = await render([platform(true)], host => host.trigger.set('view'));
      expect(StubIntersectionObserver.instances).toHaveLength(0);
      expect(target(reduced).querySelectorAll(PIECE)).toHaveLength(0);
      expect(target(reduced).textContent).toBe('Héllo 👋🏽 wörld');
      TestBed.resetTestingModule();

      vi.stubGlobal('IntersectionObserver', undefined);
      const bare = await render(undefined, host => host.trigger.set('view'));
      expect(target(bare).querySelectorAll(PIECE)).toHaveLength(0);
      expect(target(bare).textContent).toBe('Héllo 👋🏽 wörld');
    });

    it('does nothing on the server', async () => {
      const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }], host => host.trigger.set('view'));
      const el = target(fixture);

      expect(StubIntersectionObserver.instances).toHaveLength(0);
      expect(el.classList.contains('wr-letter-stagger--play')).toBe(false);
      expect(pieces(el)).toHaveLength(11);
    });

    it('stops observing on destroy', async () => {
      const fixture = await render(undefined, host => host.trigger.set('view'));
      const observer = StubIntersectionObserver.instances[0];

      fixture.destroy();

      expect(observer.disconnect).toHaveBeenCalled();
    });
  });
});

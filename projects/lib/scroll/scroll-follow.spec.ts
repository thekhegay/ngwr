import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrScrollFollow } from './scroll-follow';

/**
 * jsdom lays nothing out and scrolls nothing, so the box is modelled: every
 * element is `data-h` pixels tall, or the sum of its children, or `ROW`; the
 * container shows `view` pixels of them from `top`, and `scrollTo` clamps the
 * way a browser does. Every position asserted is the directive's arithmetic on
 * that model.
 *
 * `ResizeObserver` is stubbed so a resize happens when the spec says.
 * `MutationObserver` is jsdom's own, delivered in a microtask.
 */
@Component({
  imports: [WrScrollFollow],
  template: `
    <div class="box" #follow="wrScrollFollow" [wrScrollFollow]="on()" [wrScrollFollowThreshold]="threshold()">
      @if (older()) {
        <button class="older" type="button">Load older</button>
      }
      @for (row of rows(); track row) {
        <p class="row" [attr.data-h]="heights()[row] ?? null">{{ row }}</p>
      }
    </div>
  `,
})
class Host {
  readonly on = signal(true);
  readonly threshold = signal(80);
  readonly older = signal(false);
  readonly rows = signal([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  readonly heights = signal<Record<number, number>>({});
  readonly follow = viewChild.required<WrScrollFollow>('follow');
}

@Component({
  imports: [WrScrollFollow],
  template: `
    <div class="box" wrScrollFollow #follow="wrScrollFollow">
      <div class="list">
        @for (row of rows(); track row) {
          <p class="row">{{ row }}</p>
        }
      </div>
    </div>
  `,
})
class WrappedHost {
  readonly rows = signal([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  readonly follow = viewChild.required<WrScrollFollow>('follow');
}

const ROW = 40;
const BOX_TOP = 100;

describe('WrScrollFollow', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host | WrappedHost>>;
  let top: number;
  let view: number;
  let moves: ScrollToOptions[];
  let resizeObservers: StubResizeObserver[];

  const pristineRect = Object.getOwnPropertyDescriptor(Element.prototype, 'getBoundingClientRect')!;

  class StubResizeObserver {
    readonly targets = new Set<Element>();
    connected = true;

    constructor(private readonly callback: ResizeObserverCallback) {
      resizeObservers.push(this);
    }

    observe(target: Element): void {
      this.targets.add(target);
    }

    unobserve(target: Element): void {
      this.targets.delete(target);
    }

    disconnect(): void {
      this.connected = false;
      this.targets.clear();
    }

    resize(): void {
      this.callback([], this);
    }
  }

  const box = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.box')!;
  const follow = (): WrScrollFollow => fixture.componentInstance.follow();
  const host = (): Host => fixture.componentInstance as Host;

  const heightOf = (el: Element): number => {
    const own = el.getAttribute('data-h');
    if (own !== null) return Number(own);
    return el.children.length ? Array.from(el.children).reduce((sum, child) => sum + heightOf(child), 0) : ROW;
  };

  /** Where `el` starts inside the scrolled content. */
  const offsetOf = (el: Element): number => {
    let offset = 0;
    for (let prev = el.previousElementSibling; prev; prev = prev.previousElementSibling) offset += heightOf(prev);
    const parent = el.parentElement!;
    return parent.classList.contains('box') ? offset : offset + offsetOf(parent);
  };

  const contentHeight = (): number => Array.from(box().children).reduce((sum, child) => sum + heightOf(child), 0);
  const clamp = (value: number): number => Math.max(0, Math.min(value, contentHeight() - view));

  /** What a mutation takes to arrive, and the render before it. */
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    await Promise.resolve();
  };

  /** The reader scrolls: the position moves and the event follows. */
  const scrollTo = (value: number): void => {
    top = clamp(value);
    box().dispatchEvent(new Event('scroll'));
  };

  const mount = async <T extends Host | WrappedHost>(type: new () => T, setup?: (host: T) => void): Promise<void> => {
    const created = TestBed.createComponent(type);
    fixture = created;
    setup?.(created.componentInstance);
    await settle();
  };

  beforeEach(() => {
    top = 0;
    view = 200;
    moves = [];
    resizeObservers = [];

    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
      const container = this.closest('.box');
      if (!container) return new DOMRect(0, 0, 0, 0);
      if (this === container) return new DOMRect(0, BOX_TOP, 300, view);
      const height = heightOf(this);
      return new DOMRect(0, BOX_TOP - top + offsetOf(this), height ? 300 : 0, height);
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', pristineRect);
  });

  // The model sits on the prototype: the box does not exist before the first render reads it.
  const pristine = {
    scrollTop: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop'),
    scrollHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
    scrollTo: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo'),
  };

  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollTop', { configurable: true, get: () => top });
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      configurable: true,
      get(this: Element): number {
        return this.classList.contains('box') ? contentHeight() : 0;
      },
    });
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => view });
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value(options: ScrollToOptions): void {
        moves.push(options);
        top = clamp(options.top ?? top);
      },
    });
  });

  afterEach(() => {
    for (const [name, descriptor] of Object.entries(pristine)) {
      if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
      else delete (Element.prototype as unknown as Record<string, unknown>)[name];
    }
  });

  it('starts at the end and says it is following', async () => {
    await mount(Host);

    // Ten rows of 40 in a box of 200.
    expect(top).toBe(200);
    expect(follow().following()).toBe(true);
    expect(moves.at(-1)?.behavior).toBe('instant');
  });

  it('stays at the end when a row is added', async () => {
    await mount(Host);

    host().rows.update(rows => [...rows, 20]);
    await settle();

    expect(top).toBe(240);
    expect(follow().following()).toBe(true);
  });

  it('stays at the end when a row grows with no mutation to report it', async () => {
    await mount(Host);
    const rows = Array.from(box().querySelectorAll('.row'));

    // Every row is watched, and so is the box.
    expect(rows.every(row => resizeObservers[0].targets.has(row))).toBe(true);
    expect(resizeObservers[0].targets.has(box())).toBe(true);

    // An image loads: the attribute is written past Angular, as a decode would be.
    rows[3].setAttribute('data-h', '140');
    resizeObservers[0].resize();

    expect(top).toBe(300);
  });

  it('watches a row added later and lets go of a removed one', async () => {
    await mount(Host);
    const first = box().querySelector('.row')!;

    host().rows.update(rows => [...rows.slice(1), 20]);
    await settle();

    const last = Array.from(box().querySelectorAll('.row')).at(-1)!;
    expect(resizeObservers[0].targets.has(last)).toBe(true);
    expect(resizeObservers[0].targets.has(first)).toBe(false);
  });

  it('stays at the end when the box gets shorter', async () => {
    await mount(Host);

    view = 120;
    resizeObservers[0].resize();

    expect(top).toBe(280);
    expect(follow().following()).toBe(true);
  });

  it('stops following once the reader scrolls up, and leaves new rows below', async () => {
    await mount(Host);

    scrollTo(60);
    expect(follow().following()).toBe(false);

    host().rows.update(rows => [...rows, 20, 21]);
    await settle();

    expect(top).toBe(60);
    expect(follow().following()).toBe(false);
  });

  it('stops on a small move up too, so a reader can leave while text streams in', async () => {
    await mount(Host);

    scrollTo(190);
    expect(follow().following()).toBe(false);

    host().rows.update(rows => [...rows, 20]);
    await settle();
    expect(top).toBe(190);
  });

  it('does not pin over a scroll whose event has not arrived yet', async () => {
    await mount(Host);

    top = 150;
    host().rows.update(rows => [...rows, 20]);
    await settle();

    expect(top).toBe(150);
    expect(follow().following()).toBe(false);
  });

  it('keeps following when the browser clamps the position to shorter content', async () => {
    await mount(Host);

    host().rows.update(rows => rows.slice(0, 8));
    fixture.detectChanges();
    // The clamp and its scroll event come before the mutation is delivered.
    scrollTo(top);
    await settle();

    expect(top).toBe(120);
    expect(follow().following()).toBe(true);
  });

  it('resumes when the reader scrolls back to within the threshold of the end', async () => {
    await mount(Host);
    scrollTo(0);

    scrollTo(100);
    expect(follow().following()).toBe(false);

    scrollTo(130);
    expect(follow().following()).toBe(true);

    host().rows.update(rows => [...rows, 20]);
    await settle();
    expect(top).toBe(240);
  });

  it('takes the threshold from its input', async () => {
    await mount(Host, h => h.threshold.set(10));
    scrollTo(0);

    scrollTo(180);
    expect(follow().following()).toBe(false);

    scrollTo(195);
    expect(follow().following()).toBe(true);
  });

  it('keeps the rows in view where they are when older rows load above', async () => {
    await mount(Host);
    scrollTo(0);

    host().rows.update(rows => [5, 6, 7, 8, 9, ...rows]);
    await settle();

    // Five rows of 40 went in above: the row that was at the top still is.
    expect(top).toBe(200);
    expect(follow().following()).toBe(false);
    expect(moves.at(-1)?.behavior).toBe('instant');
  });

  it('keeps them there with a "load older" button above the rows', async () => {
    await mount(Host, h => h.older.set(true));
    scrollTo(0);

    host().rows.update(rows => [7, 8, 9, ...rows]);
    await settle();

    expect(top).toBe(120);
  });

  it('holds the place again on the next load', async () => {
    await mount(Host);
    scrollTo(0);
    host().rows.update(rows => [8, 9, ...rows]);
    await settle();
    expect(top).toBe(80);

    scrollTo(0);
    host().rows.update(rows => [5, 6, 7, ...rows]);
    await settle();

    expect(top).toBe(120);
  });

  it('keeps the place when a row above the view grows or goes away', async () => {
    await mount(Host);
    scrollTo(100);

    host().heights.set({ 10: 100 });
    await settle();
    resizeObservers[0].resize();
    expect(top).toBe(160);

    host().rows.update(rows => rows.slice(1));
    await settle();
    expect(top).toBe(60);
  });

  it('does not undo a scroll made since the place was remembered', async () => {
    await mount(Host);
    scrollTo(100);

    // Scrolled on by 40 with the event still on its way, then older rows load.
    top = 60;
    host().rows.update(rows => [8, 9, ...rows]);
    await settle();

    expect(top).toBe(140);
  });

  it('looks through a wrapper that is the only child', async () => {
    await mount(WrappedHost);
    expect(top).toBe(200);
    scrollTo(0);

    fixture.componentInstance.rows.update(rows => [7, 8, 9, ...rows]);
    await settle();

    expect(top).toBe(120);
  });

  it('jumps to the end and follows again', async () => {
    await mount(Host);
    scrollTo(0);
    moves = [];

    follow().toEnd();

    expect(moves).toEqual([{ top: 400, behavior: 'smooth' }]);
    expect(follow().following()).toBe(true);

    follow().toEnd({ smooth: false });
    expect(moves.at(-1)?.behavior).toBe('auto');
  });

  it('jumps instantly for someone who asked for less motion', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WrPlatform,
          useValue: { isBrowser: true, isServer: false, userAgent: null, prefersReducedMotion: () => true },
        },
      ],
    });
    await mount(Host);
    scrollTo(0);

    follow().toEnd();

    expect(moves.at(-1)).toEqual({ top: 400, behavior: 'auto' });
  });

  it('does nothing while switched off, and picks up where the reader is when switched on', async () => {
    await mount(Host, h => h.on.set(false));

    expect(top).toBe(0);
    expect(follow().following()).toBe(false);

    host().rows.update(rows => [...rows, 20]);
    await settle();
    expect(moves).toEqual([]);

    // Far from the end: on, and not following.
    host().on.set(true);
    await settle();
    expect(follow().following()).toBe(false);
    expect(top).toBe(0);

    host().on.set(false);
    await settle();
    scrollTo(240);
    host().on.set(true);
    await settle();
    expect(follow().following()).toBe(true);
  });

  it('takes scroll anchoring from the browser only while it is on', async () => {
    await mount(Host);
    const write = vi.spyOn(box().style, 'setProperty');
    const remove = vi.spyOn(box().style, 'removeProperty');

    host().on.set(false);
    await settle();
    expect(remove).toHaveBeenCalledWith('overflow-anchor');

    host().on.set(true);
    await settle();
    expect(write.mock.calls.some(([name, value]) => name === 'overflow-anchor' && value === 'none')).toBe(true);
  });

  it('stops watching when it is destroyed', async () => {
    await mount(Host);
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const element = box();

    fixture.destroy();

    expect(resizeObservers[0].connected).toBe(false);
    expect(disconnect).toHaveBeenCalled();

    moves = [];
    top = 0;
    element.dispatchEvent(new Event('scroll'));
    expect(moves).toEqual([]);
  });
});

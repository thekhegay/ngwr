import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TICKER_SPEED, WrTicker } from './ticker';
import type { WrTickerItem } from './types';

const ITEMS: readonly WrTickerItem[] = [
  { title: 'Button', url: '/reference/components/button' },
  { title: 'Select', url: '/reference/components/select' },
  { title: 'Table', url: '/reference/components/table' },
];

@Component({
  imports: [WrTicker],
  template: `<wr-ticker [items]="items()" [speed]="speed()" label="Components" [pauseLabel]="pauseLabel()" />`,
})
class Host {
  readonly items = signal(ITEMS);
  readonly speed = signal(TICKER_SPEED);
  readonly pauseLabel = signal<string | null>(null);
}

/** The item template a routed app projects: its own anchor, a `routerLink` on it. */
@Component({
  imports: [WrTicker, RouterLink],
  template: `<wr-ticker [items]="items" label="Components">
    <ng-template let-item>
      <a class="wr-ticker__link" [routerLink]="item.url">{{ item.title }}</a>
    </ng-template>
  </wr-ticker>`,
})
class RoutedHost {
  readonly items = ITEMS;
}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.instances.push(this);
  }
  fire(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const TRACK = '.wr-ticker__track';
const COPY = '.wr-ticker__track--copy';
const LINK = '.wr-ticker__link';
const VIEWPORT = '.wr-ticker__viewport';
const BELT = '.wr-ticker__belt';
const TOGGLE = '.wr-ticker__toggle';

/** What one copy of the list measures, in px, as the stubbed layout reports it. */
const WIDTH = 1200;

describe('WrTicker', () => {
  let width: number;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  const render = async (
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('wr-ticker')!;

  const query = <T extends HTMLElement>(el: HTMLElement, selector: string): T => el.querySelector<T>(selector)!;

  const all = (el: HTMLElement, selector: string): HTMLElement[] => Array.from(el.querySelectorAll(selector));

  const view = (fixture: { detectChanges(): void }, intersecting: boolean): void => {
    StubIntersectionObserver.instances[0].fire(intersecting);
    fixture.detectChanges();
  };

  /** The layout reports a size: the first measurement, or a font that finished loading. */
  const layout = (fixture: { detectChanges(): void }, px = WIDTH): void => {
    width = px;
    StubResizeObserver.instances[0].fire();
    fixture.detectChanges();
  };

  const looping = (el: HTMLElement): boolean => el.classList.contains('wr-ticker--loop');
  const running = (el: HTMLElement): boolean => el.classList.contains('wr-ticker--run');
  const still = (el: HTMLElement): boolean => el.classList.contains('wr-ticker--static');

  const focus = (el: HTMLElement, relatedTarget: EventTarget | null = null): void => {
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget }));
  };

  const blur = (el: HTMLElement, relatedTarget: EventTarget | null = null): void => {
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
  };

  beforeEach(() => {
    width = WIDTH;
    StubIntersectionObserver.instances = [];
    StubResizeObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width,
      height: 24,
      top: 0,
      left: 0,
      right: width,
      bottom: 24,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    // jsdom has no `scrollIntoView`.
    scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('holds the list twice, the second copy presentational, and reads it once as a list of links', async () => {
    const fixture = await render();
    const el = target(fixture);

    expect(looping(el)).toBe(true);
    const tracks = all(el, TRACK);
    expect(tracks).toHaveLength(2);

    const [list, copy] = tracks;
    expect(list.tagName).toBe('UL');
    expect(list.getAttribute('aria-label')).toBe('Components');
    expect(list.getAttribute('aria-hidden')).toBeNull();
    expect(list.hasAttribute('inert')).toBe(false);
    const links = all(list, LINK) as HTMLAnchorElement[];
    expect(links.map(link => link.textContent)).toEqual(['Button', 'Select', 'Table']);
    expect(links.map(link => link.getAttribute('href'))).toEqual(ITEMS.map(item => item.url));
    expect(links.every(link => link.closest('li') !== null)).toBe(true);
    expect(links.every(link => !link.hasAttribute('tabindex'))).toBe(true);

    expect(copy.classList.contains('wr-ticker__track--copy')).toBe(true);
    expect(copy.getAttribute('aria-hidden')).toBe('true');
    expect(copy.hasAttribute('inert')).toBe(true);
    expect(copy.getAttribute('aria-label')).toBeNull();
    const copies = all(copy, LINK);
    expect(copies.map(link => link.textContent)).toEqual(['Button', 'Select', 'Table']);
    expect(copies.every(link => link.closest('[inert]') === copy)).toBe(true);

    // What a reader is left with once the hidden copy is out: the list, once.
    expect(all(el, `${TRACK}:not([aria-hidden])`)).toHaveLength(1);
  });

  it('measures one copy, moves by exactly that, and takes as long as the width over the speed', async () => {
    const fixture = await render();
    const el = target(fixture);
    const belt = query(el, BELT);

    expect(StubResizeObserver.instances).toHaveLength(1);
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(all(el, TRACK)[0]);
    expect(belt.style.getPropertyValue('--wr-ticker-shift')).toBe('');

    layout(fixture);
    expect(belt.style.getPropertyValue('--wr-ticker-shift')).toBe(`${WIDTH}px`);
    expect(belt.style.getPropertyValue('--wr-ticker-duration')).toBe(`${WIDTH / TICKER_SPEED}s`);

    // Twice the speed, half the time: the same px per second whatever is in the row.
    fixture.componentInstance.speed.set(TICKER_SPEED * 2);
    fixture.detectChanges();
    expect(belt.style.getPropertyValue('--wr-ticker-duration')).toBe(`${WIDTH / (TICKER_SPEED * 2)}s`);

    // A font that finished loading made the copy wider: measured again, same speed.
    layout(fixture, WIDTH * 2);
    expect(belt.style.getPropertyValue('--wr-ticker-shift')).toBe(`${WIDTH * 2}px`);
    expect(belt.style.getPropertyValue('--wr-ticker-duration')).toBe(`${(WIDTH * 2) / (TICKER_SPEED * 2)}s`);
  });

  it('measures at once and again on resize when there is no ResizeObserver', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const fixture = await render();
    const belt = query(target(fixture), BELT);

    expect(belt.style.getPropertyValue('--wr-ticker-shift')).toBe(`${WIDTH}px`);

    width = WIDTH / 2;
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(belt.style.getPropertyValue('--wr-ticker-shift')).toBe(`${WIDTH / 2}px`);
  });

  it('runs while in view and pauses off screen and while the document is hidden, keeping both copies', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);

    expect(running(el)).toBe(false);
    view(fixture, true);
    expect(running(el)).toBe(true);

    view(fixture, false);
    expect(running(el)).toBe(false);
    expect(looping(el)).toBe(true);
    expect(all(el, COPY)).toHaveLength(1);

    view(fixture, true);
    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(running(el)).toBe(false);
    expect(all(el, COPY)).toHaveLength(1);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(running(el)).toBe(true);
  });

  it('has a labelled pause button at the end that stops and starts the row', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    const toggle = query<HTMLButtonElement>(el, TOGGLE);
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.type).toBe('button');
    expect(toggle.classList.contains('wr-btn')).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('Pause');
    expect(toggle.querySelector('.wr-icon__svg rect')).not.toBeNull();
    expect(toggle.previousElementSibling).toBe(query(el, VIEWPORT));

    toggle.click();
    fixture.detectChanges();
    expect(running(el)).toBe(false);
    expect(looping(el)).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('Play');
    expect(toggle.querySelector('.wr-icon__svg rect')).toBeNull();
    expect(toggle.querySelector('.wr-icon__svg path')).not.toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(running(el)).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('Pause');
  });

  it('names the pause button from the i18n catalog, and from the label inputs over it', async () => {
    const fixture = await render([
      platform(stub()),
      provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
      provideWrI18nStaticLoader({ xx: { ticker: { pause: 'Anhalten', play: 'Abspielen' } } }),
    ]);
    const el = target(fixture);
    view(fixture, true);
    const toggle = query<HTMLButtonElement>(el, TOGGLE);

    expect(toggle.getAttribute('aria-label')).toBe('Anhalten');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe('Abspielen');

    toggle.click();
    fixture.componentInstance.pauseLabel.set('Hold');
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe('Hold');
  });

  it('renders a projected item template in both copies, so a routed app brings its own links', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), platform(stub()) as never] });
    const fixture = TestBed.createComponent(RoutedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-ticker')!;

    const links = all(el, LINK) as HTMLAnchorElement[];
    expect(links.map(link => link.getAttribute('href'))).toEqual([...ITEMS, ...ITEMS].map(item => item.url));
    expect(all(el, TRACK)).toHaveLength(2);
    expect(all(el, COPY)[0].querySelectorAll(LINK)).toHaveLength(ITEMS.length);
  });

  it('pauses under the pointer and while focus is in it, and resumes after', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    el.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(running(el)).toBe(false);

    el.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(running(el)).toBe(true);

    const toggle = query(el, TOGGLE);
    focus(toggle);
    fixture.detectChanges();
    expect(running(el)).toBe(false);
    expect(still(el)).toBe(false);

    // Focus moving within the row keeps the pause; leaving it lifts it.
    blur(toggle, query(el, LINK));
    fixture.detectChanges();
    expect(running(el)).toBe(false);

    blur(toggle, document.body);
    fixture.detectChanges();
    expect(running(el)).toBe(true);
  });

  it('stands still and scrolls natively while a link has focus, brings the link into view, and loops again from the start when focus leaves', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);
    const viewport = query(el, VIEWPORT);
    const [first, second] = all(el, LINK);
    const scrollLeft = vi.fn();
    Object.defineProperty(viewport, 'scrollLeft', { get: () => 300, set: scrollLeft, configurable: true });

    focus(first);
    // After the still state is rendered, not before: the viewport only scrolls once it may.
    expect(scrollIntoView).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(still(el)).toBe(true);
    expect(running(el)).toBe(false);
    expect(looping(el)).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(first);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });

    // From one link to the next: still, and the next one is brought in.
    blur(first, second);
    focus(second, first);
    fixture.detectChanges();
    expect(still(el)).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView.mock.instances[1]).toBe(second);
    expect(scrollLeft).not.toHaveBeenCalled();

    // Out of the belt: the viewport is put back to its start, and the loop runs.
    blur(second, query(el, TOGGLE));
    fixture.detectChanges();
    expect(still(el)).toBe(false);
    expect(scrollLeft).toHaveBeenCalledWith(0);
    expect(running(el)).toBe(false);

    blur(query(el, TOGGLE), document.body);
    fixture.detectChanges();
    expect(running(el)).toBe(true);
  });

  it('keeps the pause button pause over focus: a paused row stays paused when focus leaves', async () => {
    const fixture = await render();
    const el = target(fixture);
    view(fixture, true);

    query(el, TOGGLE).click();
    const link = query(el, LINK);
    focus(link);
    fixture.detectChanges();
    blur(link, document.body);
    fixture.detectChanges();

    expect(still(el)).toBe(false);
    expect(running(el)).toBe(false);
  });

  it('never moves under reduced motion: one copy, no observers, no pause button', async () => {
    const fixture = await render([platform(stub(true))]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(looping(el)).toBe(false);
    expect(running(el)).toBe(false);
    expect(all(el, TRACK)).toHaveLength(1);
    expect(all(el, COPY)).toHaveLength(0);
    expect(el.querySelector(TOGGLE)).toBeNull();
    expect(all(el, LINK).map(link => link.textContent)).toEqual(['Button', 'Select', 'Table']);
    expect(query(el, BELT).getAttribute('style')).toBeNull();
  });

  it('drops the copy and stops when motion is reduced while it runs', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    const el = target(fixture);
    view(fixture, true);
    expect(running(el)).toBe(true);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(looping(el)).toBe(false);
    expect(running(el)).toBe(false);
    expect(all(el, COPY)).toHaveLength(0);
    expect(el.querySelector(TOGGLE)).toBeNull();
  });

  it('renders one still copy on the server and watches nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(el.className).toBe('wr-ticker');
    expect(all(el, TRACK)).toHaveLength(1);
    expect(all(el, LINK).map(link => link.textContent)).toEqual(['Button', 'Select', 'Table']);
    expect(el.querySelector(TOGGLE)).toBeNull();
    expect(query(el, BELT).getAttribute('style')).toBeNull();
  });

  it('stays still without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = await render();
    const el = target(fixture);

    expect(looping(el)).toBe(false);
    expect(all(el, TRACK)).toHaveLength(1);
    expect(StubResizeObserver.instances).toHaveLength(0);
  });

  it('runs toward the inline start, so the row runs the other way under RTL', () => {
    const sheet = readFileSync(join(process.cwd(), 'projects/lib/animations/ticker/styles/_index.scss'), 'utf8');

    expect(sheet).toMatch(/--wr-ticker-dir:\s*-1;/);
    expect(sheet).toMatch(/&:dir\(rtl\)\s*\{\s*--wr-ticker-dir:\s*1;\s*\}/);
    expect(sheet).toMatch(/translate:\s*calc\(var\(--wr-ticker-dir\)\s*\*\s*var\(--wr-ticker-shift[^)]*\)\)/);
    // The fade is symmetric, so one mask serves both directions.
    expect(sheet).toMatch(/mask-image:\s*linear-gradient\(\s*to right,\s*transparent,/);
  });

  it('disconnects both observers and drops its listeners on destroy', async () => {
    const fixture = await render();
    const el = target(fixture);
    const viewObserver = StubIntersectionObserver.instances[0];
    const sizeObserver = StubResizeObserver.instances[0];
    view(fixture, true);
    expect(running(el)).toBe(true);

    fixture.destroy();

    expect(viewObserver.disconnect).toHaveBeenCalled();
    expect(sizeObserver.disconnect).toHaveBeenCalled();
    expect(() => {
      el.dispatchEvent(new Event('pointerenter'));
      el.dispatchEvent(new Event('pointerleave'));
      window.dispatchEvent(new Event('resize'));
      sizeObserver.fire();
      viewObserver.fire(false);
    }).not.toThrow();
  });
});

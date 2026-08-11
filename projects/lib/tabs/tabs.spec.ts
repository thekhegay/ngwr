import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrTab } from './tab';
import { WrTabs } from './tabs';

/**
 * The pattern for a component spec here: a tiny host that uses the component
 * the way a consumer would, and assertions against the RENDERED DOM — roles,
 * ARIA state and the `.wr-*` classes. Those classes are public API, so a test
 * that pokes at component internals instead would pass straight through the
 * kind of change that actually breaks people.
 */
@Component({
  imports: [WrTabs, WrTab],
  template: `
    <wr-tabs [(active)]="active">
      <wr-tab title="One" key="one">Panel one</wr-tab>
      <wr-tab title="Two" key="two">Panel two</wr-tab>
      <wr-tab title="Three" key="three" [disabled]="true">Panel three</wr-tab>
      <wr-tab title="Four" key="four">Panel four</wr-tab>
    </wr-tabs>
  `,
})
class Host {
  readonly active = signal<string | null>(null);
}

describe('WrTabs', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('[role="tablist"]')!;
  const tabs = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="tab"]')];
  const panel = (): HTMLElement | null => root().querySelector<HTMLElement>('[role="tabpanel"]');
  const selected = (): string | undefined =>
    tabs()
      .find(t => t.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim();
  const key = (name: string): void => {
    strip().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders one tab per <wr-tab>, in order', () => {
    expect(tabs().map(t => t.textContent?.trim())).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('selects the first tab when nothing was bound', () => {
    expect(selected()).toBe('One');
    expect(fixture.componentInstance.active()).toBe('one');
  });

  it('keeps exactly one tab in the tab order — the roving tabindex', () => {
    // A tablist is one tab stop. Four reachable tabs would mean four.
    expect(tabs().filter(t => t.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('links each tab to its panel both ways', () => {
    const tab = tabs()[0];
    expect(tab.getAttribute('aria-controls')).toBe(panel()?.getAttribute('id'));
    expect(panel()?.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'));
  });

  it('renders only the active panel', () => {
    expect(root().querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(panel()?.textContent).toContain('Panel one');
  });

  it('activates on click and writes back through the two-way binding', () => {
    tabs()[1].click();
    fixture.detectChanges();

    expect(selected()).toBe('Two');
    expect(fixture.componentInstance.active()).toBe('two');
    expect(panel()?.textContent).toContain('Panel two');
  });

  it('follows a change written from outside', () => {
    fixture.componentInstance.active.set('four');
    fixture.detectChanges();
    expect(selected()).toBe('Four');
  });

  it('moves with the arrow keys and wraps at both ends', () => {
    key('ArrowRight');
    expect(selected()).toBe('Two');

    key('ArrowLeft');
    expect(selected()).toBe('One');

    key('ArrowLeft');
    expect(selected()).toBe('Four');

    key('ArrowRight');
    expect(selected()).toBe('One');
  });

  it('skips a disabled tab rather than landing on it', () => {
    fixture.componentInstance.active.set('two');
    fixture.detectChanges();

    key('ArrowRight');
    expect(selected()).toBe('Four');
  });

  it('jumps to the ends with Home and End', () => {
    key('End');
    expect(selected()).toBe('Four');

    key('Home');
    expect(selected()).toBe('One');
  });

  it('leaves other keys to the page', () => {
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    strip().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(selected()).toBe('One');
  });

  it('marks a disabled tab both natively and for assistive tech', () => {
    const disabled = tabs()[2];
    expect(disabled.classList.contains('wr-tabs__tab--disabled')).toBe(true);
    expect((disabled as HTMLButtonElement).disabled).toBe(true);
  });

  it('carries the public BEM classes', () => {
    // These are public API — consumers style against them.
    expect(root().querySelector('.wr-tabs')).toBeTruthy();
    expect(strip().classList.contains('wr-tabs__strip')).toBe(true);
    expect(tabs()[0].classList.contains('wr-tabs__tab')).toBe(true);
    expect(tabs()[0].classList.contains('wr-tabs__tab--active')).toBe(true);
  });
});

/**
 * Reading direction. `Directionality` resolves the document's direction when it is
 * constructed, so the honest way to test the other one is to provide a fake —
 * writing `document.dir` mid-file would leak into whatever runs after it.
 *
 * Every case here is a PAIR. On its own, an RTL assertion cannot tell "mirrors
 * correctly" from "always goes left", so each direction states the outcome the
 * other one contradicts — except Home / End, which name a position in the list
 * rather than an edge of it and so must agree.
 */
describe('WrTabs under a reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-tabs')!;
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('[role="tablist"]')!;
  const selected = (): string | undefined =>
    [...root().querySelectorAll<HTMLElement>('[role="tab"]')]
      .find(t => t.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim();

  const mount = (dir: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  const key = (name: string): void => {
    strip().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  /** The strip's scroll metrics — jsdom lays nothing out, so they are declared. */
  const scrolledBy = (scrollLeft: number): void => {
    const el = strip();
    Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, configurable: true });
    el.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  const fades = (): { start: boolean; end: boolean } => ({
    start: host().classList.contains('wr-tabs--fade-start'),
    end: host().classList.contains('wr-tabs--fade-end'),
  });

  it('walks the arrows in visual order — ltr', () => {
    mount('ltr');

    // The enabled tabs are One, Two, Four; Three is disabled and skipped.
    key('ArrowRight');
    expect(selected()).toBe('Two');

    key('ArrowLeft');
    expect(selected()).toBe('One');
  });

  it('walks the arrows in visual order — rtl', () => {
    // The APG puts arrow keys on the VISUAL axis, and the strip is mirrored here:
    // ArrowRight moves toward the visual right, which is the PREVIOUS tab — so
    // from the first tab it wraps to the last rather than landing on 'Two'.
    mount('rtl');

    key('ArrowRight');
    expect(selected()).toBe('Four');

    key('ArrowLeft');
    expect(selected()).toBe('One');
  });

  it('leaves Home and End alone — they name a position, not an edge', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      mount(dir);

      key('End');
      expect(selected(), dir).toBe('Four');

      key('Home');
      expect(selected(), dir).toBe('One');
    }
  });

  it('fades the edge it has scrolled away from — ltr', () => {
    mount('ltr');

    scrolledBy(0);
    expect(fades()).toEqual({ start: false, end: true });

    // Scrolled to the far end: 400 of content in a 200 viewport.
    scrolledBy(200);
    expect(fades()).toEqual({ start: true, end: false });
  });

  it('fades the edge it has scrolled away from — rtl', () => {
    // Same two positions, opposite raw values: an RTL strip starts at its physical
    // right and `scrollLeft` counts DOWN from 0. Read literally that said "still at
    // the start, more to come" everywhere, so the end fade was pinned on and the
    // start fade never appeared.
    mount('rtl');

    scrolledBy(0);
    expect(fades()).toEqual({ start: false, end: true });

    scrolledBy(-200);
    expect(fades()).toEqual({ start: true, end: false });
  });

  it('treats an elastic overscroll past the start as the start, in both directions', () => {
    // A rubber-band past the inline start reports a `scrollLeft` of the sign the
    // OTHER direction uses, so reading the magnitude alone lights the start fade
    // while the strip is still sitting at its start — in LTR too, which is a
    // behaviour change for consumers who never set a direction at all.
    mount('ltr');
    scrolledBy(-20);
    expect(fades(), 'ltr').toEqual({ start: false, end: true });

    mount('rtl');
    scrolledBy(20);
    expect(fades(), 'rtl').toEqual({ start: false, end: true });
  });
});

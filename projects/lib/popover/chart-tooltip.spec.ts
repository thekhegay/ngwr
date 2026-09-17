import { Component, type ElementRef, signal, viewChildren } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChartTooltip } from './chart-tooltip';

interface Row {
  readonly label: string;
  readonly value: number;
}

/**
 * The smallest chart there is: a row of spans, each a section. It uses the helper
 * exactly the way the real charts do — an `enabled` input, a `resolve` that reads the
 * data and the rendered element — so what is asserted here is the contract every
 * chart inherits.
 */
@Component({
  template: `
    @for (row of rows(); track $index) {
      <span #section class="section" (mouseenter)="tip.enter($index)" (mouseleave)="tip.leave($event)">{{
        row.label
      }}</span>
    }
  `,
})
class Host {
  readonly rows = signal<readonly Row[]>([
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18 },
  ]);
  readonly enabled = signal(true);
  readonly anchored = signal(true);
  /** The second section opens below its anchor, the way a donut's lower half does. */
  readonly lowerSecond = signal(false);
  /**
   * A box anchor instead of the element, the way a donut or a sparkline points —
   * plain viewport numbers, so they only move when something asks again.
   */
  readonly box = signal<{ x: number; y: number } | null>(null);
  /**
   * How far the page has scrolled since the box was taken. A plain field, not a signal:
   * a scroll changes a box anchor's numbers without telling any signal, so only the
   * scroll listener can make the chart ask for them again.
   */
  scrolled = 0;
  resolved = 0;

  private readonly sections = viewChildren<ElementRef<HTMLElement>>('section');

  readonly tip = useChartTooltip(this.enabled, index => {
    this.resolved++;
    const row = this.rows()[index];
    if (!row) return null;
    const box = this.box();
    return {
      datum: { label: row.label, value: String(row.value), color: 'rgb(1, 2, 3)' },
      anchor: box
        ? { x: box.x, y: box.y - this.scrolled, width: 0, height: 20 }
        : this.anchored()
          ? (this.sections()[index]?.nativeElement ?? null)
          : null,
      side: this.lowerSecond() && index === 1 ? 'bottom' : 'top',
    };
  });
}

/**
 * The tooltip renders into a CDK overlay, so every query for it goes through the
 * document and `provideWrOverlay()` keeps its container out of the next file.
 *
 * What jsdom cannot say: WHERE the chip lands. Every rect is 0×0, so the placement
 * above the section, its flip below near the top of the viewport and the push off
 * the edges are measured in a real browser, not here. What it can say is everything
 * a reader gets — whether a chip is up, what it reads, that it is one chip per chart
 * however many sections are crossed, and when it goes away.
 */
describe('useChartTooltip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const sections = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.section'),
  ];
  const panes = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-tooltip-overlay')];
  const chip = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-chart-tooltip');
  const text = (part: 'label' | 'value'): string | undefined =>
    chip()?.querySelector(`.wr-chart-tooltip__${part}`)?.textContent.trim();

  const settle = (): void => {
    fixture.detectChanges();
  };

  const enter = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('mouseenter'));
    settle();
  };

  const leave = (el: Element, relatedTarget: EventTarget | null = null): void => {
    el.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget }));
    settle();
  };

  const tick = (ms: number): void => {
    vi.advanceTimersByTime(ms);
    settle();
  };

  const press = (key: string): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    settle();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('creates nothing until a section is hovered', () => {
    expect(panes()).toHaveLength(0);
    expect(fixture.componentInstance.tip.active()).toBeNull();
  });

  it('shows the label, the value and a swatch for the hovered section', () => {
    enter(sections()[0]);

    expect(panes()).toHaveLength(1);
    expect(text('label')).toBe('Mon');
    expect(text('value')).toBe('12');
    expect(chip()!.querySelector<HTMLElement>('.wr-chart-tooltip__swatch')!.style.background).toBe('rgb(1, 2, 3)');
    expect(fixture.componentInstance.tip.active()).toBe(0);
  });

  it('wears the library tooltip chip, and keeps it out of the accessibility tree', () => {
    enter(sections()[0]);

    // `.wr-tooltip` is the look every other ngwr tooltip has, and the arrow keys on the
    // `wr-tooltip-overlay` pane. `aria-hidden` because the chart already exposes every
    // value it shows, and nothing points `aria-describedby` at this one.
    expect(chip()!.classList).toContain('wr-tooltip');
    expect(panes()[0].getAttribute('aria-hidden')).toBe('true');
    expect(panes()[0].querySelector('[tabindex]')).toBeNull();
  });

  it('moves ONE chip between sections rather than opening another', () => {
    enter(sections()[0]);
    const pane = panes()[0];

    leave(sections()[0]);
    enter(sections()[1]);

    expect(panes()).toEqual([pane]);
    expect(text('label')).toBe('Tue');
    expect(text('value')).toBe('18');
  });

  it('takes the side each section asks for, and changes it on the one open chip', () => {
    fixture.componentInstance.lowerSecond.set(true);
    settle();

    // The pane is tagged with the placement it TOOK, which is what the arrow keys on;
    // with nothing laid out every placement fits, so the one asked for is the one taken.
    enter(sections()[0]);
    expect(panes()[0].classList).toContain('wr-tooltip-overlay--top');

    enter(sections()[1]);
    expect(panes()).toHaveLength(1);
    expect(panes()[0].classList).toContain('wr-tooltip-overlay--bottom');
    expect(panes()[0].classList).not.toContain('wr-tooltip-overlay--top');
  });

  it('follows its anchor when anything scrolls, and listens only while a chip is up', () => {
    // A box anchor is plain viewport numbers, stale the moment something scrolls, and a
    // scroll in ANY container — not only the window — has to move the chip. jsdom lays
    // nothing out, but the CDK places the pane's bounding box from the anchor's numbers
    // and the document's size, and the document here has no size: given one, the box it
    // writes follows the anchor, which is what shows the chip moved rather than only that
    // the chart was asked. Where the chip then paints is measured in a browser.
    const root = document.documentElement;
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 768 });
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const add = vi.spyOn(document, 'addEventListener').mockImplementation(function (
      this: Document,
      type,
      listener,
      options
    ) {
      if (type === 'scroll' && listener) listeners.add(listener);
      return EventTarget.prototype.addEventListener.call(this, type, listener, options);
    });
    const remove = vi.spyOn(document, 'removeEventListener').mockImplementation(function (
      this: Document,
      type,
      listener,
      options
    ) {
      if (type === 'scroll' && listener) listeners.delete(listener);
      return EventTarget.prototype.removeEventListener.call(this, type, listener, options);
    });
    const scroller = document.createElement('div');
    document.body.appendChild(scroller);
    /** The bottom edge of the box the chip sits in, from the bottom of a 768px viewport. */
    const chipBottom = (): string => panes()[0].parentElement!.style.bottom;

    try {
      fixture.componentInstance.box.set({ x: 100, y: 300 });
      settle();
      enter(sections()[0]);
      expect(listeners.size).toBe(1);
      // Above the anchor: the box ends where the anchor starts, 768 − 300.
      expect(chipBottom()).toBe('468px');

      // The section scrolled 120px up inside some container. Nothing but the scroll
      // tells the chart, and the chip has to go with it: 768 − 180.
      fixture.componentInstance.scrolled = 120;
      const calls = fixture.componentInstance.resolved;
      scroller.dispatchEvent(new Event('scroll'));
      expect(fixture.componentInstance.resolved).toBe(calls + 1);
      expect(chipBottom()).toBe('588px');

      press('Escape');
      expect(listeners.size).toBe(0);

      enter(sections()[1]);
      expect(listeners.size).toBe(1);
      fixture.destroy();
      expect(listeners.size).toBe(0);
    } finally {
      scroller.remove();
      add.mockRestore();
      remove.mockRestore();
      Reflect.deleteProperty(root, 'clientWidth');
      Reflect.deleteProperty(root, 'clientHeight');
    }
  });

  it('hides after a grace period once the pointer leaves, not at once', () => {
    enter(sections()[0]);
    leave(sections()[0]);

    // The gap between a section and the chip, or between two bars, is crossed in
    // less time than this; a tooltip that vanished on the spot would blink.
    tick(50);
    expect(panes()).toHaveLength(1);

    tick(60);
    expect(panes()).toHaveLength(0);
    expect(fixture.componentInstance.tip.active()).toBeNull();
  });

  it('stays up while the pointer is on the chip itself (WCAG 1.4.13, hoverable)', () => {
    enter(sections()[0]);
    const pane = panes()[0];

    // Straight onto the chip: nothing is even armed.
    leave(sections()[0], pane);
    tick(500);
    expect(panes()).toHaveLength(1);

    // Out through the gap first, so the hide IS armed, then onto the chip in time.
    pane.dispatchEvent(new MouseEvent('mouseleave'));
    tick(50);
    pane.dispatchEvent(new MouseEvent('mouseenter'));
    tick(500);
    expect(panes()).toHaveLength(1);

    pane.dispatchEvent(new MouseEvent('mouseleave'));
    tick(110);
    expect(panes()).toHaveLength(0);
  });

  it('dismisses on Escape without the pointer moving, and stays dismissed on that section', () => {
    enter(sections()[0]);
    press('Escape');
    expect(panes()).toHaveLength(0);

    // The same section reporting itself again — a sparkline does on every
    // `mousemove` — must not bring back what the user just dismissed.
    enter(sections()[0]);
    expect(panes()).toHaveLength(0);

    // Another section is a new question.
    enter(sections()[1]);
    expect(text('label')).toBe('Tue');
  });

  it('shows the dismissed section again once the pointer has left and come back', () => {
    enter(sections()[0]);
    press('Escape');
    leave(sections()[0]);
    tick(110);

    enter(sections()[0]);
    expect(text('label')).toBe('Mon');
  });

  it('ignores other keys', () => {
    enter(sections()[0]);
    press('Enter');
    press('ArrowRight');

    expect(panes()).toHaveLength(1);
  });

  it('shows nothing while the chart has opted out', () => {
    fixture.componentInstance.enabled.set(false);
    settle();

    enter(sections()[0]);

    expect(panes()).toHaveLength(0);
    expect(fixture.componentInstance.tip.active()).toBeNull();

    // Nor does a hover from while it was off come back when it is turned on.
    fixture.componentInstance.enabled.set(true);
    settle();
    expect(panes()).toHaveLength(0);
  });

  it('closes an open tooltip when the chart opts out under it', () => {
    enter(sections()[0]);
    fixture.componentInstance.enabled.set(false);
    settle();

    expect(panes()).toHaveLength(0);
  });

  it('follows the data under an open tooltip, and closes when its section is gone', () => {
    enter(sections()[1]);
    fixture.componentInstance.rows.set([
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 21 },
    ]);
    settle();
    expect(text('value')).toBe('21');

    fixture.componentInstance.rows.set([{ label: 'Mon', value: 12 }]);
    settle();
    expect(panes()).toHaveLength(0);
  });

  it('points at nothing rather than opening without an anchor', () => {
    fixture.componentInstance.anchored.set(false);
    settle();

    enter(sections()[0]);

    expect(panes()).toHaveLength(0);
  });

  it('takes its overlay and its timer with it when the chart is destroyed', () => {
    enter(sections()[0]);
    leave(sections()[0]);

    fixture.destroy();
    expect(panes()).toHaveLength(0);
    // A timer left armed would write a signal on a destroyed view.
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });
});

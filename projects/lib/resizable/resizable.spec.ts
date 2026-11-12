import { Directionality } from '@angular/cdk/bidi';
import type { Direction } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import type { Provider, EnvironmentProviders } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWr } from 'ngwr';
import { withStorage } from 'ngwr/storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrResizable } from './resizable';
import type { WrResizableEdge, WrResizableLimit } from './types';

@Component({
  imports: [WrResizable],
  template: `
    <div class="parent">
      <div
        class="panel"
        wrResizable
        [edge]="edge()"
        [(size)]="size"
        [minSize]="min()"
        [maxSize]="max()"
        [defaultSize]="fallback()"
        [step]="step()"
        [persistKey]="key()"
        [collapsed]="collapsed()"
        [disabled]="disabled()"
        [resizeLabel]="label()"
        (resizing)="live.push($event)"
      >
        content
      </div>
    </div>
  `,
})
class Host {
  // What the directive defaults to is asserted by `Bare` below.
  readonly edge = signal<WrResizableEdge>('end');
  readonly size = signal<number | null>(null);
  readonly min = signal<WrResizableLimit | null>(0);
  readonly max = signal<WrResizableLimit | null>(null);
  readonly fallback = signal<number | null>(null);
  readonly step = signal(10);
  readonly key = signal<string | null>(null);
  readonly collapsed = signal(false);
  readonly disabled = signal(false);
  readonly label = signal<string | null>(null);
  readonly live: number[] = [];
}

@Component({
  imports: [WrResizable],
  template: `<div class="parent"><div class="panel" wrResizable>content</div></div>`,
})
class Bare {}

/**
 * jsdom lays nothing out, so the two measurements the directive takes are
 * stubbed: the panel renders 200×100 until the directive writes a size (after
 * that jsdom's computed style answers with the inline value, which is the
 * path a browser takes), and the parent is 1000×500 inside. Everything
 * asserted is what the directive wrote itself: the inline `width` / `height`,
 * the handle's attributes, the root's inline styles, the model and storage.
 *
 * `ResizeObserver` is stubbed so a parent resize happens when the spec says.
 */
describe('WrResizable', () => {
  const globals = globalThis as Record<string, unknown>;
  const pristineObserver = globals['ResizeObserver'];

  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let observers: StubResizeObserver[];
  let parentWidth: number;
  let parentHeight: number;
  let captured: number[];
  let released: number[];
  let changes: (number | null)[];

  class StubResizeObserver {
    readonly targets: Element[] = [];
    connected = true;

    constructor(private readonly callback: ResizeObserverCallback) {
      observers.push(this);
    }

    observe(target: Element): void {
      this.targets.push(target);
    }

    disconnect(): void {
      this.connected = false;
    }

    fire(): void {
      this.callback([], this as unknown as ResizeObserver);
    }
  }

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const panel = (): HTMLElement => root().querySelector<HTMLElement>('.panel')!;
  const parent = (): HTMLElement => root().querySelector<HTMLElement>('.parent')!;
  const handle = (): HTMLElement => root().querySelector<HTMLElement>('.wr-resizable__handle')!;
  const page = (): CSSStyleDeclaration => document.documentElement.style;

  const mount = async (
    arrange: (host: Host) => void = () => undefined,
    providers: (Provider | EnvironmentProviders)[] = []
  ): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    arrange(host());
    const el = panel();
    el.getBoundingClientRect = (): DOMRect => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(parent(), 'clientWidth', { get: () => parentWidth });
    Object.defineProperty(parent(), 'clientHeight', { get: () => parentHeight });
    fixture.detectChanges();
    await fixture.whenStable();
    changes = [];
    fixture.debugElement.children[0].children[0].injector.get(WrResizable).size.subscribe(v => changes.push(v));
    const h = root().querySelector<HTMLElement>('.wr-resizable__handle');
    if (h) {
      h.setPointerCapture = id => void captured.push(id);
      h.releasePointerCapture = id => void released.push(id);
    }
  };

  const rtl = (direction: Direction): Provider => ({
    provide: Directionality,
    useValue: { value: direction, change: new Subject<Direction>() },
  });

  /**
   * jsdom has no `PointerEvent`, so the drag is driven with a `MouseEvent`
   * carrying the properties the handlers read. `isPrimary` has to be defined:
   * read as `undefined`, the primary-pointer guard rejects every event.
   */
  const pointer = (type: string, x = 0, y = 0, init: { button?: number; isPrimary?: boolean } = {}): MouseEvent => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: init.button ?? 0,
    });
    Object.defineProperty(event, 'isPrimary', { value: init.isPrimary ?? true });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    handle().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  const drag = (from: [number, number], to: [number, number]): void => {
    pointer('pointerdown', ...from);
    pointer('pointermove', ...to);
    pointer('pointerup', ...to);
  };

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    handle().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    observers = [];
    parentWidth = 1000;
    parentHeight = 500;
    captured = [];
    released = [];
    globals['ResizeObserver'] = StubResizeObserver;
    localStorage.clear();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    globals['ResizeObserver'] = pristineObserver;
    globals['ngServerMode'] = false;
    localStorage.clear();
  });

  describe('the edge', () => {
    it('keeps the CSS size until the first resize', async () => {
      await mount();

      expect(panel().style.width).toBe('');
      expect(panel().style.height).toBe('');
      expect(host().size()).toBeNull();
    });

    it('writes the width from the end edge, starting at the rendered size', async () => {
      await mount();
      drag([200, 0], [260, 40]);

      expect(panel().style.width).toBe('260px');
      expect(panel().style.height).toBe('');
      expect(host().size()).toBe(260);
    });

    it('writes the width from the start edge, growing against the axis', async () => {
      await mount(h => h.edge.set('start'));
      drag([0, 0], [-60, 0]);
      expect(panel().style.width).toBe('260px');

      drag([-60, 0], [0, 0]);
      expect(panel().style.width).toBe('200px');
    });

    it('writes the height from the bottom edge', async () => {
      await mount(h => h.edge.set('bottom'));
      drag([0, 100], [300, 130]);

      expect(panel().style.height).toBe('130px');
      expect(panel().style.width).toBe('');
    });

    it('writes the height from the top edge, growing upward', async () => {
      await mount(h => h.edge.set('top'));
      drag([0, 0], [0, -30]);

      expect(panel().style.height).toBe('130px');
    });

    it('mirrors start and end under RTL and leaves top and bottom alone', async () => {
      await mount(undefined, [rtl('rtl')]);
      // The end edge is on the LEFT: dragging left grows.
      drag([0, 0], [-60, 0]);
      expect(panel().style.width).toBe('260px');
      fixture.destroy();

      await mount(h => h.edge.set('start'), [rtl('rtl')]);
      drag([200, 0], [260, 0]);
      expect(panel().style.width).toBe('260px');
      fixture.destroy();

      await mount(h => h.edge.set('bottom'), [rtl('rtl')]);
      drag([0, 100], [0, 130]);
      expect(panel().style.height).toBe('130px');
    });

    it('names the edge in the class list, the public hook the styles hang on', async () => {
      await mount(h => h.edge.set('top'));

      expect(panel().classList.contains('wr-resizable')).toBe(true);
      expect(panel().classList.contains('wr-resizable--top')).toBe(true);
      // The consumer's own class survives the host binding.
      expect(panel().classList.contains('panel')).toBe(true);
    });

    it('gives a static host a positioning context and leaves a positioned one alone', async () => {
      const real = window.getComputedStyle.bind(window);
      vi.spyOn(window, 'getComputedStyle').mockImplementation(el => {
        const style = real(el);
        return el === panel() && !panel().style.position
          ? ({ position: 'static', width: style.width, height: style.height } as CSSStyleDeclaration)
          : style;
      });
      await mount();
      expect(panel().style.position).toBe('relative');
      fixture.destroy();

      await mount(() => (panel().style.position = 'absolute'));
      expect(panel().style.position).toBe('absolute');
    });
  });

  describe('the limits', () => {
    it('stops a drag at the pixel limits', async () => {
      await mount(h => {
        h.min.set(150);
        h.max.set(300);
      });

      drag([200, 0], [900, 0]);
      expect(panel().style.width).toBe('300px');
      drag([300, 0], [-500, 0]);
      expect(panel().style.width).toBe('150px');
    });

    it('reads a percentage off the parent, on the axis being resized', async () => {
      await mount(h => {
        h.min.set('10%');
        h.max.set('40%');
      });
      drag([200, 0], [900, 0]);
      expect(panel().style.width).toBe('400px');
      drag([400, 0], [-900, 0]);
      expect(panel().style.width).toBe('100px');
      fixture.destroy();

      await mount(h => {
        h.edge.set('bottom');
        h.max.set('40%');
      });
      drag([0, 100], [0, 900]);
      expect(panel().style.height).toBe('200px');
    });

    it('measures the parent again at each drag start', async () => {
      await mount(h => h.max.set('50%'));
      parentWidth = 600;
      drag([200, 0], [900, 0]);

      expect(panel().style.width).toBe('300px');
    });

    it('follows a parent resize without rewriting the model', async () => {
      await mount(h => {
        h.size.set(450);
        h.max.set('50%');
      });
      expect(panel().style.width).toBe('450px');

      parentWidth = 600;
      for (const observer of observers) observer.fire();
      fixture.detectChanges();
      expect(panel().style.width).toBe('300px');
      expect(handle().getAttribute('aria-valuemax')).toBe('300');
      // The width the user chose comes back with the room for it.
      expect(host().size()).toBe(450);
      expect(changes).toEqual([]);

      parentWidth = 1000;
      for (const observer of observers) observer.fire();
      fixture.detectChanges();
      expect(panel().style.width).toBe('450px');
    });

    it('runs from zero to the whole parent at 100%', async () => {
      await mount(h => h.max.set('100%'));

      drag([200, 0], [5000, 0]);
      expect(panel().style.width).toBe('1000px');
      drag([1000, 0], [-5000, 0]);
      expect(panel().style.width).toBe('0px');
    });

    it('ignores a percentage of a parent it cannot measure', async () => {
      parentWidth = 0;
      await mount(h => h.max.set('50%'));
      drag([200, 0], [700, 0]);

      expect(panel().style.width).toBe('700px');
    });

    it('clamps a size written from outside where it is drawn', async () => {
      await mount(h => {
        h.max.set(300);
        h.size.set(900);
      });

      expect(panel().style.width).toBe('300px');
      expect(handle().getAttribute('aria-valuenow')).toBe('300');
    });
  });

  describe('the model and the outputs', () => {
    it('takes a size from the host', async () => {
      await mount(h => h.size.set(320));
      expect(panel().style.width).toBe('320px');

      host().size.set(180);
      fixture.detectChanges();
      expect(panel().style.width).toBe('180px');

      host().size.set(null);
      fixture.detectChanges();
      expect(panel().style.width).toBe('');
    });

    it('emits sizeChange once, on release, and resizing on every move', async () => {
      await mount();
      pointer('pointerdown', 200);
      pointer('pointermove', 220);
      pointer('pointermove', 240);
      // The same pixel twice is one event.
      pointer('pointermove', 240);

      expect(host().live).toEqual([220, 240]);
      expect(changes).toEqual([]);
      expect(host().size()).toBeNull();
      // The element follows the drag before the model does.
      expect(panel().style.width).toBe('240px');
      expect(panel().classList.contains('wr-resizable--resizing')).toBe(true);

      pointer('pointerup', 240);
      expect(changes).toEqual([240]);
      expect(host().size()).toBe(240);
      expect(panel().classList.contains('wr-resizable--resizing')).toBe(false);
    });

    it('lands a drag on whole pixels', async () => {
      await mount();
      drag([200, 0], [230.6, 0]);

      expect(host().size()).toBe(231);
    });

    it('leaves the model alone on a press that never moves', async () => {
      await mount();
      pointer('pointerdown', 200);
      pointer('pointerup', 200);

      expect(changes).toEqual([]);
      expect(panel().style.width).toBe('');
    });

    it('ignores a press that is not the primary button or the primary pointer', async () => {
      await mount();
      pointer('pointerdown', 200, 0, { button: 2 });
      pointer('pointermove', 300);
      pointer('pointerdown', 200, 0, { isPrimary: false });
      pointer('pointermove', 300);

      expect(host().live).toEqual([]);
      expect(captured).toEqual([]);
    });
  });

  describe('the drag and the page', () => {
    it('captures the pointer on the handle and releases it', async () => {
      await mount();
      pointer('pointerdown', 200);
      expect(captured).toEqual([1]);
      expect(document.activeElement).toBe(handle());

      pointer('pointerup', 200);
      expect(released).toEqual([1]);
    });

    it('turns selection off and sets the cursor for the drag only', async () => {
      await mount();
      expect(page().userSelect).toBe('');

      pointer('pointerdown', 200);
      expect(page().userSelect).toBe('none');
      expect(page().cursor).toBe('col-resize');

      pointer('pointerup', 200);
      expect(page().userSelect).toBe('');
      expect(page().cursor).toBe('');
    });

    it('uses the row cursor on the block axis', async () => {
      await mount(h => h.edge.set('top'));
      pointer('pointerdown');

      expect(page().cursor).toBe('row-resize');
      pointer('pointerup');
    });

    it('puts back what the page had inline before', async () => {
      page().userSelect = 'text';
      page().cursor = 'wait';
      await mount();
      drag([200, 0], [240, 0]);

      expect(page().userSelect).toBe('text');
      expect(page().cursor).toBe('wait');
      page().userSelect = '';
      page().cursor = '';
    });

    it('gives the page back, and keeps the size, when the pointer is lost', async () => {
      await mount();
      pointer('pointerdown', 200);
      pointer('pointermove', 250);
      pointer('lostpointercapture');

      expect(page().userSelect).toBe('');
      expect(page().cursor).toBe('');
      expect(host().size()).toBe(250);
      // The drag is over: a stray move resizes nothing.
      pointer('pointermove', 400);
      expect(host().size()).toBe(250);
      expect(released).toEqual([]);
    });

    it('gives the page back on a cancelled pointer', async () => {
      await mount();
      pointer('pointerdown', 200);
      pointer('pointercancel', 200);

      expect(page().userSelect).toBe('');
    });

    it('gives the page back when it is destroyed mid-drag', async () => {
      await mount();
      pointer('pointerdown', 200);
      fixture.destroy();

      expect(page().userSelect).toBe('');
      expect(page().cursor).toBe('');
    });

    it('removes the handle and stops observing on destroy', async () => {
      await mount();
      const el = panel();
      expect(observers).toHaveLength(1);
      expect(observers[0].targets).toEqual([el, parent()]);

      fixture.destroy();
      expect(el.querySelector('.wr-resizable__handle')).toBeNull();
      expect(observers[0].connected).toBe(false);
    });
  });

  describe('persistKey', () => {
    it('saves on release and restores on the next creation', async () => {
      await mount(h => h.key.set('side'));
      drag([200, 0], [280, 0]);
      fixture.destroy();

      await mount(h => h.key.set('side'));
      expect(panel().style.width).toBe('280px');
      // Two-way: the host hears what was restored.
      expect(host().size()).toBe(280);
    });

    it('writes through WrStorage, under the app prefix', async () => {
      await mount(h => h.key.set('side'), [provideWr(withStorage({ prefix: 'app:' }))]);
      drag([200, 0], [280, 0]);

      expect(localStorage.getItem('app:wr:resizable:side')).toBe('{"v":280}');
      expect(localStorage.length).toBe(1);
    });

    it('saves a keyboard resize, and nothing during a drag', async () => {
      await mount(h => h.key.set('side'));
      pointer('pointerdown', 200);
      pointer('pointermove', 260);
      expect(localStorage.length).toBe(0);
      pointer('pointerup', 260);

      press('ArrowRight');
      expect(localStorage.getItem('wr:resizable:side')).toBe('{"v":270}');
    });

    it('forgets the saved size on a reset to the CSS size', async () => {
      await mount(h => h.key.set('side'));
      drag([200, 0], [280, 0]);
      press('Enter');

      expect(localStorage.getItem('wr:resizable:side')).toBeNull();
      expect(panel().style.width).toBe('');
    });

    it('ignores a stored value that is not a size', async () => {
      localStorage.setItem('wr:resizable:side', '{"v":"wide"}');
      await mount(h => h.key.set('side'));

      expect(panel().style.width).toBe('');
    });

    it('stores nothing without a key', async () => {
      await mount();
      drag([200, 0], [280, 0]);

      expect(localStorage.length).toBe(0);
    });
  });

  describe('collapsed and disabled', () => {
    it('collapses to zero and comes back at the size it had', async () => {
      await mount(h => h.size.set(320));
      host().collapsed.set(true);
      fixture.detectChanges();

      expect(panel().style.width).toBe('0px');
      expect(panel().classList.contains('wr-resizable--collapsed')).toBe(true);
      expect(handle().getAttribute('aria-valuenow')).toBe('0');
      // The model keeps the size, which is what brings it back.
      expect(host().size()).toBe(320);

      host().collapsed.set(false);
      fixture.detectChanges();
      expect(panel().style.width).toBe('320px');
    });

    it('collapses an element that never had a size, and gives the CSS size back', async () => {
      await mount(h => h.collapsed.set(true));
      expect(panel().style.width).toBe('0px');

      host().collapsed.set(false);
      fixture.detectChanges();
      expect(panel().style.width).toBe('');
    });

    it('stops the handle while collapsed', async () => {
      await mount(h => {
        h.size.set(320);
        h.collapsed.set(true);
      });
      drag([0, 0], [100, 0]);
      press('ArrowRight');
      press('Enter');

      expect(host().size()).toBe(320);
      expect(captured).toEqual([]);
      expect(handle().getAttribute('tabindex')).toBe('-1');
      expect(handle().getAttribute('aria-disabled')).toBe('true');
    });

    it('keeps the size and stops the handle while disabled', async () => {
      await mount(h => {
        h.size.set(320);
        h.disabled.set(true);
      });
      drag([320, 0], [400, 0]);
      expect(press('ArrowRight').defaultPrevented).toBe(false);
      press('Home');
      press('Enter');
      handle().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();

      expect(panel().style.width).toBe('320px');
      expect(page().userSelect).toBe('');
      expect(panel().classList.contains('wr-resizable--disabled')).toBe(true);
      expect(handle().getAttribute('tabindex')).toBe('-1');
      expect(handle().getAttribute('aria-disabled')).toBe('true');

      host().disabled.set(false);
      fixture.detectChanges();
      expect(handle().getAttribute('tabindex')).toBe('0');
      expect(handle().hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('the keyboard', () => {
    it('moves the end edge with the arrows of its axis, by the step', async () => {
      await mount();
      press('ArrowRight');
      expect(host().size()).toBe(210);
      press('ArrowLeft');
      expect(host().size()).toBe(200);

      // The other pair belongs to the other axis and is left to the page.
      expect(press('ArrowDown').defaultPrevented).toBe(false);
      expect(host().size()).toBe(200);
      expect(changes).toEqual([210, 200]);
    });

    it('takes the step from the input, and ten of them with Shift', async () => {
      await mount(h => h.step.set(4));
      press('ArrowRight');
      expect(host().size()).toBe(204);
      press('ArrowRight', { shiftKey: true });
      expect(host().size()).toBe(244);
    });

    it('sends each arrow the way the edge moves on screen', async () => {
      // The start edge is on the left: ArrowLeft pulls it out.
      await mount(h => h.edge.set('start'));
      press('ArrowLeft');
      expect(host().size()).toBe(210);
      fixture.destroy();

      await mount(h => h.edge.set('top'));
      press('ArrowUp');
      expect(host().size()).toBe(110);
      expect(press('ArrowLeft').defaultPrevented).toBe(false);
      fixture.destroy();

      await mount(h => h.edge.set('bottom'));
      press('ArrowDown');
      expect(host().size()).toBe(110);
    });

    it('mirrors the inline arrows under RTL', async () => {
      // The end edge is on the left.
      await mount(undefined, [rtl('rtl')]);
      press('ArrowLeft');
      expect(host().size()).toBe(210);
      press('ArrowRight');
      expect(host().size()).toBe(200);
      fixture.destroy();

      await mount(h => h.edge.set('start'), [rtl('rtl')]);
      press('ArrowRight');
      expect(host().size()).toBe(210);
    });

    it('jumps to the limits with Home and End', async () => {
      await mount(h => {
        h.min.set(120);
        h.max.set('40%');
      });
      press('End');
      expect(host().size()).toBe(400);
      press('Home');
      expect(host().size()).toBe(120);
    });

    it('has nowhere to send End without a maximum', async () => {
      await mount();
      press('End');

      expect(changes).toEqual([]);
    });

    it('stops at the limits instead of running past them', async () => {
      await mount(h => {
        h.min.set(195);
        h.max.set(205);
      });
      press('ArrowRight');
      expect(host().size()).toBe(205);
      press('ArrowLeft', { shiftKey: true });
      expect(host().size()).toBe(195);
    });

    it('resets to defaultSize with Enter and with a double click', async () => {
      await mount(h => h.fallback.set(240));
      drag([200, 0], [400, 0]);
      expect(press('Enter').defaultPrevented).toBe(true);
      expect(host().size()).toBe(240);

      drag([240, 0], [400, 0]);
      handle().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      expect(panel().style.width).toBe('240px');
    });

    it('resets to the size it was created with when there is no defaultSize', async () => {
      await mount(h => h.size.set(320));
      drag([320, 0], [400, 0]);
      press('Enter');
      expect(host().size()).toBe(320);
      fixture.destroy();

      // Created without one: the reset hands the size back to the CSS.
      await mount();
      drag([200, 0], [400, 0]);
      press('Enter');
      expect(host().size()).toBeNull();
      expect(panel().style.width).toBe('');
    });

    it('resets to the size it was created with, not the one it restored', async () => {
      localStorage.setItem('wr:resizable:side', '{"v":500}');
      await mount(h => {
        h.size.set(320);
        h.key.set('side');
      });
      expect(host().size()).toBe(500);

      press('Enter');
      expect(host().size()).toBe(320);
    });
  });

  describe('the handle', () => {
    it('is a focusable separator across the axis it moves along', async () => {
      await mount();
      expect(handle().parentElement).toBe(panel());
      expect(handle().getAttribute('role')).toBe('separator');
      expect(handle().getAttribute('tabindex')).toBe('0');
      expect(handle().getAttribute('aria-orientation')).toBe('vertical');
      expect(handle().querySelector('.wr-resizable__grip')?.getAttribute('aria-hidden')).toBe('true');

      host().edge.set('bottom');
      fixture.detectChanges();
      expect(handle().getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('announces the size and the limits in whole pixels', async () => {
      await mount(h => {
        h.min.set(120.4);
        h.max.set('33.33%');
      });
      // No size yet: the rendered one.
      expect(handle().getAttribute('aria-valuenow')).toBe('200');
      expect(handle().getAttribute('aria-valuemin')).toBe('120');
      expect(handle().getAttribute('aria-valuemax')).toBe('333');

      drag([200, 0], [250, 0]);
      expect(handle().getAttribute('aria-valuenow')).toBe('250');

      pointer('pointerdown', 250);
      pointer('pointermove', 300);
      expect(handle().getAttribute('aria-valuenow')).toBe('300');
      pointer('pointerup', 300);
    });

    it('leaves out a maximum it does not have', async () => {
      await mount();

      expect(handle().hasAttribute('aria-valuemax')).toBe(false);
      expect(handle().getAttribute('aria-valuemin')).toBe('0');
    });

    it('is named from the catalog, and from resizeLabel when it is bound', async () => {
      await mount();
      expect(handle().getAttribute('aria-label')).toBe('Resize');

      host().label.set('Resize the layers panel');
      fixture.detectChanges();
      expect(handle().getAttribute('aria-label')).toBe('Resize the layers panel');
    });
  });

  it('defaults to the end edge, no smaller than zero and no larger than the parent', async () => {
    TestBed.resetTestingModule();
    const bare = TestBed.createComponent(Bare);
    const el = bare.nativeElement as HTMLElement;
    Object.defineProperty(el.querySelector('.parent'), 'clientWidth', { get: () => 640 });
    bare.detectChanges();
    await bare.whenStable();
    const separator = el.querySelector<HTMLElement>('.wr-resizable__handle')!;

    expect(el.querySelector('.panel')!.classList.contains('wr-resizable--end')).toBe(true);
    expect(separator.getAttribute('aria-valuemin')).toBe('0');
    expect(separator.getAttribute('aria-valuemax')).toBe('640');
    bare.destroy();
    await mount();
  });

  it('does nothing on the server', async () => {
    // `afterNextRender` is a no-op under `ngServerMode`, the global Angular branches on.
    globals['ngServerMode'] = true;
    const read = vi.spyOn(window, 'getComputedStyle');
    await mount(h => h.size.set(320));

    expect(root().querySelector('.wr-resizable__handle')).toBeNull();
    expect(observers).toHaveLength(0);
    expect(read).not.toHaveBeenCalled();
    expect(panel().style.position).toBe('');
    // A bound size is a host binding, so the server paints it.
    expect(panel().style.width).toBe('320px');
  });
});

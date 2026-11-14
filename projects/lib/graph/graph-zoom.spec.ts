import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, PLATFORM_ID, type Provider, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { EMPTY } from 'rxjs';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrGraph } from './graph';
import { WrGraphNodeTemplate } from './graph-node-template';
import { WrGraphLayout } from './internal/layout/types';
import type { WrGraphLayoutInput, WrGraphLayoutResult } from './internal/layout/types';
import type { WrGraphNode } from './types';

/**
 * Zoom and pan, read off what the component wrote: the stage's inline
 * `transform`, the host's classes and the `zoom` model.
 *
 * jsdom lays nothing out, so the viewport's box is stubbed: 800 by 600, its
 * corner at (100, 50) on screen. The stage's own offset reads 0, so the stage
 * starts in the viewport's corner. The layout is a recorder's: every node on one
 * line, 200 apart and 48 tall, so a drawing's size is `count * 200` by 48 and
 * every expected number below is arithmetic on those.
 *
 * Pointer and wheel moves wait for a frame, so `requestAnimationFrame` is
 * stubbed and each spec runs its frames by hand.
 */
const VIEWPORT = { left: 100, top: 50, width: 800, height: 600 };

const nodes = (count: number): readonly WrGraphNode[] =>
  Array.from({ length: count }, (_, index) => ({ id: `n${index}`, label: `Node ${index}` }));

const inRow = (input: WrGraphLayoutInput): WrGraphLayoutResult => ({
  nodes: input.nodes.map((node, index) => ({ id: node.id, x: index * 200, y: 0 })),
  edges: [],
  width: input.nodes.length * 200,
  height: 48,
});

@Component({
  imports: [WrGraph, WrGraphNodeTemplate],
  template: `
    <wr-graph
      [nodes]="nodes()"
      [zoomable]="zoomable()"
      [wheelZoom]="wheelZoom()"
      [minZoom]="minZoom()"
      [maxZoom]="maxZoom()"
      [zoomInLabel]="zoomInLabel()"
      [(zoom)]="zoom"
    >
      @if (buttons()) {
        <ng-template wrGraphNode let-node>
          <button type="button" class="pick">{{ node.label }}</button>
        </ng-template>
      }
    </wr-graph>
  `,
})
class Host {
  readonly nodes = signal<readonly WrGraphNode[]>(nodes(2));
  readonly zoomable = signal(true);
  readonly wheelZoom = signal(false);
  readonly minZoom = signal(0.25);
  readonly maxZoom = signal(4);
  readonly zoomInLabel = signal<string | null>(null);
  readonly zoom = signal(1);
  readonly buttons = signal(false);
}

interface Placement {
  readonly x: number;
  readonly y: number;
  readonly k: number;
}

describe('WrGraph zoom and pan', () => {
  let fixture: ComponentFixture<Host>;
  // Angular's scheduler asks for frames too, so a spec compares counts, never a total.
  let frames: Map<number, FrameRequestCallback>;
  let requested: number;
  let reducedMotion: ReturnType<typeof signal<boolean>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-graph')!;
  const viewport = (): HTMLElement => root().querySelector<HTMLElement>('.wr-graph__viewport')!;
  const stage = (): HTMLElement => root().querySelector<HTMLElement>('.wr-graph__stage')!;
  const control = (name: string): HTMLButtonElement =>
    root().querySelector<HTMLButtonElement>(`.wr-graph__control--${name}`)!;
  const graph = (): WrGraph => fixture.debugElement.children[0].componentInstance as WrGraph;

  /** One pass draws, the fit lands after it, and a second pass writes it out. */
  const render = (): void => {
    fixture.detectChanges();
    fixture.detectChanges();
  };

  /** Runs the frames asked for so far, then renders. */
  const frame = (): void => {
    const due = [...frames.values()];
    frames.clear();
    for (const callback of due) callback(0);
    render();
  };

  /** The transform the component wrote on the stage; 100% in place when it wrote none. */
  const placement = (): Placement => {
    const style = stage().getAttribute('style') ?? '';
    if (!style.includes('transform')) return { x: 0, y: 0, k: 1 };
    const match = /translate\((-?[\d.]+)px(?:,\s*(-?[\d.]+)px)?\)\s*scale\(([\d.]+)\)/.exec(style);
    if (!match) throw new Error(`no translate and scale in "${style}"`);
    return { x: Number(match[1]), y: Number(match[2] ?? 0), k: Number(match[3]) };
  };

  const create = (
    options: { providers?: Provider[]; layout?: WrGraphLayout['layout']; setup?: (host: Host) => void } = {}
  ): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: WrGraphLayout, useValue: { layout: options.layout ?? inRow } },
        { provide: WrPlatform, useValue: { prefersReducedMotion: reducedMotion } },
        ...(options.providers ?? []),
      ],
    });
    fixture = TestBed.createComponent(Host);
    options.setup?.(fixture.componentInstance);
    render();
  };

  const wheel = (init: WheelEventInit): WheelEvent => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
    viewport().dispatchEvent(event);
    return event;
  };

  const key = (name: string, init: KeyboardEventInit = {}, target: HTMLElement = viewport()): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    render();
    return event;
  };

  const pointer = (
    type: string,
    id: number,
    x: number,
    y: number,
    init: PointerEventInit = {},
    target: Element = viewport()
  ): void => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: id,
        pointerType: 'mouse',
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        ...init,
      })
    );
  };

  /** jsdom has no pointer capture: the calls are recorded, and held ids answer as held. */
  const captureStub = (): { capture: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } => {
    const held = new Set<number>();
    const capture = vi.fn((id: number) => void held.add(id));
    const release = vi.fn((id: number) => void held.delete(id));
    Object.assign(viewport(), {
      setPointerCapture: capture,
      releasePointerCapture: release,
      hasPointerCapture: (id: number) => held.has(id),
    });
    return { capture, release };
  };

  beforeEach(() => {
    frames = new Map();
    requested = 0;
    reducedMotion = signal(false);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      frames.set(++requested, callback);
      return requested;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => void frames.delete(id));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const box = this.classList.contains('wr-graph__viewport') ? VIEWPORT : { left: 0, top: 0, width: 0, height: 0 };
      return { ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('when zoomable is off', () => {
    it('is off by default', () => {
      TestBed.configureTestingModule({ providers: [{ provide: WrGraphLayout, useValue: { layout: inRow } }] });
      @Component({ imports: [WrGraph], template: `<wr-graph [nodes]="nodes" />` })
      class Plain {
        readonly nodes = nodes(10);
      }
      const plain = TestBed.createComponent(Plain);
      plain.detectChanges();
      plain.detectChanges();
      const element = plain.nativeElement as HTMLElement;

      expect(element.querySelector('wr-graph')!.classList.contains('wr-graph--zoomable')).toBe(false);
      expect(element.querySelector('.wr-graph__controls')).toBeNull();
      expect(element.querySelector('.wr-graph__stage')!.getAttribute('style')).not.toContain('transform');
    });

    it('keeps the scrolling viewport as it was: no buttons, no transform, and no gesture is taken', () => {
      create({
        setup: h => {
          h.zoomable.set(false);
          h.nodes.set(nodes(10));
        },
      });
      captureStub();

      expect(host().classList.contains('wr-graph--zoomable')).toBe(false);
      expect(root().querySelector('.wr-graph__controls')).toBeNull();
      expect(viewport().getAttribute('tabindex')).toBe('0');
      expect(stage().getAttribute('style')).not.toContain('transform');

      expect(wheel({ ctrlKey: true, deltaY: -10, clientX: 300, clientY: 300 }).defaultPrevented).toBe(false);
      expect(key('+').defaultPrevented).toBe(false);
      expect(key('ArrowRight').defaultPrevented).toBe(false);
      pointer('pointerdown', 1, 300, 300);
      pointer('pointermove', 1, 400, 380);
      frame();

      expect(stage().getAttribute('style')).not.toContain('transform');
      expect(host().classList.contains('wr-graph--panning')).toBe(false);
      expect(fixture.componentInstance.zoom()).toBe(1);
    });

    it('ignores fit() and resetView()', () => {
      create({
        setup: h => {
          h.zoomable.set(false);
          h.nodes.set(nodes(10));
        },
      });

      graph().fit();
      graph().resetView();
      render();

      expect(stage().getAttribute('style')).not.toContain('transform');
    });

    it('drops the transform and the listeners when it is turned off', () => {
      create({ setup: h => h.nodes.set(nodes(10)) });
      expect(placement().k).toBe(0.4);

      fixture.componentInstance.zoomable.set(false);
      render();

      expect(stage().getAttribute('style')).not.toContain('transform');
      expect(wheel({ ctrlKey: true, deltaY: -10 }).defaultPrevented).toBe(false);
    });
  });

  describe('fitting', () => {
    it('centres a drawing that fits, at 100%, on first draw', () => {
      create();

      // 400 by 48 in 800 by 600.
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });
      expect(host().classList.contains('wr-graph--zoomable')).toBe(true);
    });

    it('shrinks a drawing that does not fit, and writes the zoom to the model', () => {
      create({ setup: h => h.nodes.set(nodes(10)) });

      // 2000 wide in 800: 0.4, and 48 * 0.4 centred in 600.
      expect(placement()).toEqual({ x: 0, y: 290.4, k: 0.4 });
      expect(fixture.componentInstance.zoom()).toBe(0.4);
      expect(graph().pan()).toEqual({ x: 0, y: 290.4 });
    });

    it('stays clear of the viewport padding', () => {
      create({ setup: h => h.nodes.set(nodes(10)) });
      viewport().style.padding = '20px 100px';

      graph().fit();
      render();

      // 600 of room for 2000: 0.3, starting at the left padding.
      expect(placement().k).toBe(0.3);
      expect(placement().x).toBe(100);
    });

    it('does not go under minZoom', () => {
      create({
        setup: h => {
          h.nodes.set(nodes(10));
          h.minZoom.set(0.5);
        },
      });

      expect(placement().k).toBe(0.5);
    });

    it('fits again when a synchronous layout changes the size', () => {
      create();

      fixture.componentInstance.nodes.set(nodes(10));
      render();

      expect(placement()).toEqual({ x: 0, y: 290.4, k: 0.4 });
    });

    it('keeps the view when the size changes after the user moved it', () => {
      create();
      key('ArrowLeft');
      const moved = placement();
      expect(moved).toEqual({ x: 240, y: 276, k: 1 });

      fixture.componentInstance.nodes.set(nodes(10));
      render();

      expect(placement()).toEqual(moved);
    });

    it('fits again after fit(), and follows the layout from then on', () => {
      create();
      key('+');
      expect(placement().k).toBe(1.25);

      graph().fit();
      render();
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });

      fixture.componentInstance.nodes.set(nodes(10));
      render();
      expect(placement().k).toBe(0.4);
    });

    it('goes back to 100% in place on resetView(), and stays there through a new layout', () => {
      create({ setup: h => h.nodes.set(nodes(10)) });

      graph().resetView();
      render();

      expect(stage().getAttribute('style')).not.toContain('transform');
      expect(fixture.componentInstance.zoom()).toBe(1);
      expect(graph().pan()).toEqual({ x: 0, y: 0 });

      fixture.componentInstance.nodes.set(nodes(12));
      render();
      expect(stage().getAttribute('style')).not.toContain('transform');
    });
  });

  describe('with an asynchronous layout', () => {
    let resolvers: (() => void)[];
    const deferred = (input: WrGraphLayoutInput): Promise<WrGraphLayoutResult> =>
      new Promise(resolve => resolvers.push(() => resolve(inRow(input))));
    const settle = async (): Promise<void> => {
      await Promise.resolve();
      await Promise.resolve();
      render();
    };

    beforeEach(() => (resolvers = []));

    it('fits the first result when it lands, and the next one when it swaps in', async () => {
      create({ layout: deferred });
      expect(stage().getAttribute('style')).not.toContain('transform');

      resolvers[0]();
      await settle();
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });

      fixture.componentInstance.nodes.set(nodes(10));
      render();
      // Pending: the old picture, and its fit, stay.
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });

      resolvers[1]();
      await settle();
      expect(placement()).toEqual({ x: 0, y: 290.4, k: 0.4 });
    });

    it('keeps a view the user moved when the next result swaps in', async () => {
      create({ layout: deferred });
      resolvers[0]();
      await settle();
      key('+');
      const moved = placement();
      expect(moved.k).toBe(1.25);

      fixture.componentInstance.nodes.set(nodes(10));
      render();
      resolvers[1]();
      await settle();

      expect(root().querySelectorAll('.wr-graph__node')).toHaveLength(10);
      expect(placement()).toEqual(moved);
    });
  });

  describe('the wheel', () => {
    it('zooms around the pointer with Ctrl held, one update per frame', () => {
      create();
      const before = placement();
      // Viewport-relative pointer: (300 - 100, 350 - 50).
      const under = { x: (200 - before.x) / before.k, y: (300 - before.y) / before.k };

      const first = wheel({ ctrlKey: true, deltaY: -10, clientX: 300, clientY: 350 });
      const asked = requested;
      const second = wheel({ ctrlKey: true, deltaY: -10, clientX: 300, clientY: 350 });
      // The second event shares the first one's frame.
      expect(requested).toBe(asked);
      fixture.detectChanges();

      expect(first.defaultPrevented).toBe(true);
      expect(second.defaultPrevented).toBe(true);
      // Nothing is drawn until the frame.
      expect(placement()).toEqual(before);

      frame();
      const after = placement();

      expect(after.k).toBeCloseTo(Math.exp(0.2), 3);
      expect(after.x + after.k * under.x).toBeCloseTo(200, 1);
      expect(after.y + after.k * under.y).toBeCloseTo(300, 1);
      expect(fixture.componentInstance.zoom()).toBe(after.k);
    });

    it('zooms with ⌘ held too, and out when the wheel goes the other way', () => {
      create();

      wheel({ metaKey: true, deltaY: 10, clientX: 500, clientY: 350 });
      frame();

      expect(placement().k).toBeCloseTo(Math.exp(-0.1), 3);
    });

    it('leaves a plain wheel to the page by default', () => {
      create();
      const before = placement();

      const event = wheel({ deltaY: -10, clientX: 300, clientY: 350 });
      frame();

      expect(event.defaultPrevented).toBe(false);
      expect(placement()).toEqual(before);
    });

    it('zooms on a plain wheel with wheelZoom', () => {
      create({ setup: h => h.wheelZoom.set(true) });

      const event = wheel({ deltaY: -10, clientX: 300, clientY: 350 });
      frame();

      expect(event.defaultPrevented).toBe(true);
      expect(placement().k).toBeCloseTo(Math.exp(0.1), 3);
    });

    it('stops at maxZoom and minZoom, and still takes the event there', () => {
      create({
        setup: h => {
          h.minZoom.set(0.5);
          h.maxZoom.set(2);
        },
      });

      for (let i = 0; i < 20; i++) wheel({ ctrlKey: true, deltaY: -100, clientX: 500, clientY: 350 });
      frame();
      expect(placement().k).toBe(2);
      expect(wheel({ ctrlKey: true, deltaY: -100 }).defaultPrevented).toBe(true);

      for (let i = 0; i < 40; i++) wheel({ ctrlKey: true, deltaY: 100, clientX: 500, clientY: 350 });
      frame();
      expect(placement().k).toBe(0.5);
    });
  });

  describe('the buttons', () => {
    it('are three named buttons after the viewport', () => {
      create();
      const buttons = [...root().querySelectorAll<HTMLButtonElement>('.wr-graph__controls > button')];

      expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Zoom in', 'Zoom out', 'Fit to view']);
      expect(buttons.every(button => button.type === 'button')).toBe(true);
      expect(viewport().nextElementSibling?.classList.contains('wr-graph__controls')).toBe(true);
    });

    it('take their names from the label inputs', () => {
      create({ setup: h => h.zoomInLabel.set('Closer') });

      expect(control('zoom-in').getAttribute('aria-label')).toBe('Closer');
    });

    it('zoom in and out by a step around the middle of the viewport, and fit', () => {
      create();

      control('zoom-in').click();
      render();
      // The middle, (400, 300), stays put: 400 - (400 - 200) * 1.25.
      expect(placement()).toEqual({ x: 150, y: 270, k: 1.25 });

      control('zoom-out').click();
      control('zoom-out').click();
      render();
      expect(placement().k).toBe(0.8);

      control('fit').click();
      render();
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });
    });

    it('mark the bound they reached as aria-disabled, and stay focusable', () => {
      create({ setup: h => h.maxZoom.set(1.25) });
      expect(control('zoom-in').hasAttribute('aria-disabled')).toBe(false);

      control('zoom-in').click();
      render();

      expect(control('zoom-in').getAttribute('aria-disabled')).toBe('true');
      expect(control('zoom-in').disabled).toBe(false);
      expect(control('zoom-out').hasAttribute('aria-disabled')).toBe(false);

      control('zoom-in').click();
      render();
      expect(placement().k).toBe(1.25);
    });
  });

  describe('the keyboard', () => {
    it('zooms on + and -, and fits on 0', () => {
      create();

      expect(key('+').defaultPrevented).toBe(true);
      expect(placement().k).toBe(1.25);
      key('=');
      expect(placement().k).toBe(1.5625);
      key('-');
      key('-');
      key('-');
      expect(placement().k).toBe(0.8);

      expect(key('0').defaultPrevented).toBe(true);
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });
    });

    it('moves the view on the arrows, the drawing going the other way', () => {
      create();

      key('ArrowRight');
      expect(placement()).toEqual({ x: 160, y: 276, k: 1 });
      key('ArrowLeft');
      key('ArrowLeft');
      expect(placement()).toEqual({ x: 240, y: 276, k: 1 });
      key('ArrowDown');
      expect(placement()).toEqual({ x: 240, y: 236, k: 1 });
      key('ArrowUp');
      expect(placement()).toEqual({ x: 240, y: 276, k: 1 });
    });

    it('leaves a modified key, another key and a key from inside a node alone', () => {
      create({ setup: h => h.buttons.set(true) });
      const before = placement();

      expect(key('+', { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(key('0', { metaKey: true }).defaultPrevented).toBe(false);
      expect(key('a').defaultPrevented).toBe(false);
      expect(key('ArrowRight', {}, root().querySelector<HTMLElement>('.pick')!).defaultPrevented).toBe(false);
      expect(placement()).toEqual(before);
    });

    it('moves the view the same physical way under RTL', () => {
      const direction = signal<Direction>('rtl');
      create({
        providers: [{ provide: Directionality, useValue: { value: 'rtl', valueSignal: direction, change: EMPTY } }],
      });
      const fitted = placement();
      expect(fitted).toEqual({ x: 200, y: 276, k: 1 });

      key('ArrowRight');
      expect(placement().x).toBe(160);
      key('ArrowLeft');
      expect(placement().x).toBe(200);
    });
  });

  describe('dragging', () => {
    it('pans from the field once the pointer has travelled, with capture and the panning class', () => {
      create();
      const { capture, release } = captureStub();

      pointer('pointerdown', 7, 400, 300);
      pointer('pointermove', 7, 402, 301);
      frame();
      // Under the threshold: still a press.
      expect(capture).not.toHaveBeenCalled();
      expect(host().classList.contains('wr-graph--panning')).toBe(false);
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });

      pointer('pointermove', 7, 450, 330);
      const asked = requested;
      pointer('pointermove', 7, 460, 340);
      // The second move shares the first one's frame.
      expect(requested).toBe(asked);
      fixture.detectChanges();
      expect(capture).toHaveBeenCalledWith(7);
      expect(host().classList.contains('wr-graph--panning')).toBe(true);
      expect(placement()).toEqual({ x: 200, y: 276, k: 1 });

      frame();
      expect(placement()).toEqual({ x: 260, y: 316, k: 1 });
      expect(graph().pan()).toEqual({ x: 260, y: 316 });

      pointer('pointerup', 7, 460, 340);
      render();
      expect(release).toHaveBeenCalledWith(7);
      expect(host().classList.contains('wr-graph--panning')).toBe(false);

      // Released: a later move is not a drag.
      pointer('pointermove', 7, 600, 400, { buttons: 0 });
      frame();
      expect(placement()).toEqual({ x: 260, y: 316, k: 1 });
    });

    it('pans from a plain node, and not from a control inside one', () => {
      create({ setup: h => h.buttons.set(true) });
      captureStub();
      const node = root().querySelector<HTMLElement>('.wr-graph__node')!;
      const button = root().querySelector<HTMLElement>('.pick')!;

      pointer('pointerdown', 1, 400, 300, {}, button);
      pointer('pointermove', 1, 500, 300, {}, button);
      frame();
      expect(placement().x).toBe(200);
      pointer('pointerup', 1, 500, 300, {}, button);

      pointer('pointerdown', 1, 400, 300, {}, node);
      pointer('pointermove', 1, 500, 300, {}, node);
      frame();
      expect(placement().x).toBe(300);
    });

    it('ignores the other mouse buttons', () => {
      create();
      captureStub();

      pointer('pointerdown', 1, 400, 300, { button: 2, buttons: 2 });
      pointer('pointermove', 1, 500, 300, { buttons: 2 });
      frame();

      expect(placement().x).toBe(200);
    });

    it('never lets the whole drawing leave the viewport', () => {
      create();
      captureStub();

      pointer('pointerdown', 1, 400, 300);
      pointer('pointermove', 1, 5400, 5300);
      frame();
      // 48 pixels of the drawing stay inside the 800 by 600 box.
      expect(placement()).toEqual({ x: 752, y: 552, k: 1 });

      pointer('pointermove', 1, -9000, -9000);
      frame();
      expect(placement()).toEqual({ x: -352, y: 0, k: 1 });
    });

    it('zooms on a pinch, around the middle of the two fingers', () => {
      create();
      const { capture } = captureStub();
      const touch = { pointerType: 'touch' } as const;

      // Two fingers 100 apart around screen (500, 350): viewport (400, 300).
      pointer('pointerdown', 1, 450, 350, touch);
      pointer('pointerdown', 2, 550, 350, touch);
      render();
      expect(capture).toHaveBeenCalledWith(1);
      expect(capture).toHaveBeenCalledWith(2);
      expect(host().classList.contains('wr-graph--panning')).toBe(true);

      // Both move out by 50: 200 apart, the middle where it was.
      pointer('pointermove', 1, 400, 350, touch);
      pointer('pointermove', 2, 600, 350, touch);
      frame();

      const after = placement();
      expect(after.k).toBe(2);
      // The drawing point under the middle, (200, 24) at the fit, is still under it.
      expect(after.x + after.k * 200).toBeCloseTo(400, 1);
      expect(after.y + after.k * 24).toBeCloseTo(300, 1);
      expect(fixture.componentInstance.zoom()).toBe(2);

      pointer('pointerup', 1, 400, 350, touch);
      pointer('pointerup', 2, 600, 350, touch);
      render();
      expect(host().classList.contains('wr-graph--panning')).toBe(false);
    });
  });

  describe('the zoom model', () => {
    it('zooms around the middle of the viewport when it is written, and keeps that view', () => {
      create();

      fixture.componentInstance.zoom.set(2);
      render();
      expect(placement()).toEqual({ x: 0, y: 252, k: 2 });

      fixture.componentInstance.nodes.set(nodes(10));
      render();
      expect(placement().k).toBe(2);
    });

    it('pulls a value outside the bounds back in, in the model too', () => {
      create();

      fixture.componentInstance.zoom.set(100);
      render();
      expect(placement().k).toBe(4);
      expect(fixture.componentInstance.zoom()).toBe(4);

      fixture.componentInstance.zoom.set(0.01);
      render();
      expect(placement().k).toBe(0.25);
      expect(fixture.componentInstance.zoom()).toBe(0.25);
    });

    it('starts from a bound value instead of fitting', () => {
      create({
        setup: h => {
          h.nodes.set(nodes(10));
          h.zoom.set(2);
        },
      });

      expect(placement().k).toBe(2);
      expect(fixture.componentInstance.zoom()).toBe(2);
    });
  });

  describe('motion', () => {
    it('eases a step from a button or a key, until the transition ends', () => {
      create();
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(false);

      control('zoom-in').click();
      render();
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(true);

      stage().dispatchEvent(new Event('transitionend'));
      render();
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(false);

      key('ArrowRight');
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(true);
    });

    it('never eases the wheel or a fit the layout asked for', () => {
      create();
      control('zoom-in').click();
      render();

      wheel({ ctrlKey: true, deltaY: -10, clientX: 300, clientY: 350 });
      frame();
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(false);
    });

    it('eases nothing under reduced motion', () => {
      reducedMotion.set(true);
      create();

      control('zoom-in').click();
      render();
      expect(placement().k).toBe(1.25);
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(false);

      key('0');
      expect(stage().classList.contains('wr-graph__stage--animated')).toBe(false);
    });
  });

  describe('on the server', () => {
    it('renders the drawing and the buttons, fits nothing and listens to nothing', () => {
      create({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        setup: h => h.nodes.set(nodes(10)),
      });

      expect(root().querySelectorAll('.wr-graph__node')).toHaveLength(10);
      expect(root().querySelectorAll('.wr-graph__control')).toHaveLength(3);
      expect(host().classList.contains('wr-graph--zoomable')).toBe(true);
      expect(stage().getAttribute('style')).not.toContain('transform');

      expect(wheel({ ctrlKey: true, deltaY: -10, clientX: 300, clientY: 350 }).defaultPrevented).toBe(false);
      expect(key('+').defaultPrevented).toBe(false);
      pointer('pointerdown', 1, 400, 300);
      pointer('pointermove', 1, 500, 300);
      frame();
      expect(host().classList.contains('wr-graph--panning')).toBe(false);
    });
  });
});

describe('WrGraph zoom styles', () => {
  const css = compileSass("@use 'graph/styles';");
  const rule = (selector: string): string => {
    const at = css.indexOf(`${selector} {`);
    if (at < 0) throw new Error(`no rule for ${selector}`);
    return css.slice(at, css.indexOf('}', at));
  };

  it('stops the zoomable viewport scrolling and gives it the grab cursor', () => {
    const viewport = rule('.wr-graph--zoomable .wr-graph__viewport');

    expect(viewport).toContain('overflow: hidden');
    expect(viewport).toContain('cursor: grab');
    expect(viewport).toContain('touch-action: none');
    expect(rule('.wr-graph--panning .wr-graph__viewport')).toContain('cursor: grabbing');
  });

  it('puts the buttons at the inline end, so they mirror under RTL', () => {
    const controls = rule('.wr-graph__controls');

    expect(controls).toContain('inset-inline-end');
    expect(controls).not.toMatch(/\b(left|right):/);
  });

  it('drops the transition under reduced motion', () => {
    expect(css.replace(/\s+/g, ' ')).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.wr-graph__stage--animated \{ transition: none; \}/
    );
  });
});

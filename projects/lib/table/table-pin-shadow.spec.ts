import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns } from './types';

const PINNED: WrTableColumns = {
  name: { title: 'Name', pin: 'left' },
  role: { title: 'Role' },
  seats: { title: 'Seats', pin: 'right' },
};

const PLAIN: WrTableColumns = { name: { title: 'Name' }, role: { title: 'Role' } };

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns()" [items]="items" rowKey="id" />`,
})
class PinHost {
  readonly columns = signal<WrTableColumns>(PINNED);
  protected readonly items = [{ id: 1, name: 'Ada', role: 'admin', seats: 3 }];
}

interface ObserverRecord {
  targets: Element[];
  disconnected: boolean;
  callback: () => void;
}

/**
 * jsdom lays nothing out, so the three numbers the table reads off its scroll
 * area are stubbed, and the observer and the frame are driven by hand. That the
 * shadow then paints is the stylesheet's promise (`stylesheet.spec.ts`).
 */
describe('WrTable pinned edge shadows', () => {
  let fixture: ComponentFixture<PinHost>;
  let observers: ObserverRecord[];
  let frames: Map<number, () => void>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
  const scroll = (): HTMLElement => host().querySelector<HTMLElement>('.wr-table__scroll')!;
  const observer = (): ObserverRecord | undefined =>
    observers.find(o => !o.disconnected && o.targets.includes(scroll()));
  const sides = (): { start: boolean; end: boolean } => ({
    start: host().classList.contains('wr-table--overflow-start'),
    end: host().classList.contains('wr-table--overflow-end'),
  });

  const mount = (direction: Direction = 'ltr'): void => {
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(PinHost);
    fixture.detectChanges();
  };

  const metrics = (scrollWidth: number, clientWidth: number, scrollLeft: number): void => {
    for (const [name, value] of Object.entries({ scrollWidth, clientWidth, scrollLeft })) {
      Object.defineProperty(scroll(), name, { configurable: true, value });
    }
  };

  const resize = (scrollWidth: number, clientWidth: number, scrollLeft = 0): void => {
    metrics(scrollWidth, clientWidth, scrollLeft);
    observer()!.callback();
    fixture.detectChanges();
  };

  const scrollTo = (scrollLeft: number): void => {
    Object.defineProperty(scroll(), 'scrollLeft', { configurable: true, value: scrollLeft });
    scroll().dispatchEvent(new Event('scroll'));
    for (const [id, frame] of [...frames]) {
      frames.delete(id);
      frame();
    }
    fixture.detectChanges();
  };

  beforeEach(() => {
    observers = [];
    frames = new Map();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly record: ObserverRecord;
        constructor(callback: () => void) {
          this.record = { targets: [], disconnected: false, callback };
          observers.push(this.record);
        }
        observe(target: Element): void {
          this.record.targets.push(target);
        }
        disconnect(): void {
          this.record.disconnected = true;
        }
      }
    );
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (frame: () => void): number => {
      frames.set(++nextFrame, frame);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => void frames.delete(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('watches the scroll area and the table inside it', () => {
    mount();
    expect(observer()!.targets).toEqual([scroll(), scroll().querySelector('table')]);
  });

  it('marks neither side while every column fits', () => {
    mount();
    expect(sides()).toEqual({ start: false, end: false });

    resize(600, 600);
    expect(sides()).toEqual({ start: false, end: false });
  });

  it('ignores a pixel of rounding', () => {
    mount();
    resize(601, 600);
    expect(sides()).toEqual({ start: false, end: false });
  });

  it('marks only the end while an overflowing table rests at its start', () => {
    mount();
    resize(900, 600);
    expect(sides()).toEqual({ start: false, end: true });
  });

  it('marks both sides in the middle of the scroll', () => {
    mount();
    resize(900, 600);
    scrollTo(150);
    expect(sides()).toEqual({ start: true, end: true });
  });

  it('marks only the start once scrolled to the end', () => {
    mount();
    resize(900, 600);
    scrollTo(300);
    expect(sides()).toEqual({ start: true, end: false });
  });

  it('clears both when the table comes to fit again', () => {
    mount();
    resize(900, 600, 150);
    expect(sides()).toEqual({ start: true, end: true });

    resize(600, 600);
    expect(sides()).toEqual({ start: false, end: false });
  });

  it('measures once per frame, however many scroll events arrive', () => {
    mount();
    resize(900, 600);
    const pending = frames.size;
    scroll().dispatchEvent(new Event('scroll'));
    scroll().dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(pending + 1);
  });

  // `scrollLeft` is 0 at the start and negative toward the end under RTL.
  it('reads the start and the end the other way round under RTL', () => {
    mount('rtl');
    resize(900, 600);
    expect(sides()).toEqual({ start: false, end: true });

    scrollTo(-150);
    expect(sides()).toEqual({ start: true, end: true });

    scrollTo(-300);
    expect(sides()).toEqual({ start: true, end: false });
  });

  it('measures nothing on a table without a pinned column', () => {
    mount();
    resize(900, 600);
    const watching = observer()!;

    fixture.componentInstance.columns.set(PLAIN);
    fixture.detectChanges();

    expect(watching.disconnected).toBe(true);
    expect(observer()).toBeUndefined();
    expect(sides()).toEqual({ start: false, end: false });
  });

  it('lets go of the observer, the listener and a pending frame on destroy', () => {
    mount();
    resize(900, 600);
    const el = scroll();
    const watching = observer()!;
    const remove = vi.spyOn(el, 'removeEventListener');
    // The framework schedules frames of its own, so the table's is told apart by id.
    const before = new Set(frames.keys());
    el.dispatchEvent(new Event('scroll'));
    const [frame] = [...frames.keys()].filter(id => !before.has(id));
    expect(frame).toBeDefined();

    fixture.destroy();

    expect(watching.disconnected).toBe(true);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(frames.has(frame)).toBe(false);

    const after = frames.size;
    el.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(after);
  });
});

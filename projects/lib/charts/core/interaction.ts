/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, ElementRef, type Signal, afterNextRender, afterRenderEffect, inject, signal } from '@angular/core';

const UNMEASURED: WrChartSize = { width: 0, height: 0 };

/** What each observed element reports to, on the one observer every chart shares. */
const listeners = new WeakMap<Element, (size: WrChartSize) => void>();

/** The marks {@link wrChartDim} lit last, per host, so the next call clears them without a scan. */
const litMarks = new WeakMap<Element, Element[]>();

let observer: ResizeObserver | null = null;

/** The constructor `observer` was built with: a page has one, a test suite swaps it. */
let observerType: typeof ResizeObserver | null = null;

/**
 * The box a chart measures, in px. Both are 0 until it is laid out.
 *
 * @internal
 */
export interface WrChartSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Reports `element`'s content box to `listener` whenever it changes, through ONE
 * `ResizeObserver` for every chart on the page. Returns the function that stops it.
 *
 * Seven charts each made an observer of their own, so a dashboard of forty tiles ran
 * forty. An observer is built to watch many targets and delivers them in one callback
 * per frame. One listener per element: observing an element again replaces its listener.
 * Where there is no `ResizeObserver` (a server, an old test environment) nothing is
 * observed and the returned function does nothing.
 *
 * @internal
 */
export function wrChartObserveSize(element: Element, listener: (size: WrChartSize) => void): () => void {
  if (typeof ResizeObserver === 'undefined') return () => undefined;
  if (!observer || observerType !== ResizeObserver) {
    observerType = ResizeObserver;
    observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        listeners.get(entry.target)?.({ width, height });
      }
    });
  }
  const shared = observer;
  listeners.set(element, listener);
  shared.observe(element);
  return () => {
    listeners.delete(element);
    shared.unobserve(element);
  };
}

/**
 * The size of the element `target` holds, as a signal that follows it: `0 × 0` until the
 * element is rendered and laid out, and again once it is gone. On the shared observer of
 * {@link wrChartObserveSize}. Call in an injection context.
 *
 * @internal
 */
export function useChartSize(target: Signal<ElementRef<Element> | Element | undefined>): Signal<WrChartSize> {
  const size = signal<WrChartSize>(UNMEASURED);
  let stop: (() => void) | null = null;
  let observed: Element | null = null;

  afterRenderEffect(() => {
    const held = target();
    const element = held instanceof ElementRef ? held.nativeElement : (held ?? null);
    if (element === observed) return;
    stop?.();
    observed = element;
    stop = null;
    if (!element) {
      size.set(UNMEASURED);
      return;
    }
    stop = wrChartObserveSize(element, next => {
      const current = size();
      if (current.width !== next.width || current.height !== next.height) size.set(next);
    });
  });
  inject(DestroyRef).onDestroy(() => stop?.());
  return size.asReadonly();
}

/**
 * What {@link useChartHover} tells a chart.
 *
 * @internal
 */
export interface WrChartHoverHandlers {
  /** The pointer is over the section whose `data-wr-index` is `index`. Not repeated while it stays there. */
  enter(index: number): void;
  /** The pointer left the sections: for the chart's box, or for a part of it that is no section. */
  leave(event: MouseEvent): void;
}

/**
 * Dims every mark of `host` but the ones of series `key`, or none for `null`: the chart
 * takes `wr-chart--dim` and the series' own marks `wr-chart-mark--on`, and the shared
 * stylesheet fades the rest to `--wr-chart-dim`. A mark is anything carrying
 * `data-wr-series`, a legend row included.
 *
 * Classes set by hand rather than bound: a binding on every mark is re-evaluated for
 * every mark on each hover change, and this touches the marks of two series.
 *
 * @internal
 */
export function wrChartDim(host: Element, key: string | null): void {
  for (const mark of litMarks.get(host) ?? []) mark.classList.remove('wr-chart-mark--on');
  host.classList.toggle('wr-chart--dim', key !== null);
  if (key === null) {
    litMarks.delete(host);
    return;
  }
  const marks = [...host.querySelectorAll(`[data-wr-series="${CSS.escape(key)}"]`)];
  for (const mark of marks) mark.classList.add('wr-chart-mark--on');
  litMarks.set(host, marks);
}

/**
 * A chart's hover, from ONE pair of listeners on its host however many sections it draws.
 *
 * A section is any element carrying `data-wr-index`: the listener finds the nearest one
 * above whatever the pointer is on and reports its index, once per section entered. A
 * listener pair on every bar was two per bar, and each one a change detection pass over
 * the whole chart for every bar the pointer crossed; these are native listeners, so a
 * move runs no pass at all unless the chart's own handler writes a signal.
 *
 * It also drives the shared hover-dim: the nearest element carrying `data-wr-series`
 * names the series under the pointer, and {@link wrChartDim} fades the rest. Legend rows
 * carry the attribute too, so hovering a row dims the chart the same way.
 *
 * Registered after the first render, in the browser only. Call in an injection context.
 *
 * @internal
 */
export function useChartHover(handlers: WrChartHoverHandlers): void {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  const destroyRef = inject(DestroyRef);
  let index: number | null = null;
  let series: string | null = null;

  const dim = (key: string | null): void => {
    if (key === series) return;
    series = key;
    wrChartDim(host, key);
  };

  const over = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const section = target?.closest('[data-wr-index]');
    const mark = target?.closest('[data-wr-series]');
    dim(mark && host.contains(mark) ? mark.getAttribute('data-wr-series') : null);

    const next = section && host.contains(section) ? Number(section.getAttribute('data-wr-index')) : null;
    if (next === index) return;
    index = next;
    if (next === null || !Number.isFinite(next)) handlers.leave(event);
    else handlers.enter(next);
  };

  const leave = (event: MouseEvent): void => {
    dim(null);
    if (index === null) return;
    index = null;
    handlers.leave(event);
  };

  afterNextRender(() => {
    host.addEventListener('mouseover', over);
    host.addEventListener('mouseleave', leave);
    destroyRef.onDestroy(() => {
      host.removeEventListener('mouseover', over);
      host.removeEventListener('mouseleave', leave);
    });
  });
}

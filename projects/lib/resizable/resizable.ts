/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { WrStorage } from 'ngwr/storage';
import { wrCheckStyles, wrClamp } from 'ngwr/utils';

import { wrBeginSeparatorDrag, wrEndSeparatorDrag, wrSeparatorKeyMove } from '../splitter/internal';

import type { WrResizableEdge, WrResizableLimit } from './types';

const PERCENT = /^(-?\d+(?:\.\d+)?)%$/;

/** A bound limit as pixels, a percentage, or `null` for none. Anything unreadable is no limit. */
function toLimit(value: unknown): WrResizableLimit | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (PERCENT.test(text)) return text as WrResizableLimit;
  const px = Number.parseFloat(text);
  return Number.isFinite(px) ? px : null;
}

/** A bound size in pixels, or `null` for unset. */
function toSize(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const px = Number(value);
  return Number.isFinite(px) ? px : null;
}

/** Namespaced key under `WrStorage`, which adds the app's own prefix. */
function storageKey(key: string): string {
  return `wr:resizable:${key}`;
}

/** The drag in progress: what it started from, and how to give the page back. */
interface Drag {
  /** The pointer's coordinate on the drag's axis at the press. */
  readonly origin: number;
  /** The element's size at the press. */
  readonly start: number;
  /** `1` when moving toward higher coordinates grows the element, `-1` when it shrinks it. */
  readonly sign: 1 | -1;
  /** Puts back the root's `user-select` and `cursor`. */
  readonly release: () => void;
}

/**
 * Lets one element be resized by dragging one of its edges. It writes the
 * element's own `width` (`start` / `end`) or `height` (`top` / `bottom`) in
 * pixels and touches nothing else, so the element can lie over other content.
 * To share space between two panes, use `wr-splitter`.
 *
 * The handle is an element the directive adds inside the host, over the edge.
 * It needs a positioning context: a host whose computed `position` is `static`
 * is given `position: relative`.
 *
 * @example
 * ```html
 * <aside wrResizable [(size)]="width" minSize="240" maxSize="60%" persistKey="side-panel">…</aside>
 *
 * <footer wrResizable edge="top" [collapsed]="!open()">…</footer>
 * ```
 *
 * @see https://ngwr.dev/reference/components/resizable
 */
@Directive({
  selector: '[wrResizable]',
  exportAs: 'wrResizable',
  host: {
    class: 'wr-resizable',
    '[class]': 'classes()',
    '[style.width.px]': 'axis() === "inline" ? shown() : null',
    '[style.height.px]': 'axis() === "block" ? shown() : null',
  },
})
export class WrResizable {
  /**
   * The edge that drags. `start` and `end` resize the width and mirror under
   * RTL; `top` and `bottom` resize the height.
   * @default 'end'
   */
  readonly edge = input<WrResizableEdge>('end');

  /**
   * The size in pixels. Two-way bindable. `null` means not set yet: the
   * element keeps the size its CSS gives it until the first resize.
   * `sizeChange` fires when a drag is released, on each key and on a reset,
   * never during a drag: bind `resizing` for that.
   * @default null
   */
  readonly size = model<number | null>(null);

  /**
   * Smallest size: pixels, or a percentage of the parent's matching dimension
   * (`'20%'`). `null` for none.
   * @default 0
   */
  readonly minSize = input<WrResizableLimit | null, unknown>(0, { transform: toLimit });

  /**
   * Largest size: pixels, or a percentage of the parent's matching dimension.
   * `null` for none.
   * @default '100%'
   */
  readonly maxSize = input<WrResizableLimit | null, unknown>('100%', { transform: toLimit });

  /**
   * The size Enter and a double click on the handle go back to. `null` goes
   * back to what the element started with: the `size` bound at creation, or its
   * CSS size when there was none.
   * @default null
   */
  readonly defaultSize = input<number | null, unknown>(null, { transform: toSize });

  /** Pixels an arrow key moves the edge. Shift moves it ten times as far. @default 10 */
  readonly step = input(10, { transform: (v: unknown): number => coerceNumberProperty(v, 10) });

  /**
   * Saves the size under this key through `WrStorage` (which adds the app's
   * prefix) when a resize ends, and restores it on creation.
   * @default null
   */
  readonly persistKey = input<string | null>(null);

  /**
   * Shrinks the element to zero and hides the handle. `size` is left alone, so
   * the element is back at its size when this turns off.
   * @default false
   */
  readonly collapsed = input(false, { transform: coerceBooleanProperty });

  /** Keeps the size and stops the handle. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Accessible name of the handle. A focusable `role="separator"` is an
   * interactive widget, so it needs one. Falls back to `resizable.handle`.
   * @default null
   */
  readonly resizeLabel = input<string | null>(null);

  /** The size in pixels on every move of a drag, before `sizeChange` settles it on release. */
  readonly resizing = output<number>();

  private readonly resolvedLabel = useI18nText(this.resizeLabel, 'resizable.handle', 'Resize');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(WrStorage);
  // Optional on purpose: `Directionality` is root-provided, so a consumer never has to
  // supply it, and a bare `TestBed` does not either.
  private readonly dir = inject(Directionality, { optional: true });

  /** The handle, once the browser has rendered the host. Never on the server. */
  private readonly handle = signal<HTMLElement | null>(null);
  /** The size a drag in progress has reached. The model takes it on release. */
  private readonly draft = signal<number | null>(null);
  /** The parent's inner size on the resize axis, which percentages are of. */
  private readonly parentExtent = signal<number | null>(null);
  /** The host's rendered size, for `aria-valuenow` while `size` is `null`. */
  private readonly measured = signal<number | null>(null);

  private drag: Drag | null = null;
  /** What a reset goes back to without `defaultSize`: the model as it was created. */
  private origin: number | null = null;
  private originRead = false;

  protected readonly axis = computed<'inline' | 'block'>(() =>
    this.edge() === 'start' || this.edge() === 'end' ? 'inline' : 'block'
  );

  private readonly min = computed(() => this.resolve(this.minSize()) ?? 0);
  private readonly max = computed(() => this.resolve(this.maxSize()) ?? Number.POSITIVE_INFINITY);

  /**
   * The size in force, clamped at the point of use and not in the model: a
   * percentage limit moves with the parent, and a window narrowed for a moment
   * must not cost the user the width they chose.
   */
  private readonly current = computed(() => {
    const size = this.draft() ?? this.size();
    return size === null ? null : this.clamp(size);
  });

  /** What the host's inline style carries: nothing until a size is set. */
  protected readonly shown = computed(() => (this.collapsed() ? 0 : this.current()));

  private readonly inactive = computed(() => this.disabled() || this.collapsed());

  protected readonly classes = computed(() => {
    const parts = [`wr-resizable--${this.edge()}`];
    if (this.collapsed()) parts.push('wr-resizable--collapsed');
    if (this.disabled()) parts.push('wr-resizable--disabled');
    if (this.draft() !== null) parts.push('wr-resizable--resizing');
    return parts.join(' ');
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('resizable');

    // Restore before the first paint of the size. The model as it was created is
    // read first: that, not the restored size, is what a reset goes back to.
    effect(() => {
      const key = this.persistKey();
      untracked(() => {
        if (!this.originRead) {
          this.originRead = true;
          this.origin = this.size();
        }
        if (!key) return;
        const saved = this.storage.get<unknown>(storageKey(key));
        if (typeof saved === 'number' && Number.isFinite(saved) && saved >= 0) this.size.set(saved);
      });
    });

    effect(() => this.syncHandle());

    // The other axis has another parent dimension and another rendered size.
    effect(() => {
      this.axis();
      if (this.handle()) untracked(() => this.remeasure());
    });

    afterNextRender(() => this.mount());

    this.destroyRef.onDestroy(() => {
      this.drag?.release();
      this.drag = null;
    });
  }

  // Handle

  /** Browser only: the handle, its listeners and the two size observers. */
  private mount(): void {
    const { host, renderer } = this;
    const view = this.doc.defaultView;
    // The handle is positioned against the host, so a static host would send it
    // to whichever ancestor is positioned. Any other position is left as it is.
    if (view?.getComputedStyle(host).position === 'static') renderer.setStyle(host, 'position', 'relative');

    const handle = renderer.createElement('div') as HTMLElement;
    renderer.addClass(handle, 'wr-resizable__handle');
    renderer.setAttribute(handle, 'role', 'separator');
    const grip = renderer.createElement('span') as HTMLElement;
    renderer.addClass(grip, 'wr-resizable__grip');
    renderer.setAttribute(grip, 'aria-hidden', 'true');
    renderer.appendChild(handle, grip);
    renderer.appendChild(host, handle);

    const stop = [
      renderer.listen(handle, 'pointerdown', (e: PointerEvent) => this.onPointerDown(e)),
      renderer.listen(handle, 'pointermove', (e: PointerEvent) => this.onPointerMove(e)),
      renderer.listen(handle, 'pointerup', (e: PointerEvent) => this.onPointerUp(e)),
      renderer.listen(handle, 'pointercancel', (e: PointerEvent) => this.onPointerUp(e)),
      // The capture can go without a `pointerup`: the handle leaves the DOM, the
      // browser takes the gesture, the window loses the pointer. The page must
      // not stay unselectable under a `col-resize` cursor.
      renderer.listen(handle, 'lostpointercapture', () => this.endDrag()),
      renderer.listen(handle, 'keydown', (e: KeyboardEvent) => this.onKeydown(e)),
      renderer.listen(handle, 'dblclick', () => this.onReset()),
    ];

    const parent = host.parentElement;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.remeasure());
    observer?.observe(host);
    if (parent) observer?.observe(parent);
    this.remeasure();

    this.handle.set(handle);
    this.destroyRef.onDestroy(() => {
      observer?.disconnect();
      for (const off of stop) off();
      renderer.removeChild(host, handle);
    });
  }

  /** Everything the handle says about itself, rewritten when a signal behind it moves. */
  private syncHandle(): void {
    const handle = this.handle();
    if (!handle) return;
    const inactive = this.inactive();
    const now = this.collapsed() ? 0 : (this.current() ?? this.measured());
    const max = this.max();
    this.attr(handle, 'aria-label', this.resolvedLabel());
    // The separator stands across the axis it moves along.
    this.attr(handle, 'aria-orientation', this.axis() === 'inline' ? 'vertical' : 'horizontal');
    this.attr(handle, 'aria-valuenow', now === null ? null : `${Math.round(now)}`);
    this.attr(handle, 'aria-valuemin', `${Math.round(this.min())}`);
    this.attr(handle, 'aria-valuemax', Number.isFinite(max) ? `${Math.round(max)}` : null);
    this.attr(handle, 'aria-disabled', inactive ? 'true' : null);
    this.attr(handle, 'tabindex', inactive ? '-1' : '0');
  }

  private attr(el: HTMLElement, name: string, value: string | null): void {
    if (value === null) this.renderer.removeAttribute(el, name);
    else this.renderer.setAttribute(el, name, value);
  }

  // Drag

  private onPointerDown(event: PointerEvent): void {
    if (this.inactive() || this.drag) return;
    if (!wrBeginSeparatorDrag(event)) return;
    this.measureParent();
    const inline = this.axis() === 'inline';
    this.drag = {
      origin: inline ? event.clientX : event.clientY,
      start: this.current() ?? this.measure(),
      sign: this.growSign(),
      release: this.lockPage(inline ? 'col-resize' : 'row-resize'),
    };
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    const travel = (this.axis() === 'inline' ? event.clientX : event.clientY) - drag.origin;
    // Whole pixels: the size reaches `aria-valuenow`, the model and storage.
    const next = Math.round(this.clamp(drag.start + drag.sign * travel));
    if (next === this.draft()) return;
    this.draft.set(next);
    this.resizing.emit(next);
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.drag) return;
    wrEndSeparatorDrag(event);
    this.endDrag();
  }

  /** Idempotent: releasing the capture fires `lostpointercapture`, which lands here again. */
  private endDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    drag.release();
    const size = this.draft();
    this.draft.set(null);
    // A press that never moved leaves the model alone, so a click on the handle
    // does not freeze a CSS size into pixels.
    if (size !== null) this.commit(size);
  }

  /**
   * No text selection and one cursor for the whole page while the drag runs,
   * on the root element so the rest of the time selection inside the element
   * works as usual. Returns the undo, which puts back what was inline before.
   */
  private lockPage(cursor: string): () => void {
    const style = this.doc.documentElement.style;
    const before = ['user-select', '-webkit-user-select', 'cursor'].map(
      name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)] as const
    );
    style.setProperty('user-select', 'none');
    style.setProperty('-webkit-user-select', 'none');
    style.setProperty('cursor', cursor);
    return () => {
      for (const [name, value, priority] of before) {
        if (value) style.setProperty(name, value, priority);
        else style.removeProperty(name);
      }
    };
  }

  // Keyboard

  private onKeydown(event: KeyboardEvent): void {
    if (this.inactive()) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onReset();
      return;
    }
    const move = wrSeparatorKeyMove(event, this.axis(), this.isRtl());
    if (move === null) return;
    event.preventDefault();
    this.measureParent();
    let next: number;
    if (move === 'min') next = this.min();
    else if (move === 'max') next = this.max();
    else {
      // `move` is a step along the axis, toward higher coordinates when positive;
      // the `start` and `top` edges grow the element the other way.
      const grow = this.edge() === 'end' || this.edge() === 'bottom' ? move : -move;
      next = (this.current() ?? this.measure()) + grow * this.step() * (event.shiftKey ? 10 : 1);
    }
    // End with no maximum has nowhere to go.
    if (Number.isFinite(next)) this.commit(Math.round(this.clamp(next)));
  }

  private onReset(): void {
    if (this.inactive()) return;
    this.measureParent();
    const target = this.defaultSize() ?? this.origin;
    this.commit(target === null ? null : Math.round(this.clamp(target)));
  }

  // State

  /** A size the user settled on: into the model, and into storage when there is a key. */
  private commit(size: number | null): void {
    this.size.set(size);
    const key = this.persistKey();
    if (!key) return;
    if (size === null) this.storage.remove(storageKey(key));
    else this.storage.set(storageKey(key), size);
  }

  private clamp(size: number): number {
    return wrClamp(size, this.min(), this.max());
  }

  private resolve(limit: WrResizableLimit | null): number | null {
    if (limit === null || typeof limit === 'number') return limit;
    const extent = this.parentExtent();
    // A parent that cannot be measured (not rendered yet, `display: contents`)
    // limits nothing, rather than clamping the element to zero.
    return extent ? (extent * Number.parseFloat(limit)) / 100 : null;
  }

  /**
   * `1` when dragging toward higher coordinates grows the element. Read per
   * gesture rather than cached, like the splitter: nothing rendered depends on
   * the direction, since the handle sits on a logical edge.
   */
  private growSign(): 1 | -1 {
    switch (this.edge()) {
      case 'end':
        return this.isRtl() ? -1 : 1;
      case 'start':
        return this.isRtl() ? 1 : -1;
      case 'top':
        return -1;
      case 'bottom':
        return 1;
    }
  }

  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }

  /**
   * The host's size as its `width` / `height` property means it, so writing the
   * number back changes nothing whatever the `box-sizing`. The computed value
   * is that; the rect is the fallback where there is no computed size.
   */
  private measure(): number {
    const inline = this.axis() === 'inline';
    const style = this.doc.defaultView?.getComputedStyle(this.host);
    const computedSize = Number.parseFloat((inline ? style?.width : style?.height) ?? '');
    if (Number.isFinite(computedSize)) return computedSize;
    const rect = this.host.getBoundingClientRect();
    return inline ? rect.width : rect.height;
  }

  private remeasure(): void {
    this.measureParent();
    this.measured.set(this.measure());
  }

  private measureParent(): void {
    const parent = this.host.parentElement;
    if (!parent) return;
    this.parentExtent.set(this.axis() === 'inline' ? parent.clientWidth : parent.clientHeight);
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  DestroyRef,
  Directive,
  ElementRef,
  type Signal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import type { WrScrollOptions } from './types';
import { WrScroll } from './wr-scroll';

/** A row the view is held to, and where its top edge sat under the container's. */
interface Anchor {
  readonly node: Element;
  readonly offset: number;
}

/** A wrapper around the rows is looked through this many levels deep. */
const WRAPPER_DEPTH = 3;

/**
 * Keeps a scroll container at its end while content grows, and holds the
 * reader's place while they are somewhere else.
 *
 * The container starts at its end and stays there as rows are added, as a row
 * grows (streamed text, an image that loads) and as the container is resized.
 * Scrolling up stops the following at once; scrolling back to within
 * `wrScrollFollowThreshold` of the end resumes it. While it is not following,
 * the lowest row in view keeps its place when content above it changes, so
 * older rows loaded at the top do not push the page down.
 *
 * `following` says which of the two it is doing, for a "jump to latest" button,
 * and `toEnd()` is what that button calls.
 *
 * The rows are the container's children, or the children of its only child.
 * The container scrolls vertically in the normal direction: RTL changes
 * nothing, and a `column-reverse` container is not supported. Nothing runs on
 * the server.
 *
 * @example
 * ```html
 * <div class="log" wrScrollFollow #log="wrScrollFollow">
 *   @for (message of messages(); track message.id) {
 *     <p>{{ message.text }}</p>
 *   }
 * </div>
 * @if (!log.following()) {
 *   <button type="button" (click)="log.toEnd()">Jump to latest</button>
 * }
 * ```
 *
 * @see https://ngwr.dev/reference/services/scroll
 */
@Directive({
  selector: '[wrScrollFollow]',
  exportAs: 'wrScrollFollow',
  host: {
    // The browser's own scroll anchoring would move the view a second time.
    '[style.overflow-anchor]': 'wrScrollFollow() ? "none" : null',
  },
})
export class WrScrollFollow {
  /** `false` switches it off and hands scroll anchoring back to the browser. Bare `wrScrollFollow` is on. */
  readonly wrScrollFollow = input(true, { transform: coerceBooleanProperty });

  /** How close to the end, in pixels, the reader has to scroll back for the following to resume. */
  readonly wrScrollFollowThreshold = input(80, {
    transform: (value: unknown) => Math.max(0, coerceNumberProperty(value, 80)),
  });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scroll = inject(WrScroll);

  private readonly atEnd = signal(true);

  /** Whether the container is held at its end. `false` once the reader scrolls up, and while switched off. */
  readonly following: Signal<boolean> = computed(() => this.wrScrollFollow() && this.atEnd());

  private started = false;
  private lastTop = 0;
  private anchors: Anchor[] = [];
  /** `scrollTop` when `anchors` was measured, so a scroll since then is not undone. */
  private anchorsTop = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const host = this.el.nativeElement;
      const onScroll = (): void => this.onScroll();
      const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.sync());
      const mutation = new MutationObserver(records => {
        for (const record of records) {
          if (record.target !== host) continue;
          for (const node of record.addedNodes) if (node instanceof Element) resize?.observe(node);
          for (const node of record.removedNodes) if (node instanceof Element) resize?.unobserve(node);
        }
        this.sync();
      });

      host.addEventListener('scroll', onScroll, { passive: true });
      // The host for its own height, its children for growth no mutation reports (an image, a font).
      resize?.observe(host);
      for (const child of host.children) resize?.observe(child);
      mutation.observe(host, { childList: true, characterData: true, subtree: true });

      this.started = true;
      this.sync();

      destroyRef.onDestroy(() => {
        host.removeEventListener('scroll', onScroll);
        resize?.disconnect();
        mutation.disconnect();
      });
    });

    effect(() => {
      const on = this.wrScrollFollow();
      if (!this.started) return;
      untracked(() => {
        if (on) this.atEnd.set(this.distance() <= this.wrScrollFollowThreshold());
        this.sync();
      });
    });
  }

  /**
   * Scroll to the end and follow again. Smooth unless `smooth` is `false` or
   * the reader prefers reduced motion.
   */
  toEnd(options: Pick<WrScrollOptions, 'smooth'> = {}): void {
    if (!this.started) return;
    const host = this.el.nativeElement;
    this.atEnd.set(true);
    this.anchors = [];
    this.scroll.to({ top: host.scrollHeight }, { ...options, container: host });
  }

  private distance(): number {
    const host = this.el.nativeElement;
    return host.scrollHeight - host.scrollTop - host.clientHeight;
  }

  private onScroll(): void {
    this.read(true);
    if (this.following()) this.anchors = [];
    else if (this.wrScrollFollow()) this.capture();
  }

  /**
   * Any move up stops the following, so a reader can leave while text streams
   * in; within a pixel of the end it is the browser clamping to shorter content.
   * Only a move down resumes it: the directive's own writes are never read as one.
   */
  private read(scrolled: boolean): void {
    const top = this.el.nativeElement.scrollTop;
    const distance = this.distance();

    if (top < this.lastTop && distance > 1) this.atEnd.set(false);
    else if (scrolled && top > this.lastTop && distance <= this.wrScrollFollowThreshold()) this.atEnd.set(true);

    this.lastTop = top;
  }

  /** Content or the container changed size: hold the end, or hold the reader's place. */
  private sync(): void {
    const host = this.el.nativeElement;
    // A scroll whose event is still on its way must not be pinned over.
    this.read(false);

    if (!this.wrScrollFollow()) {
      this.anchors = [];
      return;
    }

    if (this.atEnd()) {
      this.move(host.scrollHeight);
      this.anchors = [];
    } else {
      this.restore();
      this.capture();
    }
    this.lastTop = host.scrollTop;
  }

  /** Instant whatever `scroll-behavior` the container has: an animated correction is a visible jump. */
  private move(top: number): void {
    this.el.nativeElement.scrollTo({ top, behavior: 'instant' });
  }

  /** Remember the lowest row in view. A row at the top would be the "load older" button. */
  private capture(): void {
    const host = this.el.nativeElement;
    const box = host.getBoundingClientRect();
    const anchors: Anchor[] = [];

    let parent: Element = host;
    for (let depth = 0; depth < WRAPPER_DEPTH; depth++) {
      let found: Anchor | null = null;
      let boxes = 0;
      for (let child = parent.lastElementChild; child; child = child.previousElementSibling) {
        const rect = child.getBoundingClientRect();
        // `display: none` and `display: contents` have no box to hold on to.
        if (!rect.width && !rect.height) continue;
        boxes++;
        if (!found && rect.top < box.bottom) found = { node: child, offset: rect.top - box.top };
        if (found && boxes > 1) break;
      }
      if (!found) break;
      anchors.push(found);
      // An only child is a wrapper, and its top does not move when rows are added inside it.
      if (boxes > 1) break;
      parent = found.node;
    }

    this.anchors = anchors;
    this.anchorsTop = host.scrollTop;
  }

  /** Put the remembered row back where it was. */
  private restore(): void {
    const host = this.el.nativeElement;
    const scrolledSince = host.scrollTop - this.anchorsTop;

    for (let i = this.anchors.length - 1; i >= 0; i--) {
      const { node, offset } = this.anchors[i];
      if (!host.contains(node)) continue;
      const rect = node.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;

      const delta = rect.top - host.getBoundingClientRect().top - (offset - scrolledSince);
      if (Math.abs(delta) >= 1) this.move(host.scrollTop + delta);
      return;
    }
  }
}

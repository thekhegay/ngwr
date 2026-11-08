import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Pause, Play } from 'lucide';
import { WrButton } from 'ngwr/button';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

/** How fast the row travels when `speed` is not set, in px per second. */
const TICKER_SPEED = 40;

/** One entry of the row: the text it shows and the route it opens. */
export interface TickerItem {
  readonly title: string;
  readonly url: string;
}

/**
 * A row of links that glides sideways in an endless loop, each item entering
 * under a soft fade at one end and leaving under the other.
 *
 * The loop is one CSS animation on a belt that holds the list twice, moving
 * by exactly the measured width of one copy, so the frame the cycle ends on
 * is the frame it began on and the seam never shows. The width is read once
 * the browser has laid the row out, again when its size changes (a font that
 * finishes loading, a resize) and the duration is that width over `speed`,
 * so the row moves at the same px per second whatever is in it. Nothing but
 * `translate` animates, declared paused and set running by one modifier, so a
 * pause keeps the phase: the row picks up where it stopped. It stops off
 * screen, while the document is hidden, under the pointer, while focus is in
 * it, and on the pause button at its end (WCAG 2.2.2).
 *
 * A keyboard user who tabs into a link gets a still row: while focus is in
 * the belt the animation is off and the viewport scrolls natively, and the
 * link is brought into view, so what has focus is what can be seen. Leaving
 * resumes the loop. Under `prefers-reduced-motion: reduce` the row never
 * moves: one copy, scrollable, with the fade. The second copy is
 * presentational, `aria-hidden` and `inert`, so a screen reader hears the list
 * once, as a list of links named by `label`. The server renders that one
 * copy as a still row; the loop starts from the same picture, so nothing
 * shifts. Styles: `ticker.scss`, loaded by `styles.scss`.
 */
@Component({
  selector: 'ngwr-ticker',
  templateUrl: './ticker.html',
  imports: [RouterLink, WrButton],
  providers: [provideWrIcons(lucideIcons({ pause: Pause, play: Play }))],
  host: {
    class: 'ngwr-ticker',
    '[class.ngwr-ticker--loop]': 'looping()',
    '[class.ngwr-ticker--run]': 'running()',
    '[class.ngwr-ticker--static]': 'still()',
    '(pointerenter)': 'hovered.set(true)',
    '(pointerleave)': 'hovered.set(false)',
    '(focusin)': 'focused.set(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class Ticker {
  /** The links, in the order they pass. */
  readonly items = input.required<readonly TickerItem[]>();

  /** How fast the row travels, in px per second. @default 40 */
  readonly speed = input(TICKER_SPEED, { transform: numAttr(TICKER_SPEED) });

  /** The accessible name of the list. */
  readonly label = input<string | null>(null);

  /** The pause button's name while the row moves. @default 'Pause' */
  readonly pauseLabel = input('Pause');

  /** The pause button's name while the row stands. @default 'Play' */
  readonly playLabel = input('Play');

  /** The reader pressed pause. */
  protected readonly paused = signal(false);

  /** Focus is on a link in the belt: the row is still and scrolls natively. */
  protected readonly still = signal(false);

  /** The width of one copy of the list, in px, or `null` until measured. */
  protected readonly width = signal<number | null>(null);

  /** One copy's width as a length, for the belt's keyframe. */
  protected readonly shift = computed(() => {
    const width = this.width();
    return width === null ? null : `${width}px`;
  });

  /** One cycle, so the row moves `speed` px every second. */
  protected readonly duration = computed(() => {
    const width = this.width();
    const speed = this.speed();
    return width === null || speed <= 0 ? null : `${width / speed}s`;
  });

  /** The second copy is in the DOM and the animation is declared. */
  protected readonly looping = computed(() => this.ready() && !this.platform.prefersReducedMotion());

  /** One place decides whether the belt moves. */
  protected readonly running = computed(
    () =>
      this.looping() &&
      this.intersecting() &&
      this.platform.pageVisible() &&
      !this.hovered() &&
      !this.focused() &&
      !this.paused()
  );

  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);
  private readonly intersecting = signal(false);
  /** `afterNextRender` ran in a browser that can loop. */
  private readonly ready = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private viewObserver: IntersectionObserver | null = null;
  private sizeObserver: ResizeObserver | null = null;
  private listeners: AbortController | null = null;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      if (this.platform.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;

      // Any part of the row on screen counts: a loop should not burn paint off
      // screen, and should not wait for the whole row to show either.
      this.viewObserver = new IntersectionObserver(entries =>
        this.intersecting.set(entries[entries.length - 1]?.isIntersecting ?? false)
      );
      this.viewObserver.observe(this.host.nativeElement);
      this.listen();
      this.ready.set(true);
    });

    inject(DestroyRef).onDestroy(() => {
      this.viewObserver?.disconnect();
      this.viewObserver = null;
      this.sizeObserver?.disconnect();
      this.sizeObserver = null;
      this.listeners?.abort();
      this.listeners = null;
    });
  }

  protected toggle(): void {
    this.paused.update(paused => !paused);
  }

  /** Focus left the host altogether: a move from a link to the button keeps the pause. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    this.focused.set(false);
  }

  /**
   * A link took focus: the belt stands still and the viewport scrolls, and
   * once that state is painted the link is scrolled into view. The scroll
   * waits for the render, because the viewport is still `overflow: hidden`
   * and the belt still translated when the event fires.
   */
  protected onTrackFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    this.still.set(true);
    afterNextRender(() => target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }), {
      injector: this.injector,
    });
  }

  /** Focus left the belt: back to the loop, from the start of the row, not from wherever the viewport was scrolled to. */
  protected onTrackFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) return;
    this.still.set(false);
    (event.currentTarget as HTMLElement).scrollLeft = 0;
  }

  /**
   * The width of one copy, read from the first track, which never moves within
   * the belt. A `ResizeObserver` on it reports the first layout, a font that
   * finishes loading and anything else that changes its size; without one,
   * one read now and another on resize and when the fonts are ready.
   */
  private listen(): void {
    const track = this.host.nativeElement.querySelector<HTMLElement>('.ngwr-ticker__track');
    if (!track) return;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal, passive: true };
    if (typeof ResizeObserver !== 'undefined') {
      this.sizeObserver = new ResizeObserver(() => this.measure(track));
      this.sizeObserver.observe(track);
    } else {
      this.measure(track);
      this.doc.defaultView?.addEventListener('resize', () => this.measure(track), options);
    }
    const fonts = this.doc.fonts;
    if (fonts) {
      fonts.addEventListener('loadingdone', () => this.measure(track), options);
      void fonts.ready.then(() => {
        if (this.listeners) this.measure(track);
      });
    }
  }

  private measure(track: HTMLElement): void {
    const width = track.getBoundingClientRect().width;
    this.width.set(width > 0 ? width : null);
  }
}

export { TICKER_SPEED };

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { WrHaptics } from 'ngwr/platform';
import { WrSpinner } from 'ngwr/spinner';
import { numAttr } from 'ngwr/utils';

/**
 * Pull-to-refresh wrapper. Make its own content scrollable (give it a height /
 * `max-height`), and when the user drags down from the very top past
 * `threshold` and lets go, `refresh` fires.
 *
 * It is a **controlled** spinner: bind `refreshing` — set it `true` in your
 * `refresh` handler and `false` once the async work settles, and the indicator
 * holds open until then. Setting `refreshing` `true` yourself (without a pull)
 * shows the spinner too, so it doubles as a programmatic "reloading" state.
 *
 * Touch-only by design (the gesture is meaningless with a mouse); it lives
 * beside native scrolling — a pull only starts at `scrollTop === 0`, otherwise
 * the list scrolls as usual. Fires a light {@link WrHaptics} tap when the pull
 * arms. `overscroll-behavior` stops the browser's own pull-to-refresh from
 * fighting it.
 *
 * @example
 * ```html
 * <wr-pull-to-refresh style="height: 20rem" [refreshing]="loading()" (refresh)="reload()">
 *   @for (item of items(); track item.id) {
 *     <div class="row">{{ item.label }}</div>
 *   }
 * </wr-pull-to-refresh>
 * ```
 * ```ts
 * reload(): void {
 *   this.loading.set(true);
 *   this.api.fetch().subscribe((rows) => {
 *     this.items.set(rows);
 *     this.loading.set(false);   // closes the indicator
 *   });
 * }
 * ```
 *
 * @see https://ngwr.dev/reference/components/pull-to-refresh
 */
@Component({
  selector: 'wr-pull-to-refresh',
  templateUrl: './pull-to-refresh.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-pull-to-refresh',
    '[class.wr-pull-to-refresh--animating]': '!dragging()',
    '(touchstart)': 'onTouchStart($event)',
    '(touchmove)': 'onTouchMove($event)',
    '(touchend)': 'onTouchEnd()',
    '(touchcancel)': 'onTouchEnd()',
  },
  imports: [WrSpinner],
})
export class WrPullToRefresh {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly haptics = inject(WrHaptics);

  /**
   * Whether the refresh is in flight — drives the spinner. Set `true` in your
   * `refresh` handler and `false` when the work resolves. @default false
   */
  readonly refreshing = input(false, { transform: coerceBooleanProperty });

  /** Disable the gesture entirely. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Distance (px) the pull must reach for a release to trigger `refresh`. @default 64 */
  readonly threshold = input(64, { transform: numAttr(64) });

  /** Fires once each time the user pulls past `threshold` and releases. */
  readonly refresh = output<void>();

  protected readonly distance = signal(0);
  protected readonly dragging = signal(false);

  protected readonly thresholdPx = computed(() => Math.max(24, this.threshold()));
  protected readonly armed = computed(() => this.distance() >= this.thresholdPx());
  protected readonly progress = computed(() => Math.min(1, this.distance() / this.thresholdPx()));
  protected readonly contentTransform = computed(() =>
    this.distance() > 0 ? `translateY(${this.distance()}px)` : null
  );

  private startY = 0;
  private canPull = false;

  constructor() {
    // Resting height is DERIVED from `refreshing`, not latched on an edge: held
    // open at the threshold while a refresh is in flight (including a purely
    // programmatic `refreshing = true`), closed otherwise. An active drag owns
    // `distance` directly, so the effect yields while `dragging`. Deriving from
    // the current value — rather than waiting to observe a true -> false
    // transition — means a synchronous refresh (one that never keeps
    // `refreshing` truthy for a change-detection cycle) still settles closed
    // instead of sticking open.
    effect(() => {
      const refreshing = this.refreshing();
      const dragging = this.dragging();
      if (dragging) return;
      untracked(() => this.distance.set(refreshing ? this.thresholdPx() : 0));
    });
  }

  protected onTouchStart(event: TouchEvent): void {
    if (this.disabled() || this.refreshing()) return;
    const touch = event.touches[0];
    if (!touch) return;
    // A pull only begins when the scroller is already at the top.
    this.canPull = this.el.nativeElement.scrollTop <= 0;
    this.startY = touch.clientY;
  }

  protected onTouchMove(event: TouchEvent): void {
    // Turned off or a refresh started mid-gesture: abort the drag and let the
    // effect settle the indicator (otherwise the drag is left frozen).
    if (this.disabled() || this.refreshing()) {
      if (this.dragging()) this.dragging.set(false);
      this.canPull = false;
      return;
    }
    if (!this.canPull) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dy = touch.clientY - this.startY;
    // Pulling up, or the content has scrolled off the top — hand back to
    // native scrolling and drop any partial pull.
    if (dy <= 0 || this.el.nativeElement.scrollTop > 0) {
      if (this.dragging()) this.dragging.set(false);
      this.distance.set(0);
      this.canPull = this.el.nativeElement.scrollTop <= 0;
      return;
    }
    // Actively pulling down at the top: take over from native scroll.
    event.preventDefault();
    const wasArmed = this.armed();
    this.dragging.set(true);
    // Halve the finger travel for a rubber-band feel, capped past threshold.
    this.distance.set(Math.min(dy * 0.5, this.thresholdPx() * 1.75));
    // A light tap the instant the pull arms, so it's felt without looking.
    if (!wasArmed && this.armed()) this.haptics.impact('light');
  }

  protected onTouchEnd(): void {
    if (!this.dragging()) return;
    // Capture the arm state before releasing — `distance` still holds the pull.
    const armed = this.armed();
    this.dragging.set(false);
    this.canPull = false;
    // Only a genuine armed release on an enabled, idle control refreshes.
    // Either way the effect settles `distance` (open iff `refreshing`).
    if (armed && !this.disabled() && !this.refreshing()) {
      this.refresh.emit();
    }
  }
}

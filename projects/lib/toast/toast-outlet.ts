/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, effect, inject, input, untracked, viewChild } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { WrToastChannels } from './toast-channel';
import { WrToastHost } from './toast-host';
import { WR_TOAST_CONFIG } from './tokens';
import type { WrToastConfig, WrToastMode, WrToastPosition } from './types';

/**
 * Renders a toast stack inside the page instead of the browser's top layer.
 *
 * `WrToast.show({ outlet: 'alarms' })` sends a toast to the outlet of that
 * name. Each name is a stack of its own: its cap, its countdown hold, its
 * "Close all". The global stack is not affected.
 *
 * The outlet fills its nearest positioned ancestor, so give the container
 * `position: relative`. It lets clicks through wherever no toast is, and it
 * carries no `z-index`: order it against its siblings in your own CSS.
 *
 * Past `maxStack` the OLDEST toast is dropped, where the global stack queues
 * the newest, so a busy stream stays at `maxStack` toasts and timers. While
 * the pointer or focus is in the stack nothing shown is dropped: arrivals
 * wait, at most `maxStack` of them, and enter when it leaves. A toast
 * sent while no outlet of the name is in the page waits, without counting
 * down, and shows when the outlet appears.
 *
 * @example
 * ```html
 * <div class="map" style="position: relative">
 *   <wr-toast-outlet name="alarms" position="top" [maxStack]="10" />
 * </div>
 * ```
 *
 * ```ts
 * toast.show({ type: 'danger', message: 'Door forced', outlet: 'alarms' });
 * toast.dismissAll('alarms');
 * ```
 *
 * @see https://ngwr.dev/reference/components/toast
 */
@Component({
  selector: 'wr-toast-outlet',
  templateUrl: './toast-outlet.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-toast-outlet',
    '[attr.name]': 'name()',
  },
  imports: [WrToastHost],
})
export class WrToastOutlet {
  private readonly config = inject(WR_TOAST_CONFIG);
  private readonly channels = inject(WrToastChannels);

  /** The channel this outlet renders: the `outlet` of `WrToast.show()`. */
  readonly name = input.required<string>();
  /** Where the stack sits inside the outlet's box. @default the `withToast()` position */
  readonly position = input<WrToastPosition>(this.config.position);
  /** Layout for several toasts: a cascade or a column. @default the `withToast()` mode */
  readonly mode = input<WrToastMode>(this.config.mode);
  /** Auto-dismiss in ms for a toast that sets none; `0` disables. @default the `withToast()` duration */
  readonly duration = input<number>(this.config.duration);
  /** Render the countdown bar. @default the `withToast()` value */
  readonly showProgress = input<boolean>(this.config.showProgress);
  /** Render a copy button on each toast. @default the `withToast()` value */
  readonly showCopy = input<boolean>(this.config.showCopy);
  /** Render "Close all" once the stack reaches the threshold. @default the `withToast()` value */
  readonly showCloseAll = input<boolean>(this.config.showCloseAll);
  /** Minimum stack size before "Close all" appears. @default the `withToast()` value */
  readonly closeAllThreshold = input<number>(this.config.closeAllThreshold);
  /**
   * Maximum toasts in the stack; `0` is unlimited. Past it the oldest toast is
   * dropped to make room, once the pointer and focus are out of the stack.
   *
   * @default the `withToast()` value
   */
  readonly maxStack = input<number>(this.config.maxStack);

  protected readonly channel = computed(() => this.channels.get(this.name()));

  /** The app-wide config with this outlet's own inputs over it. */
  protected readonly resolved = computed<WrToastConfig>(() => ({
    ...this.config,
    position: this.position(),
    mode: this.mode(),
    duration: this.duration(),
    showProgress: this.showProgress(),
    showCopy: this.showCopy(),
    showCloseAll: this.showCloseAll(),
    closeAllThreshold: this.closeAllThreshold(),
    maxStack: this.maxStack(),
  }));

  private readonly host = viewChild(WrToastHost);

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('toast');

    effect(() => this.channel().configure(this.maxStack(), this.duration()));

    effect(onCleanup => {
      const channel = this.channel();
      // `mount()` reads the stack; tracked, every toast would remount the
      // channel and drop its hold.
      if (untracked(() => channel.mount()) > 1 && (typeof ngDevMode === 'undefined' || ngDevMode)) {
        // eslint-disable-next-line no-console -- dev-mode misconfiguration diagnostic
        console.warn(
          `[NGWR] Two <wr-toast-outlet> share the name "${this.name()}", so both render the same toasts. ` +
            'Give each outlet its own name.'
        );
      }
      onCleanup(() => channel.unmount());
    });

    effect(() => this.push());
  }

  /** @internal */
  protected onDismissed(id: number): void {
    this.channel().remove(id);
    this.push();
  }

  /** @internal Closes first, like the global stack: `run` cannot fire twice. */
  protected onAction(id: number): void {
    const channel = this.channel();
    const action = channel.find(id)?.action;
    if (!action) return;
    channel.remove(id);
    this.push();
    action.run();
  }

  /** @internal */
  protected onDismissAll(): void {
    this.channel().clear();
    this.push();
  }

  /**
   * The host reads its list right after it asks for a removal, to decide where
   * focus goes, so a removal it asked for is pushed at once and not on the next
   * render.
   */
  private push(): void {
    this.host()?.toasts.set(this.channel().toasts());
  }
}

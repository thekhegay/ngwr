/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WrWindowManager } from './services/window-manager';
import type { WrWindowRef } from './window-ref';

/**
 * OS-style window taskbar. Drop one anywhere in the app — typically
 * fixed to the bottom of the viewport — and it lists every window
 * `WrWindowManager.open()` has handed out that's currently
 * `minimized`. Clicking a tab restores the window; clicking the close
 * glyph dismisses it without restoring.
 *
 * Windows opted out via `config.taskbar = false` never show up here.
 *
 * @example
 * ```html
 * <wr-window-taskbar />
 * <wr-window-taskbar position="top" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/window
 */
@Component({
  selector: 'wr-window-taskbar',
  templateUrl: './window-taskbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'toolbar', 'aria-label': 'Minimized windows' },
})
export class WrWindowTaskbar {
  /** Edge the taskbar pins itself to. @default 'bottom' */
  readonly position = input<'top' | 'bottom'>('bottom');

  private readonly manager = inject(WrWindowManager);

  /** @internal — minimized windows that haven't opted out via `taskbar: false`. */
  protected readonly items = computed(() => this.manager.minimized());

  protected readonly classes = computed(() => `wr-window-taskbar wr-window-taskbar--${this.position()}`);

  protected restore(ref: WrWindowRef<unknown, unknown>): void {
    ref.restore();
    ref.focus();
  }

  protected close(ref: WrWindowRef<unknown, unknown>, event: Event): void {
    event.stopPropagation();
    void ref.close();
  }
}

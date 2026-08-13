/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';

import { WrWindowManager } from './services/window-manager';
import type { WrWindowRef } from './window-ref';

/**
 * Stands in for the consumer input `useI18nText` expects — the taskbar exposes no
 * label inputs. Read reactively rather than once at construction: the rail is as
 * long-lived as the app, so a catalog that arrives later, or a locale switch, has to
 * reach it.
 */
const NO_OVERRIDE = signal<string | null>(null).asReadonly();

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
 * @see https://ngwr.dev/reference/components/window
 */
@Component({
  selector: 'wr-window-taskbar',
  templateUrl: './window-taskbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'toolbar', '[attr.aria-label]': 'railLabel()' },
})
export class WrWindowTaskbar {
  // Four English literals lived in this component's markup, next to a catalog that
  // already carried `window.close`. A `toolbar` with no name and tabs announced in
  // the wrong language are both invisible on screen.
  /** @internal */ protected readonly railLabel = useI18nText(NO_OVERRIDE, 'window.taskbar', 'Minimized windows');
  /** @internal */ protected readonly closeLabel = useI18nText(NO_OVERRIDE, 'window.closeWindow', 'Close window');
  /** @internal */ protected readonly untitled = useI18nText(NO_OVERRIDE, 'window.untitled', 'Untitled');
  /** @internal */ protected readonly restoreLabel = useI18nFormatter('window.restoreWindow', 'Restore {{title}}');

  /** Edge the taskbar pins itself to. @default 'bottom' */
  readonly position = input<'top' | 'bottom'>('bottom');

  private readonly manager = inject(WrWindowManager);

  /** @internal — minimized windows that haven't opted out via `taskbar: false`. */
  protected readonly items = computed(() => this.manager.minimized());

  protected readonly classes = computed(() => `wr-window-taskbar wr-window-taskbar--${this.position()}`);

  /** A window with no title still needs a name in the rail. */
  protected tabTitle(ref: WrWindowRef<unknown, unknown>): string {
    return ref.title() || this.untitled();
  }

  protected restore(ref: WrWindowRef<unknown, unknown>): void {
    ref.restore();
    ref.focus();
  }

  protected close(ref: WrWindowRef<unknown, unknown>, event: Event): void {
    event.stopPropagation();
    void ref.close();
  }
}

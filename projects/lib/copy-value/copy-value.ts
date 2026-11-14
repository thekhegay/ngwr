/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, DestroyRef, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';

import { WR_COPIED_DURATION, WrClipboard } from 'ngwr/clipboard';
import { useI18nText } from 'ngwr/i18n';
import { WrPopover } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * A short value with a copy button beside it: an id, a serial number, an
 * address, a name in a table cell.
 *
 * The value truncates on one line and keeps the whole text in its `title`;
 * `wrap` lets it run over several lines instead. `null`, `undefined` and `''`
 * are empty: the component shows `emptyLabel` and no button. `0` is a value.
 *
 * The write goes through `WrClipboard`, so it also works on a plain `http://`
 * origin. After it succeeds the button shows a tick and the "Copied" text is
 * announced politely; a refused write changes nothing and emits `copyFailed`.
 *
 * @example
 * ```html
 * <wr-copy-value [value]="order.id" />
 * <wr-copy-value [value]="user.fullName" wrap (copied)="track($event)" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/copy-value
 */
@Component({
  selector: 'wr-copy-value',
  imports: [WrPopover],
  templateUrl: './copy-value.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-copy-value', '[class]': 'classes()' },
})
export class WrCopyValue {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('copy-value');
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clearTimer();
    });
  }

  /**
   * The value shown and copied. `null`, `undefined` and `''` are empty.
   *
   * @default null
   */
  readonly value = input<string | number | null | undefined>(null);

  /**
   * Let a long value wrap over several lines instead of truncating it.
   *
   * @default false
   */
  readonly wrap = input(false, { transform: coerceBooleanProperty });

  /** Accessible name and tooltip of the button. Falls back to `copyValue.copy`, then `'Copy'`. */
  readonly copyLabel = input<string | null>(null);

  /** Tooltip and announcement after a copy. Falls back to `copyValue.copied`, then `'Copied'`. */
  readonly copiedLabel = input<string | null>(null);

  /** What stands in for an empty value. Falls back to `copyValue.empty`, then `'-'`. */
  readonly emptyLabel = input<string | null>(null);

  /** Emitted with the text that reached the clipboard. */
  readonly copied = output<string>();

  /** Emitted when the browser refused the write. */
  readonly copyFailed = output<void>();

  protected readonly resolvedCopyLabel = useI18nText(this.copyLabel, 'copyValue.copy', 'Copy');
  protected readonly resolvedCopiedLabel = useI18nText(this.copiedLabel, 'copyValue.copied', 'Copied');
  protected readonly resolvedEmptyLabel = useI18nText(this.emptyLabel, 'copyValue.empty', '-');

  protected readonly text = computed(() => String(this.value() ?? ''));
  /** In `wrap` mode the text up to its last word and that word with any trailing space; else the whole text and nothing. */
  protected readonly parts = computed(() => {
    if (!this.wrap()) return { head: this.text(), tail: '' };
    const [, head = '', tail = ''] = /^([\s\S]*?)(\S*\s*)$/.exec(this.text()) ?? [];
    return { head, tail };
  });

  protected readonly empty = computed(() => this.text() === '');

  /** True for a moment after a successful copy. */
  protected readonly justCopied = signal(false);

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.wrap()) parts.push('wr-copy-value--wrap');
    if (this.empty()) parts.push('wr-copy-value--empty');
    if (this.justCopied()) parts.push('wr-copy-value--copied');
    return parts.join(' ');
  });

  private readonly clipboard = inject(WrClipboard);
  private destroyed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Copies the value, as a click on the button does. Resolves to whether the
   * text reached the clipboard; an empty value resolves to `false` and emits
   * nothing.
   */
  async copy(): Promise<boolean> {
    const text = this.text();
    if (text === '') return false;

    const written = await this.clipboard.write(text);
    // An output refuses to emit once its component is gone.
    if (this.destroyed) return written;

    if (!written) {
      this.copyFailed.emit();
      return false;
    }

    this.clearTimer();
    this.justCopied.set(true);
    this.timer = setTimeout(() => this.justCopied.set(false), WR_COPIED_DURATION);
    this.copied.emit(text);
    return true;
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { FocusMonitor, LiveAnnouncer } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, Injector, inject, input, output, signal } from '@angular/core';

import { WR_COPIED_DURATION } from 'ngwr/clipboard';
import { useI18nText } from 'ngwr/i18n';
import { WrPopover, wrUseTextTooltip } from 'ngwr/popover';
import { WrToast } from 'ngwr/toast';
import { wrRestoreFocus } from 'ngwr/utils';

/**
 * Copy `wrCopyToClipboard` to the system clipboard on host click.
 *
 * Uses `navigator.clipboard.writeText` when available, with a hidden
 * `<textarea>` + `document.execCommand('copy')` fallback for older browsers
 * and non-secure contexts.
 *
 * After a successful copy the host carries `wr-copy-to-clipboard--copied` for
 * a moment, a tooltip over it reads "Copied" and the same text is announced
 * politely. `wrCopyToClipboardToast` shows a toast instead of the tooltip and
 * the announcement. A refused write changes nothing and emits `copyFailed`.
 *
 * @example
 * ```html
 * <button [wrCopyToClipboard]="value">Copy</button>
 * <button [wrCopyToClipboard]="rows" wrCopyToClipboardToast copiedLabel="Copied to clipboard">Copy all</button>
 * ```
 */
@Directive({
  selector: '[wrCopyToClipboard]',
  exportAs: 'wrCopyToClipboard',
  host: { '[class.wr-copy-to-clipboard--copied]': 'justCopied()', '(click)': 'copy()' },
})
export class WrCopyToClipboard {
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clearTimer();
    });
  }

  /** The text to copy. */
  readonly wrCopyToClipboard = input.required<string>();

  /**
   * Confirm a copy with a toast instead of the tooltip and the announcement.
   *
   * @default false
   */
  readonly wrCopyToClipboardToast = input(false, { transform: coerceBooleanProperty });

  /** Text of the tooltip, the announcement and the toast. Falls back to `copyToClipboard.copied`, then `'Copied'`. */
  readonly copiedLabel = input<string | null>(null);

  /** Emitted with the copied text once the write succeeds. */
  readonly copied = output<string>();

  /** Emitted if the copy fails (denied permission, no clipboard, …). */
  readonly copyFailed = output<unknown>();

  /** True for a moment after a successful copy. */
  protected readonly justCopied = signal(false);

  private readonly resolvedCopiedLabel = useI18nText(this.copiedLabel, 'copyToClipboard.copied', 'Copied');

  private readonly focusMonitor = inject(FocusMonitor);
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly tooltip = wrUseTextTooltip();
  private readonly hostPopover = inject(WrPopover, { self: true, optional: true });
  private destroyed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Copies the bound text, as a click does: `(copied)` or `(copyFailed)` fires
   * either way. Resolves `true` once the text is on the clipboard and `false`
   * when neither path could write it. It never rejects.
   */
  async copy(): Promise<boolean> {
    const text = this.wrCopyToClipboard();
    const async = this.doc.defaultView?.navigator?.clipboard;

    try {
      if (async) {
        try {
          await async.writeText(text);
        } catch {
          // The legacy path is a RECOVERY from the async one, so it only runs
          // when there was an async attempt to recover from. Reached from the
          // fallback's own failure it just repeated the same refused write —
          // two selections and two focus jumps for one press.
          this.fallback(text);
        }
      } else {
        this.fallback(text);
      }
    } catch (error) {
      this.copyFailed.emit(error);
      return false;
    }

    // Outside the try because the try's job is the WRITE. The shape this
    // replaced emitted inside it and recovered by calling `fallback` again, so
    // one refused write became two selections, two focus jumps and two `copied`
    // emissions. (A consumer's own `(copied)` handler cannot reach this frame
    // either way: `OutputEmitterRef.emit` catches what a listener throws and
    // hands it to the `ErrorHandler`.)
    // An output refuses to emit once its directive is gone.
    if (this.destroyed) return true;
    this.confirm();
    this.copied.emit(text);
    return true;
  }

  private confirm(): void {
    const label = this.resolvedCopiedLabel();
    this.clearTimer();
    this.justCopied.set(true);

    if (this.wrCopyToClipboardToast()) {
      this.injector.get(WrToast).show({ type: 'success', message: label, showCopy: false });
    } else {
      // The host's own hover tooltip would sit under this one, in the same place.
      if (this.hostPopover?.mode() === 'tooltip') this.hostPopover.close();
      this.tooltip.show(label);
      void this.injector.get(LiveAnnouncer).announce(label, 'polite', WR_COPIED_DURATION);
    }

    this.timer = setTimeout(() => {
      this.justCopied.set(false);
      this.tooltip.hide();
    }, WR_COPIED_DURATION);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /**
   * Legacy clipboard write — hidden textarea + `execCommand('copy')`.
   *
   * Two things this has to get right beyond writing the text. `execCommand`
   * REPORTS refusal rather than throwing it: a document without focus hands back
   * `false` and copies nothing, so ignoring the return value shows a "Copied!"
   * toast over an unchanged clipboard. And selecting the textarea moves focus
   * into it, so removing the node afterwards drops focus on `<body>` — the user's
   * next Tab restarts from the top of the page, on every copy.
   */
  private fallback(text: string): void {
    const node = this.doc.createElement('textarea');
    node.value = text;
    node.setAttribute('readonly', '');
    node.style.position = 'fixed';
    node.style.top = '0';
    node.style.left = '0';
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';

    const previous = this.doc.activeElement;
    this.doc.body.appendChild(node);
    node.select();

    try {
      if (!this.doc.execCommand('copy')) throw new Error('The copy command was refused.');
    } finally {
      this.doc.body.removeChild(node);
      if (previous instanceof HTMLElement) wrRestoreFocus(previous, this.focusMonitor);
    }
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Directive, inject, input, output } from '@angular/core';

/**
 * Copy `wrCopyToClipboard` to the system clipboard on host click.
 *
 * Uses `navigator.clipboard.writeText` when available, with a hidden
 * `<textarea>` + `document.execCommand('copy')` fallback for older browsers
 * and non-secure contexts.
 *
 * @example
 * ```html
 * <button [wrCopyToClipboard]="value" (copied)="toast('Copied!')">Copy</button>
 * ```
 */
@Directive({ selector: '[wrCopyToClipboard]', host: { '(click)': 'onClick()' } })
export class WrCopyToClipboard {
  /** The text to copy. */
  readonly wrCopyToClipboard = input.required<string>();

  /** Emitted with the copied text once the write succeeds. */
  readonly copied = output<string>();

  /** Emitted if the copy fails (denied permission, no clipboard, …). */
  readonly copyFailed = output<unknown>();

  private readonly doc = inject(DOCUMENT);

  /** @internal */
  protected async onClick(): Promise<void> {
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
      return;
    }

    // Outside the try, and that is the point: a consumer's `(copied)` handler
    // that throws is their bug, not a clipboard failure. Inside, it was caught
    // here — which ran the fallback a second time and emitted `copied` twice.
    this.copied.emit(text);
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
      if (previous instanceof HTMLElement) previous.focus();
    }
  }
}

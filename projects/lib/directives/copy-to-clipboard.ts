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
    try {
      if (this.doc.defaultView?.navigator?.clipboard) {
        await this.doc.defaultView.navigator.clipboard.writeText(text);
      } else {
        this.fallback(text);
      }
      this.copied.emit(text);
    } catch (error) {
      try {
        this.fallback(text);
        this.copied.emit(text);
      } catch (fallbackError) {
        this.copyFailed.emit(fallbackError ?? error);
      }
    }
  }

  /** Legacy clipboard write — hidden textarea + execCommand('copy'). */
  private fallback(text: string): void {
    const node = this.doc.createElement('textarea');
    node.value = text;
    node.setAttribute('readonly', '');
    node.style.position = 'fixed';
    node.style.top = '0';
    node.style.left = '0';
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';
    this.doc.body.appendChild(node);
    node.select();
    try {
      this.doc.execCommand('copy');
    } finally {
      this.doc.body.removeChild(node);
    }
  }
}

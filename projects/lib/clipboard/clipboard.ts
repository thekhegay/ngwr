/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';

/** Outcome of a clipboard read or permission probe. */
export type WrClipboardPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Programmatic clipboard read / write.
 *
 * - **Write** uses `navigator.clipboard.writeText` with a hidden
 *   `<textarea>` + `execCommand('copy')` fallback for non-secure contexts.
 * - **Read** uses `navigator.clipboard.readText` (no fallback — older
 *   browsers expose no equivalent).
 * - **Available** / **permission** check what the current browser allows
 *   so UI can disable the action when it would silently no-op.
 *
 * SSR-safe: every method short-circuits when there's no `document.defaultView`.
 *
 * @example
 * ```ts
 * const clip = inject(WrClipboard);
 *
 * await clip.write('Hello');           // resolves to true on success
 * const text = await clip.read();      // string | null
 * clip.available();                    // boolean
 * await clip.permission('write');      // 'granted' | 'denied' | 'prompt' | 'unsupported'
 * ```
 *
 * @see https://ngwr.dev/services/clipboard
 */
@Service()
export class WrClipboard {
  private readonly doc = inject(DOCUMENT);

  /** Is any clipboard write path available (async API or `execCommand`)? */
  available(): boolean {
    const view = this.doc.defaultView;
    if (!view) return false;
    if (view.navigator?.clipboard) return true;
    return typeof this.doc.execCommand === 'function';
  }

  /**
   * Write text. Resolves to `true` on success, `false` on failure (denied
   * permission, no clipboard, etc).
   */
  async write(text: string): Promise<boolean> {
    const view = this.doc.defaultView;
    if (!view) return false;

    try {
      if (view.navigator?.clipboard) {
        await view.navigator.clipboard.writeText(text);
        return true;
      }
      return this.legacyWrite(text);
    } catch {
      return this.legacyWrite(text);
    }
  }

  /**
   * Read text from the clipboard. Returns `null` when unsupported or
   * when the user denied the permission prompt.
   */
  async read(): Promise<string | null> {
    const view = this.doc.defaultView;
    if (!view?.navigator?.clipboard?.readText) return null;
    try {
      return await view.navigator.clipboard.readText();
    } catch {
      return null;
    }
  }

  /** Probe the Permissions API for `clipboard-read` / `clipboard-write`. */
  async permission(name: 'read' | 'write'): Promise<WrClipboardPermission> {
    const view = this.doc.defaultView;
    if (!view?.navigator?.permissions?.query) return 'unsupported';
    try {
      const status = await view.navigator.permissions.query({
        name: `clipboard-${name}` as PermissionName,
      });
      return status.state;
    } catch {
      return 'unsupported';
    }
  }

  // Internals

  /** Hidden-textarea + `execCommand('copy')` write. Synchronous, no permissions. */
  private legacyWrite(text: string): boolean {
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
      return this.doc.execCommand('copy');
    } catch {
      return false;
    } finally {
      this.doc.body.removeChild(node);
    }
  }
}

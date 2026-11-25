/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, NgZone, inject, output } from '@angular/core';

type MouseDownHandler = (event: MouseEvent) => void;

interface Shared {
  readonly handlers: Set<MouseDownHandler>;
  readonly listener: MouseDownHandler;
}

const shared = new WeakMap<Document, Shared>();

/** One capture `mousedown` listener per document, however many directives watch it. */
function listenMouseDown(doc: Document, handler: MouseDownHandler): () => void {
  let entry = shared.get(doc);
  if (!entry) {
    const handlers = new Set<MouseDownHandler>();
    // A copy, since a handler may destroy a directive while the set is walked; one
    // removed that way is skipped, as the DOM skips a listener removed mid-dispatch.
    const listener: MouseDownHandler = event => {
      for (const h of [...handlers]) if (handlers.has(h)) h(event);
    };
    entry = { handlers, listener };
    shared.set(doc, entry);
    doc.addEventListener('mousedown', listener, true);
  }
  const { handlers, listener } = entry;
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
    if (handlers.size) return;
    shared.delete(doc);
    doc.removeEventListener('mousedown', listener, true);
  };
}

/**
 * Fires `(wrClickOutside)` when a pointer event lands outside the host
 * element. Useful for closing custom poppers / menus.
 *
 * @example
 * ```html
 * <div class="popup" (wrClickOutside)="close()"> … </div>
 * ```
 */
@Directive({ selector: '[wrClickOutside]' })
export class WrClickOutside {
  /**
   * Fires on a pointer press that landed outside the host element. Close a
   * menu or commit an inline edit with it; the event is the original click.
   */
  readonly wrClickOutside = output<MouseEvent>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Listen outside Angular to avoid CD on every page click; re-enter
    // only when the event lands outside the host.
    this.zone.runOutsideAngular(() => {
      const stop = listenMouseDown(this.doc, (event: MouseEvent): void => {
        const target = event.target as Node | null;
        if (target && !this.host.nativeElement.contains(target)) {
          this.zone.run(() => this.wrClickOutside.emit(event));
        }
      });
      this.destroyRef.onDestroy(stop);
    });
  }
}

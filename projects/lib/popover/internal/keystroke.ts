/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, Service, inject } from '@angular/core';

/** `FocusMonitor._setOrigin`'s own window — see the class docs for why it matches. */
const KEYSTROKE_WINDOW_MS = 1;

/**
 * The key of the keystroke being handled RIGHT NOW — `null` between them.
 *
 * `FocusMonitor` answers "the most recent input modality was a keyboard", which
 * is a weaker statement than "the user's own key put focus here", and the gap
 * between the two is exactly where a tooltip goes wrong. The origin is whatever
 * was pressed within the last millisecond (`_setOrigin` clears it on a 1ms
 * timer), and an overlay dismissed with Escape hands focus BACK to its trigger
 * synchronously, inside that same keystroke — CDK's keyboard dispatcher listens
 * on `<body>` in the bubble phase, the modality detector on `document` in
 * capture, so the modality is always already `keyboard` by the time the drawer
 * runs. Same for a ✕ activated with Enter. So the CDK reports `keyboard` for a
 * hand-back and a tooltip reading the origin alone still shows itself unbidden,
 * which is the whole failure it was meant to stop.
 *
 * The KEY separates them: `Tab` and the arrows are how a user moves focus,
 * `Escape` and `Enter` dismiss and activate. A focus that lands during one of
 * those was moved by a script.
 *
 * One passive capture listener for the whole app, constructed with the first
 * `[wrPopover]` and never before it — beside the three `InputModalityDetector`
 * already installs.
 *
 * The key expires on the CDK's own 1ms window rather than on a bare macrotask,
 * and matching it is the point: the key is only ever read to EXPLAIN a keyboard
 * origin, so it must not run out while the origin it explains is still live. A
 * `setTimeout(0)` close would land in exactly that gap — key already forgotten,
 * origin still `keyboard` — and read as a Tab. Everything a keystroke does
 * synchronously, its default action and the click Enter dispatches included,
 * happens long before either timer; anything that waits past them is judged
 * `program` by the CDK and never reaches this question.
 *
 * Popover-local on purpose; no other component in the catalog asks this yet.
 */
@Service()
export class WrCurrentKeystroke {
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private current: string | null = null;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  /** `KeyboardEvent.key` for the keystroke in flight, `null` outside one. */
  get key(): string | null {
    return this.current;
  }

  constructor() {
    if (!this.isBrowser) return;

    const record = (event: KeyboardEvent): void => {
      this.current = event.key;
      if (this.clearTimer) clearTimeout(this.clearTimer);
      this.clearTimer = setTimeout(() => (this.current = null), KEYSTROKE_WINDOW_MS);
    };

    // Capture, so the key is on record before any handler deeper in the tree
    // gets to move focus with it.
    this.doc.addEventListener('keydown', record, { capture: true, passive: true });
    this.destroyRef.onDestroy(() => {
      if (this.clearTimer) clearTimeout(this.clearTimer);
      this.doc.removeEventListener('keydown', record, { capture: true });
    });
  }
}

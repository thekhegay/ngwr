/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { FocusTrap } from '@angular/cdk/a11y';
import { type Injector, afterNextRender } from '@angular/core';

const INITIAL = '[cdkFocusInitial], [cdk-focus-initial]';

/**
 * Moves focus into a freshly opened modal overlay the way its `autoFocus`
 * option asks. An element marked `cdkFocusInitial` wins in every mode.
 *
 * `'first-tabbable'` is the focus trap's own initial focus. `'dialog'` focuses
 * the panel (made programmatically focusable with `tabindex="-1"`), `false`
 * leaves focus where it is. Both wait for the next render, because the content
 * is not in the DOM before that.
 *
 * @internal
 */
export function wrFocusOverlay(host: HTMLElement, trap: FocusTrap, mode: WrOverlayAutoFocus, injector: Injector): void {
  if (mode === 'first-tabbable') {
    void trap.focusInitialElementWhenReady();
    return;
  }
  if (mode === 'dialog') host.setAttribute('tabindex', '-1');
  afterNextRender(
    () => {
      if (!host.isConnected) return;
      if (host.querySelector(INITIAL)) trap.focusInitialElement();
      else if (mode === 'dialog') host.focus({ preventScroll: true });
    },
    { injector }
  );
}

/** What a dialog or drawer does with focus when it opens. */
export type WrOverlayAutoFocus = 'first-tabbable' | 'dialog' | false;

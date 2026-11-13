/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service } from '@angular/core';

interface Layer {
  readonly host: HTMLElement;
  readonly coversToasts: boolean;
}

/**
 * Move a popover host to the end of the top layer. Both calls run in one
 * task, so no frame shows it hidden. A host that is not a popover (jsdom,
 * `usePopover: false`) has no place in the top layer to change.
 */
function reshow(host: Element): void {
  if (!host.isConnected || !host.hasAttribute('popover')) return;
  try {
    (host as HTMLElement).hidePopover();
    (host as HTMLElement).showPopover();
  } catch {
    // `hidePopover` throws on a host that is not showing: nothing to move.
  }
}

/**
 * Keeps the global toast host under the overlays opened with
 * `toasts: 'below'`, and above every other one.
 *
 * The top layer is ordered by the moment of promotion and by nothing else, so
 * the only way to put the toast host under an overlay is to promote that
 * overlay again after it. The toast host therefore belongs right under the
 * trailing run of covering overlays: the ones opened after the last overlay
 * that wants toasts above it. A covering overlay under such an overlay cannot
 * be moved over the toasts without also moving over the modal above it, so the
 * newer overlay's rule wins until it closes.
 *
 * @internal
 */
@Service()
export class WrOverlayOrder {
  /** Open overlays in the order they were promoted. */
  private readonly layers: Layer[] = [];
  private toasts: HTMLElement | null = null;
  /** How many of `layers` sit under the toast host. */
  private under = 0;
  /** Something may have joined the top layer since the toast host was last raised. */
  private stale = true;
  private placing = false;

  // Neither event bubbles out of a shadow tree, so a popover shown inside one
  // goes unseen until an overlay joins the container.
  private readonly onBeforeToggle = (event: Event): void => {
    if (this.placing || event.target === this.toasts) return;
    if ((event as ToggleEvent).newState === 'open') this.stale = true;
  };
  private readonly onFullscreenChange = (): void => {
    this.stale = true;
  };

  /**
   * Register an overlay right after it is attached, which is when the CDK
   * promotes it. Returns the function that takes it off the list.
   */
  add(host: HTMLElement, toasts: 'above' | 'below' = 'above'): () => void {
    const layer: Layer = { host, coversToasts: toasts === 'below' };
    this.layers.push(layer);
    this.stale = true;
    return () => {
      const at = this.layers.indexOf(layer);
      if (at < 0) return;
      this.layers.splice(at, 1);
      if (at < this.under) this.under--;
      // The overlay that goes may have been the one deciding for those under it.
      this.place(false);
    };
  }

  /**
   * Put the toast host on top, then every overlay that covers toasts over it.
   * Returns whether anything had to move.
   */
  raiseToasts(host: HTMLElement): boolean {
    if (host !== this.toasts) {
      this.dropToasts();
      this.toasts = host;
      this.under = this.layers.length;
      this.stale = true;
      // `beforetoggle` does not bubble, so it is caught on the way down.
      host.ownerDocument.addEventListener('beforetoggle', this.onBeforeToggle, true);
      host.ownerDocument.addEventListener('fullscreenchange', this.onFullscreenChange);
    }
    return this.place(true);
  }

  /** An overlay that is not on the list was promoted. */
  joined(): void {
    this.stale = true;
  }

  dropToasts(): void {
    const doc = this.toasts?.ownerDocument;
    doc?.removeEventListener('beforetoggle', this.onBeforeToggle, true);
    doc?.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.toasts = null;
  }

  /**
   * @param raise with no covering overlay open, raise the host even where the
   * list says it is on top, if a popover this list does not know may have joined.
   */
  private place(raise: boolean): boolean {
    const toasts = this.toasts;
    if (!toasts) return false;

    let start = this.layers.length;
    while (start > 0 && this.layers[start - 1].coversToasts) start--;
    const covering = this.layers.slice(start);
    // Already right under the covering overlays: moving anything would only
    // put the toasts over them for the length of this call.
    if (this.under === start && (covering.length > 0 || !raise || !this.stale)) return false;

    const doc = toasts.ownerDocument;
    const focused = doc.activeElement as HTMLElement | null;

    this.placing = true;
    reshow(toasts);
    this.under = start;
    this.stale = false;

    if (covering.length > 0) {
      // Whatever was attached after the first covering overlay sits above it
      // (a select panel inside the dialog), and has to stay there. Hosts are
      // appended on attach, so the siblings after it are those, in order.
      const above = new Set<Element>();
      for (let el: Element | null = covering[0].host; el; el = el.nextElementSibling) above.add(el);
      for (const layer of covering) above.add(layer.host);
      above.delete(toasts);
      above.forEach(reshow);
    }
    this.placing = false;

    // Showing a popover runs its focusing steps, which move focus to an
    // `autofocus` descendant.
    if (focused?.isConnected && doc.activeElement !== focused) focused.focus({ preventScroll: true });
    return true;
  }
}

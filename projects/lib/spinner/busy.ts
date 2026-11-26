/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ApplicationRef,
  type ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  Injector,
  Renderer2,
  afterRenderEffect,
  createComponent,
  inject,
  input,
  untracked,
} from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { WrSpinner } from './spinner';

/**
 * Busy overlay for a container: a veil with a spinner over the host while the
 * content under it stays visible and out of reach.
 *
 * While on, the host carries `aria-busy="true"` and every element child of it
 * is `inert`. The host itself is not: an inert element leaves the accessibility
 * tree with everything in it, the spinner's status region included. A child
 * that is already `inert` is left as it is, on and off.
 *
 * The veil fills the host, so a host with `position: static` gets
 * `position: relative` through the `wr-busy--relative` class.
 *
 * @example
 * ```html
 * <form [wrBusy]="saving()">…</form>
 * ```
 *
 * @see https://ngwr.dev/reference/components/spinner
 */
@Directive({
  selector: '[wrBusy]',
  host: { class: 'wr-busy' },
})
export class WrBusy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /**
   * Whether the host is busy.
   *
   * @default false
   */
  readonly wrBusy = input(false, { transform: coerceBooleanProperty });

  /**
   * Accessible name of the spinner. Falls back to `spinner.label`, then
   * `'Loading'`.
   *
   * @default null
   */
  readonly wrBusyLabel = input<string | null>(null);

  private veil: HTMLElement | null = null;
  private spinner: ComponentRef<WrSpinner> | null = null;
  private observer: MutationObserver | null = null;
  private readonly blocked = new Set<Element>();

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('spinner');

    afterRenderEffect(() => {
      const busy = this.wrBusy();
      const label = this.wrBusyLabel();
      untracked(() => {
        if (!busy) return this.release();
        this.block();
        this.spinner!.setInput('ariaLabel', label);
        this.spinner!.changeDetectorRef.detectChanges();
      });
    });

    inject(DestroyRef).onDestroy(() => this.release());
  }

  private block(): void {
    if (this.veil) return;
    const { host, renderer } = this;

    if (getComputedStyle(host).position === 'static') renderer.addClass(host, 'wr-busy--relative');
    renderer.setAttribute(host, 'aria-busy', 'true');
    for (const child of Array.from(host.children)) this.blockChild(child);

    const veil = renderer.createElement('div') as HTMLElement;
    renderer.addClass(veil, 'wr-busy__veil');
    const spinnerHost = renderer.createElement('wr-spinner') as HTMLElement;
    renderer.appendChild(veil, spinnerHost);
    this.spinner = createComponent(WrSpinner, {
      environmentInjector: this.environmentInjector,
      elementInjector: this.injector,
      hostElement: spinnerHost,
    });
    this.spinner.setInput('size', 'lg');
    this.appRef.attachView(this.spinner.hostView);
    renderer.appendChild(host, veil);
    this.veil = veil;

    // Content rendered while busy is blocked too.
    this.observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof Element && node.parentElement === host) this.blockChild(node);
        }
      }
    });
    this.observer.observe(host, { childList: true });
  }

  private blockChild(child: Element): void {
    if (child === this.veil || child.hasAttribute('inert')) return;
    this.renderer.setAttribute(child, 'inert', '');
    this.blocked.add(child);
  }

  private release(): void {
    if (!this.veil) return;
    const { host, renderer } = this;

    this.observer?.disconnect();
    this.observer = null;
    for (const child of this.blocked) renderer.removeAttribute(child, 'inert');
    this.blocked.clear();

    this.spinner?.destroy();
    this.spinner = null;
    this.veil.remove();
    this.veil = null;

    renderer.removeAttribute(host, 'aria-busy');
    renderer.removeClass(host, 'wr-busy--relative');
  }
}

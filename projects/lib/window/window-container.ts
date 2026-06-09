/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ComponentType } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';

import type { WrWindowConfig } from './types';
import { WrWindow } from './window';
import type { WrWindowRef } from './window-ref';

/**
 * Internal host attached by `WrWindowManager.open()`. Reads the config,
 * configures a `<wr-window>`, projects the consumer's component into
 * its body, and wires the resulting instance back to the `WrWindowRef`
 * so consumers can drive everything imperatively.
 *
 * @internal
 */
@Component({
  selector: 'wr-window-container',
  templateUrl: './window-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrWindow],
})
export class WrWindowContainer<C> {
  /** Set by the manager before view init. */
  config!: WrWindowConfig;
  /** Set by the manager before view init. */
  ref!: WrWindowRef<C, unknown>;
  /** Set by the manager before view init. */
  componentType!: ComponentType<C>;
  /** Custom injector with `WR_WINDOW_REF` / `WR_WINDOW_DATA` populated. */
  childInjector!: Injector;

  private readonly hostInjector = inject(Injector);

  @ViewChild('content', { read: ViewContainerRef, static: true })
  private readonly contentVcr!: ViewContainerRef;

  @ViewChild(WrWindow, { static: true })
  private readonly wrWindow!: WrWindow;

  constructor() {
    afterNextRender(() => this.attach());
  }

  private attach(): void {
    // 1. Create the consumer's component inside the body slot.
    const componentRef = this.contentVcr.createComponent(this.componentType, {
      injector: this.childInjector,
    });
    this.ref.componentRef = componentRef;

    // 2. Bridge imperative actions to the underlying <wr-window>.
    const w = this.wrWindow;
    this.ref._doMinimize = () => w.minimize();
    this.ref._doMaximize = () => w.maximize();
    this.ref._doRestore = () => w.restore();
    this.ref._doFocus = () => w.focus();
    this.ref._doMoveTo = (x, y) => w.moveTo(x, y);
    this.ref._doResizeTo = (width, height) => w.resizeTo(width, height);
    this.ref._doCenter = () => w.center();
    this.ref._doSetTitle = (title) => this.ref._title.set(title);

    // 3. Sync the live geometry/state into the ref's signals so
    //    consumers can read them reactively without poking at <wr-window>.
    runInInjectionContext(this.hostInjector, () => {
      effect(() => this.ref._state.set(w.state()));
      effect(() => this.ref._x.set(w.x()));
      effect(() => this.ref._y.set(w.y()));
      effect(() => this.ref._width.set(w.width()));
      effect(() => this.ref._height.set(w.height()));
      effect(() => this.ref._z.set(w.z()));
    });

    // 4. Seed the title signal from config.
    this.ref._title.set(this.config.title ?? '');
  }
}

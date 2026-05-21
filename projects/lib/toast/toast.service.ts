/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { type ComponentRef, Injectable, inject } from '@angular/core';

import { WrToastHostComponent } from './toast-host.component';
import { WrToastRef } from './toast-ref';
import type { WrToastConfig, WrToastPosition } from './types';

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION: WrToastPosition = 'top-end';

type ActiveEntry = WrToastConfig & { readonly id: number; timer?: ReturnType<typeof setTimeout> };

/**
 * Opens toast notifications in a single shared overlay.
 *
 * @example
 * ```ts
 * const toast = inject(WrToastService);
 *
 * toast.show({ type: 'success', title: 'Saved', message: 'Profile updated.' });
 * toast.show({ type: 'danger', message: 'Network error', duration: 0 });
 * ```
 *
 * @see https://ngwr.dev/docs/components/toast
 */
@Injectable({ providedIn: 'root' })
export class WrToastService {
  private readonly overlay = inject(Overlay);

  private overlayRef: OverlayRef | null = null;
  private hostRef: ComponentRef<WrToastHostComponent> | null = null;
  private position: WrToastPosition = DEFAULT_POSITION;
  private nextId = 1;
  private active: ActiveEntry[] = [];

  /** Change the corner toasts open in. */
  setPosition(position: WrToastPosition): void {
    this.position = position;
    if (this.hostRef) this.hostRef.setInput('position', position);
  }

  show(config: WrToastConfig): WrToastRef {
    this.ensureHost();

    const entry: ActiveEntry = { ...config, id: this.nextId++ };
    this.active = [...this.active, entry];
    this.pushToHost();

    const duration = config.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      entry.timer = setTimeout(() => this.dismiss(entry.id), duration);
    }

    return new WrToastRef(entry.id, config, id => this.dismiss(id));
  }

  dismiss(id: number): void {
    const entry = this.active.find(t => t.id === id);
    if (entry?.timer) clearTimeout(entry.timer);
    this.active = this.active.filter(t => t.id !== id);
    this.pushToHost();

    if (this.active.length === 0) this.disposeHost();
  }

  dismissAll(): void {
    for (const entry of this.active) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this.active = [];
    this.disposeHost();
  }

  private ensureHost(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      hasBackdrop: false,
      panelClass: ['wr-toast-overlay'],
    });

    const portal = new ComponentPortal(WrToastHostComponent);
    this.hostRef = this.overlayRef.attach(portal);
    this.hostRef.setInput('position', this.position);
    this.hostRef.instance.dismissed.subscribe(id => this.dismiss(id));
  }

  private pushToHost(): void {
    this.hostRef?.instance.toasts.set([...this.active]);
  }

  private disposeHost(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.hostRef = null;
    }
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Dialog, type DialogConfig, type DialogRef } from '@angular/cdk/dialog';
import type { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';

import { WrDialogRef } from './dialog-ref';
import type { WrDialogOptions } from './types';

const DEFAULT_PANEL_CLASS = 'wr-dialog-panel';
const DEFAULT_BACKDROP_CLASS = 'wr-dialog-backdrop';

/**
 * Opens dialog components in a CDK overlay.
 *
 * Wraps `@angular/cdk/dialog`'s `Dialog` service with NGWR styling
 * defaults and a slim, signal-friendly handle (`WrDialogRef`).
 *
 * @example
 * ```ts
 * const dialog = inject(WrDialogService);
 *
 * const ref = dialog.open(ConfirmComponent, {
 *   data: { message: 'Delete this item?' },
 *   width: '24rem',
 * });
 *
 * const ok = await ref.awaitClose();
 * if (ok) remove();
 * ```
 *
 * @see https://ngwr.dev/docs/components/dialog
 */
@Injectable({ providedIn: 'root' })
export class WrDialogService {
  private readonly cdk = inject(Dialog);

  open<C, R = unknown, D = unknown>(component: ComponentType<C>, options: WrDialogOptions<D> = {}): WrDialogRef<C, R> {
    const panelClasses: string[] = [DEFAULT_PANEL_CLASS];
    const extra = options.panelClass;
    if (typeof extra === 'string') {
      panelClasses.push(extra);
    } else if (extra) {
      for (const cls of extra) panelClasses.push(cls);
    }

    // Type the config with the same DialogRef shape CDK expects so it lines
    // up with the open<R, D, C> overload.
    const config: DialogConfig<D, DialogRef<R, C>> = {
      data: options.data,
      hasBackdrop: true,
      // CDK's `disableClose` blocks both backdrop and escape — only set it
      // when the caller has explicitly opted out of both. The granular
      // behavior is wired up below.
      disableClose: options.closeOnBackdropClick === false && options.closeOnEscape === false,
      backdropClass: DEFAULT_BACKDROP_CLASS,
      panelClass: panelClasses,
      width: options.width,
      maxWidth: options.maxWidth,
      closeOnOverlayDetachments: true,
    };

    const ref = this.cdk.open<R, D, C>(component, config);

    if (options.closeOnBackdropClick !== false) {
      ref.backdropClick.subscribe(() => ref.close());
    }
    if (options.closeOnEscape !== false) {
      ref.keydownEvents.subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          ref.close();
        }
      });
    }

    return new WrDialogRef<C, R>(ref);
  }
}

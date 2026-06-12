/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model, output } from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';

import type { WrSpeedDialAction, WrSpeedDialDirection } from './interfaces';

/**
 * Floating action button that expands into a fan of secondary actions on
 * click / hover. Place inside a positioned container or near `position: fixed`
 * — the component itself doesn't pin to the viewport.
 *
 * @example
 * ```html
 * <wr-speed-dial
 *   [actions]="[
 *     { id: 'new', label: 'New', icon: 'add' },
 *     { id: 'edit', label: 'Edit', icon: 'cog' }
 *   ]"
 *   (pick)="onPick($event)"
 * />
 * ```
 *
 * @see https://ngwr.dev/components/speed-dial
 */
@Component({
  selector: 'wr-speed-dial',
  templateUrl: './speed-dial.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon],
})
export class WrSpeedDial {
  readonly actions = input<readonly WrSpeedDialAction[]>([]);

  /** Direction the actions fan out. @default 'up' */
  readonly direction = input<WrSpeedDialDirection>('up');

  /** Two-way bindable open state. @default false */
  readonly open = model(false);

  /** Icon for the main trigger button. @default 'add' */
  readonly icon = input<WrIconName>('add');

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Fires when the user picks one of the actions. */
  readonly pick = output<WrSpeedDialAction>();

  protected readonly classes = computed(() => {
    const parts = ['wr-speed-dial', `wr-speed-dial--${this.direction()}`];
    if (this.open()) parts.push('wr-speed-dial--open');
    if (this.disabled()) parts.push('wr-speed-dial--disabled');
    return parts.join(' ');
  });

  protected onTrigger(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
  }

  protected onPick(action: WrSpeedDialAction): void {
    if (this.disabled()) return;
    this.pick.emit(action);
    this.open.set(false);
  }
}

export type { WrSpeedDialAction, WrSpeedDialDirection } from './interfaces';

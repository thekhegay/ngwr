/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input, model, output } from '@angular/core';

import { WrDrawer, WrDrawerTitle } from 'ngwr/drawer';
import { WrIcon } from 'ngwr/icon';
import { WrHaptics } from 'ngwr/platform';

import type { WrActionSheetAction } from './interfaces';

/**
 * iOS-style action sheet — a bottom sheet offering a short list of choices.
 * A thin preset over {@link WrDrawer} (bottom position, rounded, grab handle,
 * safe-area padding), driven by data rather than projected content.
 *
 * Pass `actions`; picking one emits `action` and closes the sheet. Rows with
 * `role: 'destructive'` are painted in the danger colour, and `role: 'cancel'`
 * rows drop to a separate group at the bottom. Dismissing via the backdrop,
 * `Escape`, or a swipe-down closes without emitting. Picking fires a light
 * {@link WrHaptics} tick.
 *
 * @example
 * ```html
 * <wr-action-sheet
 *   [(open)]="sheetOpen"
 *   title="Photo"
 *   [actions]="[
 *     { label: 'Take Photo', icon: 'camera', value: 'camera' },
 *     { label: 'Choose from Library', icon: 'image', value: 'library' },
 *     { label: 'Delete', role: 'destructive', value: 'delete' },
 *     { label: 'Cancel', role: 'cancel' },
 *   ]"
 *   (action)="onPick($event)"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/action-sheet
 */
@Component({
  selector: 'wr-action-sheet',
  templateUrl: './action-sheet.html',
  encapsulation: ViewEncapsulation.None,
  imports: [WrDrawer, WrDrawerTitle, WrIcon],
})
export class WrActionSheet {
  private readonly haptics = inject(WrHaptics);

  /** Whether the sheet is open. Two-way. @default false */
  readonly open = model<boolean>(false);

  /** The rows to offer. */
  readonly actions = input<readonly WrActionSheetAction[]>([]);

  /** Optional bold heading above the rows. */
  readonly title = input<string>('');

  /** Optional muted sub-heading under the title. */
  readonly message = input<string>('');

  /** Fires with the chosen row (never fires on a dismiss). */
  readonly action = output<WrActionSheetAction>();

  protected readonly mainActions = computed(() => this.actions().filter(a => a.role !== 'cancel'));
  protected readonly cancelActions = computed(() => this.actions().filter(a => a.role === 'cancel'));

  protected select(item: WrActionSheetAction): void {
    if (item.disabled) return;
    this.haptics.selection();
    this.action.emit(item);
    this.open.set(false);
  }
}

/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  type ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
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
 * @see https://ngwr.dev/reference/components/speed-dial
 */
let menuUid = 0;

@Component({
  selector: 'wr-speed-dial',
  templateUrl: './speed-dial.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', '(keydown)': 'onKeydown($event)' },
  imports: [WrIcon],
})
export class WrSpeedDial {
  readonly actions = input<readonly WrSpeedDialAction[]>([]);

  /**
   * Accessible name of the trigger. Falls back to `speedDial.label`, then
   * `'Actions'` — the trigger is icon-only, so without this it has no name at all.
   */
  readonly triggerLabel = input<string | null>(null);

  protected readonly resolvedTriggerLabel = useI18nText(this.triggerLabel, 'speedDial.label', 'Actions');

  /** Direction the actions fan out. @default 'up' */
  readonly direction = input<WrSpeedDialDirection>('up');

  /** Two-way bindable open state. @default false */
  readonly open = model(false);

  /** Icon for the main trigger button. @default 'add' */
  readonly icon = input<WrIconName>('add');

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Pad the host toward the dial `direction` with `env(safe-area-inset-*)`.
   * Only matters when the consumer pins the dial to that edge of the
   * viewport; otherwise it has no effect. @default false
   */
  readonly safeArea = input(false, { transform: coerceBooleanProperty });

  /** Fires when the user picks one of the actions. */
  readonly pick = output<WrSpeedDialAction>();

  /** Id the trigger's `aria-controls` points at. */
  protected readonly menuId = `wr-speed-dial-menu-${++menuUid}`;

  protected readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  constructor() {
    // A disabled trigger cannot be pressed, and the trigger is the only way to close
    // the dial — so being disabled while open left it fanned out with no way back.
    effect(() => {
      if (this.disabled() && this.open()) this.open.set(false);
    });
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-speed-dial', `wr-speed-dial--${this.direction()}`];
    if (this.open()) parts.push('wr-speed-dial--open');
    if (this.disabled()) parts.push('wr-speed-dial--disabled');
    if (this.safeArea()) parts.push('wr-speed-dial--safe-area');
    return parts.join(' ');
  });

  protected onTrigger(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
  }

  protected onPick(action: WrSpeedDialAction): void {
    if (this.disabled()) return;
    this.open.set(false);
    this.pick.emit(action);
  }

  /**
   * `role="menu"` promises a way out, and the actions are ordinary buttons in the tab
   * order — without this a keyboard user who opened the dial had to tab through every
   * action to leave it.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.open()) return;
    event.preventDefault();
    this.open.set(false);
    this.triggerEl()?.nativeElement.focus();
  }

  /**
   * First GLYPH of the label, for an action with no icon. `charAt(0)` returns one
   * UTF-16 code unit, which cuts an astral character (an emoji) in half and renders a
   * replacement character.
   */
  protected initial(label: string): string {
    return [...label][0] ?? '';
  }
}

export type { WrSpeedDialAction, WrSpeedDialDirection } from './interfaces';

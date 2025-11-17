/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { provideWrIcons, close, WrIconComponent } from 'ngwr/icon';

import { WrAlertType } from './alert-type';

/**
 * NGWR alert component.
 *
 * Displays a short piece of feedback or status message.
 *
 * @example
 * ```html
 * <wr-alert
 *   [title]="'Profile updated'"
 *   [message]="'Your changes have been saved.'"
 *   type="success"
 *   [closeable]="true"
 *   (closed)="onAlertClosed()"
 * ></wr-alert>
 * ```
 *
 * @see WrAlertType
 * @see http://ngwr.dev/docs/components/alert
 *
 * @publicApi
 */
@Component({
  standalone: true,
  selector: 'wr-alert',
  templateUrl: './alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrIconComponent],
  providers: [provideWrIcons([close])],
})
export class WrAlertComponent {
  /**
   * Alert title.
   * This input is required.
   */
  readonly title = input.required<string>();

  /**
   * Visual type of the alert.
   *
   * - `'info'`    – default / primary look
   * - `'success'` – success state
   * - `'warning'` – warning state
   * - `'danger'`  – error / critical state
   *
   * @default 'info'
   */
  readonly type = input<WrAlertType>('info');

  /**
   * Optional message displayed below the title.
   * When `null`, the message block is not rendered.
   *
   * @default null
   */
  readonly message = input<string | null>(null);

  /**
   * When `true`, renders a close button that allows the user to dismiss the alert.
   *
   * @default false
   */
  readonly closeable = input(false, { transform: booleanAttribute });

  /**
   * Emitted when the user closes the alert.
   * Useful for parent components to remove the alert from a list.
   *
   * @remarks
   * This output is triggered only when the user actively closes the alert
   * (for example, by clicking the close button).
   */
  readonly closed = output<void>();

  /**
   * Internal signal that tracks whether the alert has been closed.
   *
   * @internal
   */
  protected readonly isClosed = signal(false);

  /**
   * Host CSS classes.
   *
   * Always includes the base `wr-alert` class
   * and a single modifier based on the current alert type, e.g.:
   *
   * - `wr-alert--info`
   * - `wr-alert--success`
   * - `wr-alert--warning`
   * - `wr-alert--danger`
   */
  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    const baseClass = `wr-alert`;
    const type = this.type();

    return {
      [baseClass]: true,
      [`${baseClass}--${type}`]: true,
    };
  }

  /**
   * ARIA role for screen readers.
   * `status` announces changes politely without interrupting the user.
   * You may switch to `'alert'` for more aggressive announcements.
   */
  @HostBinding('attr.role')
  get role(): string | null {
    return this.isClosed() ? null : 'status';
  }

  /**
   * Controls how updates are announced by assistive technologies.
   * `'polite'` means the update is announced when the user is idle.
   */
  @HostBinding('attr.aria-live')
  get ariaLive(): string | null {
    return this.isClosed() ? null : 'polite';
  }

  /**
   * Handles the close action: hides the alert and emits the {@link closed} event.
   */
  protected onClose(): void {
    this.isClosed.set(true);
    this.closed.emit();
  }
}

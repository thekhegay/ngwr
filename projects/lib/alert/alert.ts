/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';

import type { WrAlertType } from './interfaces';

/**
 * Inline status banner. Use for feedback messages — saved/failed/notice etc.
 *
 * @example
 * ```html
 * <wr-alert title="Saved" message="Your changes are live." type="success" />
 * <wr-alert title="Failed" type="danger" closeable (closed)="onClose()" />
 * ```
 *
 * @see https://ngwr.dev/components/alert
 */
@Component({
  selector: 'wr-alert',
  templateUrl: './alert.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'liveRole()',
    '[attr.aria-live]': 'liveLevel()',
  },
})
export class WrAlert {
  /** Required headline shown at the top of the alert. */
  readonly title = input.required<string>();

  /**
   * Visual variant.
   *
   * @default 'info'
   */
  readonly type = input<WrAlertType>('info');

  /**
   * Optional secondary message rendered below the title.
   *
   * @default null
   */
  readonly message = input<string | null>(null);

  /**
   * When `true`, renders a leading status icon matching the `type`
   * (info / success / warning / danger). Pass `false` to hide.
   *
   * @default true
   */
  readonly icon = input(true, { transform: coerceBooleanProperty });

  /**
   * When `true`, renders a close button.
   *
   * @default false
   */
  readonly closeable = input(false, { transform: coerceBooleanProperty });

  /**
   * Emitted when the user dismisses the alert via the close button.
   */
  readonly closed = output<void>();

  protected readonly dismissed = signal(false);

  protected readonly classes = computed(() => {
    const parts = ['wr-alert', `wr-alert--${this.type()}`];
    if (this.dismissed()) parts.push('wr-alert--dismissed');
    return parts.join(' ');
  });

  /** Escalate role/aria-live for danger/warning alerts. */
  protected readonly liveRole = computed(() =>
    this.dismissed() ? null : this.type() === 'danger' ? 'alert' : 'status'
  );
  protected readonly liveLevel = computed(() =>
    this.dismissed() ? null : this.type() === 'danger' || this.type() === 'warning' ? 'assertive' : 'polite'
  );

  protected onClose(): void {
    this.dismissed.set(true);
    this.closed.emit();
  }
}

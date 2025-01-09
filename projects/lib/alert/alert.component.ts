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
  Input,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';
import { provideWrIcons, close, WrIconModule } from 'ngwr/icon';

import { WrAlertType } from './alert-type';

/**
 * NGWR alert component.
 * Closeable component for feedback.
 *
 * {@tutorial} [How to use wr-alert]{@link http://ngwr.dev/docs/components/alert}
 */
@Component({
    selector: 'wr-alert',
    templateUrl: './alert.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [WrIconModule],
    providers: [provideWrIcons([close])]
})
export class WrAlertComponent {
  @Input({ required: true }) title!: string;
  @Input() message?: string;
  @Input() type: WrAlertType = 'info';
  @Input({ transform: booleanAttribute }) closeable = false;

  protected readonly isClosed = signal(false);

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-alert': true,
      'wr-alert--success': this.type === 'success',
      'wr-alert--warning': this.type === 'warning',
      'wr-alert--danger': this.type === 'danger',
    };
  }

  onClose(): void {
    this.isClosed.set(true);
  }
}

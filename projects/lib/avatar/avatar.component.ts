/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgOptimizedImage } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  inject,
  Input,
  numberAttribute,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';
import { WrSpinnerComponent } from 'ngwr/spinner';

@Component({
  selector: 'wr-avatar',
  templateUrl: './avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgOptimizedImage, WrSpinnerComponent],
})
export class WrAvatarComponent {
  readonly cdr = inject(ChangeDetectorRef);
  readonly elRef = inject(ElementRef);
  readonly remSize: number = 16;

  readonly isImgLoaded = signal(false);

  private calcRemToPx(): number {
    const nativeElement = this.elRef?.nativeElement as HTMLElement;
    const style = nativeElement?.ownerDocument?.documentElement;
    const fontSize = getComputedStyle(style)?.fontSize;
    return Number(fontSize) || 16;
  }

  constructor() {
    this.remSize = this.calcRemToPx();
  }

  @Input({ required: true }) url!: string;
  @Input({ required: true }) alt!: string;
  @Input({ transform: booleanAttribute }) rounded = false;

  /**
   * Width and height in rem
   * @example size="6" transforms to 6 * remSize (16 by default)
   */
  @Input({ transform: numberAttribute })
  get size(): number {
    return this._size;
  }
  set size(value: number | string) {
    this._size = Number(value) * this.remSize;
    this.cdr.markForCheck();
  }
  private _size: number = 6 * this.remSize;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-avatar': true,
      'wr-avatar--rounded': this.rounded,
      'wr-avatar--loaded': this.isImgLoaded(),
    };
  }

  @HostBinding('style')
  get elStyles(): SafeAny {
    return {
      width: `${this.size}px`,
      height: `${this.size}px`,
    };
  }
}

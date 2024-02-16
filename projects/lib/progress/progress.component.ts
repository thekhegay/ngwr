import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  Input,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny } from 'ngwr/core/types';
import { isThemeColor, WrThemeColor } from 'ngwr/core/color';

@Component({
  selector: 'wr-progress',
  exportAs: 'wrProgress',
  templateUrl: 'progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
})
export class WrProgress {
  /**
   * Set color of `wr-divider`
   *
   * @default 'primary';
   */
  @Input()
  get color(): WrThemeColor {
    return this._color;
  }
  set color(value: WrThemeColor) {
    this._color = isThemeColor(value) ? value : 'primary';
    this.cdr.markForCheck();
  }
  private _color: WrThemeColor = 'primary';

  /**
   * Set percent of progress
   *
   * @default 0';
   */
  @Input()
  get percent(): number {
    return this._percent;
  }
  set percent(value: number) {
    this._percent = value;
    this.cdr.markForCheck();
  }
  private _percent: number = 0;

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-progress': true,
      'wr-progress--color-primary': this.color === 'primary',
      'wr-progress--color-secondary': this.color === 'secondary',
      'wr-progress--color-success': this.color === 'success',
      'wr-progress--color-warning': this.color === 'warning',
      'wr-progress--color-danger': this.color === 'danger',
      'wr-progress--color-light': this.color === 'light',
      'wr-progress--color-medium': this.color === 'medium',
      'wr-progress--color-dark': this.color === 'dark',
    };
  }

  constructor(private readonly cdr: ChangeDetectorRef) {}
}

import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { isThemeColor, WrThemeColor } from 'ngwr/core/color';
import { SafeAny } from 'ngwr/core/types';

@Component({
  selector: 'wr-divider',
  exportAs: 'wrDivider',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrDivider {
  /**
   * Set color of `wr-divider`
   *
   * @default 'light';
   */
  @Input()
  get color(): WrThemeColor {
    return this._color;
  }
  set color(value: WrThemeColor) {
    this._color = isThemeColor(value) ? value : 'primary';
  }
  private _color: WrThemeColor = 'light';
  /**
   * Set style of `wr-divider`
   *
   * @default `solid`;
   */
  @Input()
  get type(): 'solid' | 'dashed' | 'dotted' {
    return this._type;
  }
  set type(value: 'solid' | 'dashed' | 'dotted') {
    this._type = value;
  }
  private _type: 'solid' | 'dashed' | 'dotted' = 'solid';
  /**
   * Set width of `wr-divider`
   *
   * @default 1px;
   */
  @Input()
  get width(): string {
    return this._width;
  }
  set width(value: string) {
    this._width = value;
  }
  private _width: string = '1px';

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-divider': true,
      'wr-divider--primary': this.color === 'primary',
      'wr-divider--secondary': this.color === 'secondary',
      'wr-divider--success': this.color === 'success',
      'wr-divider--warning': this.color === 'warning',
      'wr-divider--danger': this.color === 'danger',
      'wr-divider--light': this.color === 'light',
      'wr-divider--medium': this.color === 'medium',
      'wr-divider--dark': this.color === 'dark',
      'wr-divider--solid': this.type === 'solid',
      'wr-divider--dashed': this.type === 'dashed',
      'wr-divider--dotted': this.type === 'dotted',
    };
  }

  /** Set element style **/
  @HostBinding('style')
  get elStyles(): SafeAny {
    return {
      '--wr-divider-width': this.width,
    };
  }

  /** Set element role **/
  @HostBinding('role') role = 'separator';
}

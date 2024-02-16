import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  Input,
  ViewEncapsulation,
} from '@angular/core';

import { isThemeColor, WrThemeColor } from 'ngwr/core/color';
import { SafeAny } from 'ngwr/core/types';
import { WrIconModule, wrIconName } from 'ngwr/icon';
import { NgIf } from '@angular/common';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { InputBoolean } from 'ngwr/core/decorators';

@Component({
  selector: 'wr-alert[title]',
  exportAs: 'wrAlert',
  templateUrl: 'alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgIf, WrIconModule],
})
export class WrAlert {
  isClosed: boolean = false;

  @Input()
  get title(): string {
    return this._title;
  }
  set title(value: string) {
    this._title = value;
    this.cdr.markForCheck();
  }
  private _title: string = '';

  @Input()
  get message(): string | undefined {
    return this._message;
  }
  set message(value: string) {
    this._message = value;
    this.cdr.markForCheck();
  }
  private _message: string | undefined = undefined;

  /** Set rounded state of `wr-btn`; */
  @Input()
  @InputBoolean()
  get closeable(): boolean {
    return this._closeable;
  }
  set closeable(value: BooleanInput) {
    this._closeable = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _closeable: boolean = false;

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

  /** Set icon of `wr-btn`; */
  @Input()
  get icon(): wrIconName | null {
    return this._icon;
  }
  set icon(value: wrIconName | null) {
    this._icon = value;
    this.cdr.markForCheck();
  }
  private _icon: wrIconName | null = null;

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-alert': true,
      'wr-alert--color-primary': this.color === 'primary',
      'wr-alert--color-secondary': this.color === 'secondary',
      'wr-alert--color-success': this.color === 'success',
      'wr-alert--color-warning': this.color === 'warning',
      'wr-alert--color-danger': this.color === 'danger',
      'wr-alert--color-light': this.color === 'light',
      'wr-alert--color-medium': this.color === 'medium',
      'wr-alert--color-dark': this.color === 'dark',
    };
  }

  constructor(private readonly cdr: ChangeDetectorRef) {}

  onClose(): void {
    this.isClosed = true;
  }
}

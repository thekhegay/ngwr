import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { isThemeColor, WrThemeColor } from 'ngwr/core/color';
import { InputBoolean } from 'ngwr/core/decorators';
import { SafeAny } from 'ngwr/core/types';
import { WrIconModule, wrIconName } from 'ngwr/icon';
import { WrSpinnerModule } from 'ngwr/spinner';

@Component({
  selector: 'wr-btn, button[wr-btn], a[wr-btn]',
  exportAs: 'wrBtn',
  templateUrl: 'button.template.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [WrIconModule, WrSpinnerModule],
})
export class WrButton extends WrAbstractBase implements OnInit, OnDestroy {
  /** Set color of `wr-btn`; */
  @Input()
  get color(): WrThemeColor {
    return this._color;
  }
  set color(value: WrThemeColor) {
    this._color = isThemeColor(value) ? value : 'primary';
    this.cdr.markForCheck();
  }
  private _color: WrThemeColor = 'primary';

  /** Set size of `wr-btn`; */
  @Input()
  get size(): 'default' | 'small' {
    return this._size;
  }
  set size(value: 'default' | 'small') {
    this._size = value;
    this.cdr.markForCheck();
  }
  private _size: 'default' | 'small' = 'default';

  /** Set outlined state of `wr-btn`; */
  @Input()
  @InputBoolean()
  get outlined(): boolean {
    return this._outlined;
  }
  set outlined(value: BooleanInput) {
    this._outlined = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _outlined: boolean = false;

  /** Set rounded state of `wr-btn`; */
  @Input()
  @InputBoolean()
  get rounded(): boolean {
    return this._rounded;
  }
  set rounded(value: BooleanInput) {
    this._rounded = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _rounded: boolean = false;

  /** Set fullwidth state of `wr-btn`; */
  @Input()
  @InputBoolean()
  get fullWidth(): boolean {
    return this._fullWidth;
  }
  set fullWidth(value: BooleanInput) {
    this._fullWidth = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }

  /**
   * @deprecated use fullWidth instead
   */
  @Input()
  @InputBoolean()
  get fullwidth(): boolean {
    return this._fullWidth;
  }
  set fullwidth(value: BooleanInput) {
    this._fullWidth = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }

  private _fullWidth: boolean = false;

  /** Set loading state of `wr-btn`; */
  @Input()
  @InputBoolean()
  get loading(): boolean {
    return this._loading;
  }
  set loading(value: BooleanInput) {
    this._loading = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _loading: boolean = false;

  /** Set disabled state of `wr-btn`; */
  @Input()
  @InputBoolean()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _disabled: boolean = false;

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

  /** Set icon position of `wr-btn`; */
  @Input()
  get iconPosition(): 'start' | 'end' {
    return this._iconPosition;
  }
  set iconPosition(value: 'start' | 'end') {
    this._iconPosition = value;
    this.cdr.markForCheck();
  }
  private _iconPosition: 'start' | 'end' = 'start';

  /** Set element disabled attribute */
  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    return this._disabled ? '' : null;
  }

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-btn': true,
      'wr-btn--color-primary': this.color === 'primary',
      'wr-btn--color-secondary': this.color === 'secondary',
      'wr-btn--color-success': this.color === 'success',
      'wr-btn--color-warning': this.color === 'warning',
      'wr-btn--color-danger': this.color === 'danger',
      'wr-btn--color-light': this.color === 'light',
      'wr-btn--color-medium': this.color === 'medium',
      'wr-btn--color-dark': this.color === 'dark',
      'wr-btn--size-small': this.size === 'small',
      'wr-btn--rounded': this.rounded,
      'wr-btn--icon-start': this.icon && this.iconPosition === 'start',
      'wr-btn--icon-end': this.icon && this.iconPosition === 'end',
      'wr-btn--outlined': this.outlined,
      'wr-btn--loading': this.loading,
      'wr-btn--full-width': this.fullWidth,
    };
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef<HTMLButtonElement | HTMLLinkElement | HTMLAnchorElement | HTMLElement>,
    private readonly ngZone: NgZone
  ) {
    super();
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.elRef.nativeElement.addEventListener('click', this.preventEventsWhenDisabled);
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.elRef.nativeElement.removeEventListener('click', this.preventEventsWhenDisabled);
  }

  /* A disabled button shouldn't apply any actions */
  private preventEventsWhenDisabled = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
}

import { A11yModule, FocusMonitor, FocusOrigin } from '@angular/cdk/a11y';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { InputBoolean } from 'ngwr/core/decorators';
import { SafeAny } from 'ngwr/core/types';

@Component({
  selector: 'wr-checkbox',
  exportAs: 'wrCheckbox',
  templateUrl: 'checkbox.template.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CommonModule, FormsModule, A11yModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WrCheckbox),
      multi: true,
    },
  ],
})
export class WrCheckbox extends WrAbstractBase implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy {
  @ViewChild('inputElement', { static: true }) inputElement!: HTMLInputElement;

  get checked(): boolean {
    return this._checked;
  }
  set checked(value: BooleanInput) {
    const checked = coerceBooleanProperty(value);

    if (checked != this.checked) {
      this._checked = checked;
      this.onChange(checked);
      this.onTouched();
      this.cdr.markForCheck();
    }
  }
  private _checked: boolean = false;

  /** Set autofocus for checkbox; */
  @Input()
  @InputBoolean()
  get autofocus(): boolean {
    return this._autofocus;
  }
  set autofocus(value: BooleanInput) {
    this._autofocus = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _autofocus: boolean = false;

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

  get focused(): boolean {
    return this._focused;
  }
  set focused(value: BooleanInput) {
    this._focused = coerceBooleanProperty(value);
    this.cdr.markForCheck();
  }
  private _focused: boolean = false;

  private onChange: SafeAny = (): void => {};
  private onTouched: SafeAny = (): void => {};

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-checkbox': true,
      'wr-checkbox--checked': this.checked,
      'wr-checkbox--focused': this.focused,
    };
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef<HTMLElement | HTMLInputElement>,
    private readonly focusMonitor: FocusMonitor,
    private readonly ngZone: NgZone
  ) {
    super();
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.elRef.nativeElement.addEventListener('click', this.preventEventsWhenDisabled);
    });
  }

  ngAfterViewInit(): void {
    this.focusMonitor.monitor(this.inputElement, true).subscribe(origin => {
      this.ngZone.run(() => (this.focused = origin !== null));
    });

    if (this.autofocus) {
      this.focus();
      this.cdr.markForCheck();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.elRef.nativeElement.removeEventListener('click', this.preventEventsWhenDisabled);
    this.focusMonitor.stopMonitoring(this.inputElement);
  }

  focus(origin: FocusOrigin = 'program', options?: FocusOptions): void {
    if (origin) {
      this.focusMonitor.focusVia(this.inputElement, origin, options);
    } else {
      this.inputElement.focus(options);
    }
  }

  writeValue(value: BooleanInput): void {
    this.checked = value;
  }

  registerOnChange(fn: SafeAny): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: SafeAny): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**
   * A disabled checkbox shouldn't apply any actions
   *
   * @param event
   */
  private preventEventsWhenDisabled = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
}

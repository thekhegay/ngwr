import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
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
  ViewEncapsulation
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  BaseComponent,
  BooleanInput,
  InputBoolean,
  OnChangeType,
  OnTouchedType,
  SafeAny,
  WrInputAutocomplete,
  WrInputModeType,
  WrInputType
} from '../_core';

@Component({
  selector: 'wr-input',
  exportAs: 'wrInput',
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WrInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => WrInputComponent),
      multi: true
    }
  ]
})
export class WrInputComponent
  extends BaseComponent
  implements ControlValueAccessor, AfterViewInit, OnInit, OnDestroy, Validator
{
  @Input() placeholder: string = '';
  @Input() prefix: string | null = null;
  @Input() suffix: string | null = null;
  @Input() @InputBoolean() passwordIcons: BooleanInput = false;

  @Input()
  get type(): WrInputType {
    return this._type;
  }
  set type(type: WrInputType) {
    this._type = type;
  }
  @Input()
  get inputmode(): WrInputModeType {
    return this._mode;
  }
  set inputmode(mode: WrInputModeType) {
    this._mode = mode;
  }
  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(disabled: BooleanInput) {
    this._disabled = coerceBooleanProperty(disabled);
  }
  @Input()
  get readonly(): boolean {
    return this._readonly;
  }
  set readonly(readonly: BooleanInput) {
    this._readonly = coerceBooleanProperty(readonly);
  }
  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(required: BooleanInput) {
    this._required = coerceBooleanProperty(required);
  }
  @Input()
  get autofocus(): boolean {
    return this._autofocus;
  }
  set autofocus(autofocus: BooleanInput) {
    this._autofocus = coerceBooleanProperty(autofocus);
  }
  @Input()
  get autocomplete(): WrInputAutocomplete {
    return this._autocomplete;
  }
  set autocomplete(autofocus: WrInputAutocomplete) {
    this._autocomplete = autofocus;
  }
  @Input()
  get value(): string | number {
    return this.type === 'number' ? this.valueAsNumber : this._value;
  }
  set value(val: string | number) {
    if (val !== this._value) {
      this._value = val;
      this.onChangeCallback(this.value);
    }
  }
  get valueAsString(): string {
    if (this._value == null || typeof this._value === 'undefined') return '';
    return String(this._value);
  }
  get valueAsNumber(): number {
    return coerceNumberProperty(this._value);
  }

  get isBadInput(): boolean {
    const validity = this.inputElement?.nativeElement?.validity;
    return validity && validity.badInput;
  }

  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-input': true,
      'wr-input--has-prefix': this.prefix,
      'wr-input--has-suffix': this.suffix,
      'wr-input--password': this.passwordIcons,
      'wr-input--disabled': this.disabled
    };
  }

  eyeOn = true;
  private _value: string | number = '';
  private _disabled: boolean = false;
  private _readonly: boolean = false;
  private _required: boolean = false;
  private _autofocus: boolean = false;
  private _focused: boolean = false;
  private _autocomplete: WrInputAutocomplete = 'off';
  private _type: WrInputType = 'text';
  private _mode: WrInputModeType = 'text';
  private onChangeCallback: OnChangeType = () => {};
  private onTouchedCallback: OnTouchedType = () => {};

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef<HTMLInputElement>,
    private readonly focusMonitor: FocusMonitor,
    private readonly ngZone: NgZone
  ) {
    super();
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      fromEvent<MouseEvent>(this.elRef.nativeElement, 'click')
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(event => {
          event.preventDefault();
          this.onFocus();
          if (this.disabled) {
            event.stopImmediatePropagation();
            return;
          }
        });
      fromEvent(this.inputElement.nativeElement, 'click')
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(event => event.stopPropagation());
    });
  }

  ngAfterViewInit(): void {
    if (this.autofocus) {
      this.onFocus();
      this.cdr.markForCheck();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.focusMonitor.stopMonitoring(this.elRef);
  }

  onFocus(event?: FocusEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this._focused = true;
    this.focusMonitor.focusVia(this.inputElement, 'keyboard');
  }

  onBlur(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this._focused = false;
    // this.inputElement.nativeElement.blur();
    this.onTouchedCallback();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return {
      ...(this.isBadInput ? { badInput: true } : null)
    };
  }

  writeValue(value: string): void {
    if (value !== this._value) {
      this._value = value;
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: OnChangeType): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: OnTouchedType): void {
    this.onTouchedCallback = fn;
  }

  onPasswordVisibilityChange(): void {
    this.type === 'password' ? (this.type = 'text') : (this.type = 'password');
    this.eyeOn = !this.eyeOn;
    this.onFocus();
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = coerceBooleanProperty(isDisabled);
  }
}

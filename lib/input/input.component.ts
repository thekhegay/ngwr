import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef,
  forwardRef, HostBinding, Input, NgZone, OnDestroy,
  OnInit, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { BaseComponent, BooleanInput, InputBoolean, OnChangeType, OnTouchedType, SafeAny } from '../_core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FocusMonitor } from '@angular/cdk/a11y';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
    }
  ]
})
export class WrInputComponent extends BaseComponent implements ControlValueAccessor, AfterViewInit, OnInit, OnDestroy {
  @Input() value: string | null = null;
  @Input() type: 'text' | 'number' | 'password' | 'email' = 'text';
  @Input() autocomplete: 'on' | 'off' = 'on';
  @Input() inputmode: 'text' | 'numeric' | 'tel' | 'email' | 'url' = 'text';
  @Input() @InputBoolean() disabled: BooleanInput = false;
  @Input() @InputBoolean() readonly: BooleanInput = false;
  @Input() @InputBoolean() autofocus: BooleanInput = false;
  @Input() @InputBoolean() passwordIcons: BooleanInput = false;
  @Input() placeholder: string | undefined = undefined;
  @Input() prefix: string | null = null;
  @Input() suffix: string | null = null;

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

  onChange: OnChangeType = () => {};
  onTouch: OnTouchedType = () => {};

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
          this.focus();
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
      this.focus();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.focusMonitor.stopMonitoring(this.elRef);
  }

  writeValue(value: string | null): void {
    this.value = value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: OnChangeType): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: OnTouchedType): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  focus(): void {
    this.focusMonitor.focusVia(this.inputElement, 'keyboard');
  }

  blur(): void {
    this.inputElement.nativeElement.blur();
  }

  onPasswordVisibilityChange(event: Event): void {
    event.stopPropagation();
    this.type === 'password' ? (this.type = 'text') : (this.type = 'password');
    this.eyeOn = !this.eyeOn;
  }

  onModelChange(value: string | null): void {
    if (!this.disabled) {
      this.value = value;
      this.onChange(this.value);
    }
  }
}

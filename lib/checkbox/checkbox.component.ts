import { FocusMonitor } from '@angular/cdk/a11y';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BaseComponent, BooleanInput, InputBoolean, OnChangeType, OnTouchedType, stylePrefix } from '../_core';

@Component({
  selector: 'wr-checkbox',
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WrCheckboxComponent),
      multi: true
    }
  ]
})
export class WrCheckboxComponent
  extends BaseComponent
  implements ControlValueAccessor, AfterViewInit, OnInit, OnDestroy
{
  onChange: OnChangeType = () => {};
  onTouch: OnTouchedType = () => {};

  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;
  @Input() @InputBoolean() checked: BooleanInput = false;
  @Input() @InputBoolean() disabled: boolean = false;
  @Input() @InputBoolean() autoFocus: BooleanInput = false;

  @Output() readonly checkedChange = new EventEmitter<boolean>();

  @HostBinding('class') class = `${stylePrefix}-checkbox`;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef<HTMLElement>,
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
          this.ngZone.run(() => {
            this.onModelChange(!this.checked);
            this.cdr.markForCheck();
          });
        });
      fromEvent(this.inputElement.nativeElement, 'click')
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(event => event.stopPropagation());
    });
  }

  ngAfterViewInit(): void {
    if (this.autoFocus) {
      this.focus();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.focusMonitor.stopMonitoring(this.elRef);
  }

  writeValue(value: boolean): void {
    this.checked = value;
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

  onModelChange(checked: boolean): void {
    if (!this.disabled) {
      this.checked = checked;
      this.onChange(this.checked);
      this.checkedChange.emit(this.checked);
    }
  }
}

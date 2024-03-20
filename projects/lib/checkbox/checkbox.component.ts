import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/types';

import { noop } from 'rxjs';

@Component({
  standalone: true,
  selector: 'wr-checkbox',
  templateUrl: 'checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WrCheckboxComponent),
      multi: true,
    },
  ],
})
export class WrCheckboxComponent extends WrAbstractBase implements ControlValueAccessor, OnInit {
  @Input({ required: true }) formControlName!: string;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-checkbox': true,
      'wr-checkbox--checked': this.formControl.value,
    };
  }

  readonly formControl: FormControl = new FormControl();
  onChange: (value: boolean) => void = noop;
  onTouched: () => void = noop;

  ngOnInit(): void {
    this.formControl.valueChanges.pipe(takeUntilDestroyed(this.destroyed$)).subscribe(value => this.onChange(value));
  }

  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(checked: boolean): void {
    this.formControl.patchValue(checked, { emitEvent: false });
  }

  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) {
      this.formControl.disable();
    } else {
      this.formControl.enable();
    }
  }
}

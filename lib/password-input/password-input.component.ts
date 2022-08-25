import { Component, HostBinding, Optional, Self, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { SafeAny, stylePrefix } from '../_core';

@Component({
  selector: 'wr-password-input',
  templateUrl: './password-input.component.html',
  encapsulation: ViewEncapsulation.None
})
export class WrPasswordInputComponent implements ControlValueAccessor {
  @HostBinding('class') class = `${stylePrefix}-password-input`;

  public type: 'input' | 'password' = 'password';
  public disabled: boolean = false;
  public value: string | null = null;
  public touched = false;

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (ngControl !== null) {
      ngControl.valueAccessor = this;
    }
  }

  onVisibilityClick($event: SafeAny): void {
    $event.stopPropagation();
    this.type === 'password' ? (this.type = 'input') : (this.type = 'password');
  }

  onInput($event: SafeAny): void {
    this.value = $event.currentTarget.value;
    this.touched = true;
    this.onChange(this.value);
  }

  onChange = (value: SafeAny): void => {};

  onTouched = (): void => {};

  onFocusOut(): void {
    this.touched = true;
    this.onTouched();
  }

  registerOnChange(fn: SafeAny): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: SafeAny): void {
    this.onTouched = fn;
  }

  writeValue(obj: SafeAny): void {
    this.value = obj;
  }
}
